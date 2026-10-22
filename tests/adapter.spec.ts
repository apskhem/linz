import * as http from "http";
import type { AddressInfo } from "net";
import { Readable } from "stream";

import { z } from "zod";

import {
  ApiError,
  buildJson,
  createApi,
  type CreateApiConfig,
  endpoint,
  FormDataBody,
  HttpResponse,
  type LinzEndpoint,
  type LinzEndpointGroup,
  Router,
  notFoundHandler,
  Security,
  TextBody,
  UrlEncodedBody,
} from "../src";

function createSecurity(name: string, token: string, user: string) {
  return new Security({
    name,
    schema: { type: "http", scheme: "bearer" },
    handler: async (req, _scopes, extensions) => {
      // mutates before failing to verify that a failed attempt does not leak into the handler
      extensions["attemptedBy"] = name;
      if (req.headers.authorization !== `Bearer ${token}`) {
        throw new ApiError(401, { detail: `${name} rejected` });
      }
      extensions["user"] = user;
    },
  });
}

const primary = createSecurity("primary", "primary-token", "alice");
const secondary = createSecurity("secondary", "secondary-token", "bob");

const endpoints: LinzEndpointGroup = {
  "post:/secure": endpoint({
    operationId: "postSecure",
    security: [primary.apply([]), secondary.apply([])],
    requestBody: z.object({ value: z.string() }),
    responses: { 201: z.object({ extensions: z.record(z.string(), z.any()) }) },
    handler: async (_, { extensions }) => ({ extensions }),
  }),
  "post:/tags": endpoint({
    operationId: "postTags",
    requestBody: new UrlEncodedBody(z.object({ tag: z.array(z.string()) })),
    responses: { 201: z.object({ tag: z.array(z.string()) }) },
    handler: async ({ body }) => ({ tag: body.tag }),
  }),
  "get:/boom": endpoint({
    operationId: "getBoom",
    responses: { 200: z.object({}) },
    handler: async () => {
      throw new Error("connection string: postgres://admin:secret@db");
    },
  }),
  "get:/stream/node": endpoint({
    operationId: "getStreamNode",
    responses: { 200: new TextBody() },
    handler: async () => new HttpResponse({ body: Readable.from(["node ", "stream"]) }),
  }),
  "get:/stream/web": endpoint({
    operationId: "getStreamWeb",
    responses: { 200: new TextBody() },
    handler: async () => new HttpResponse({ body: new Blob(["web stream"]).stream() }),
  }),
  "get:/stream/broken": endpoint({
    operationId: "getStreamBroken",
    responses: { 200: new TextBody() },
    handler: async () =>
      new HttpResponse({
        body: new Readable({
          read() {
            this.push("partial");
            this.destroy(new Error("disk failure"));
          },
        }),
      }),
  }),
  "post:/only-ok": endpoint({
    operationId: "postOnlyOk",
    responses: { 200: z.object({ ok: z.boolean() }) },
    handler: async () => ({ ok: true }),
  }),
  "post:/ok-or-created": endpoint({
    operationId: "postOkOrCreated",
    responses: { 200: z.object({}), 201: z.object({ created: z.boolean() }) },
    handler: async () => ({ created: true }),
  }),
  "post:/echo-text": endpoint({
    operationId: "postEchoText",
    requestBody: new TextBody(),
    responses: { 201: new TextBody() },
    handler: async ({ body }) => body,
  }),
  "get:/form": endpoint({
    operationId: "getForm",
    responses: { 200: new FormDataBody(z.object({ name: z.string() })) },
    handler: async () => ({ name: "linz" }),
  }),
};

async function startServer(config?: Partial<CreateApiConfig>) {
  const app = new Router();
  createApi(app, endpoints, config);

  const server = http.createServer(app.handler());
  await new Promise<void>((resolve) => server.listen(0, resolve));

  return {
    server,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
}

describe(createApi.name, () => {
  let server: http.Server;
  let url: string;
  const logger = { error: jest.fn(), info: jest.fn() };

  beforeEach(() => logger.error.mockClear());

  beforeAll(async () => {
    ({ server, url } = await startServer({
      logger,
      request: { multiValueUrlEncoded: true },
      docs: {
        viewer: "scalar",
        spec: buildJson({
          openapi: "3.1.0",
          info: { title: "Linz Test API", version: "1.0.0" },
          paths: endpoints,
        }),
        docsPath: "/docs",
        specPath: "/openapi.json",
      },
    }));
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  describe("security", () => {
    const postSecure = (authorization: string | null, body = '{"value":"x"}') =>
      fetch(`${url}/secure`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authorization && { authorization }),
        },
        body,
      });

    it("should authenticate before parsing the request body", async () => {
      const res = await postSecure(null, "{ invalid json");

      expect(res.status).toBe(401);
    });

    it("should pass when any one of the securities passes", async () => {
      const res = await postSecure("Bearer secondary-token");

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        extensions: { attemptedBy: "secondary", user: "bob" },
      });
    });

    it("should stop at the first passing security", async () => {
      const res = await postSecure("Bearer primary-token");

      expect(await res.json()).toEqual({
        extensions: { attemptedBy: "primary", user: "alice" },
      });
    });

    it("should respond with the first failure when none passes", async () => {
      const res = await postSecure("Bearer wrong");

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ errors: [{ detail: "primary rejected" }] });
    });
  });

  it("should apply the request config to body parsing", async () => {
    const res = await fetch(`${url}/tags`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "tag=a&tag=b",
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ tag: ["a", "b"] });
  });

  it("should hide unexpected error details from clients and log the stack", async () => {
    const res = await fetch(`${url}/boom`);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ errors: [{ detail: "Internal server error" }] });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("postgres://admin:secret"));
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/\n\s+at /));
  });

  describe("streaming", () => {
    it("should stream a Node readable with the response content type", async () => {
      const res = await fetch(`${url}/stream/node`);

      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(await res.text()).toBe("node stream");
    });

    it("should stream a web ReadableStream", async () => {
      expect(await (await fetch(`${url}/stream/web`)).text()).toBe("web stream");
    });

    it("should abort the response and log when the stream fails", async () => {
      await expect(fetch(`${url}/stream/broken`).then((res) => res.text())).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("disk failure"));

      // the server keeps serving afterwards
      expect((await fetch(`${url}/stream/node`)).status).toBe(200);
    });
  });

  describe("default status", () => {
    it("should use the only defined success status of a post", async () => {
      const res = await fetch(`${url}/only-ok`, { method: "POST" });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("should prefer 201 for a post when it is defined", async () => {
      const res = await fetch(`${url}/ok-or-created`, { method: "POST" });

      expect(res.status).toBe(201);
    });
  });

  describe("request body", () => {
    it("should accept a text body", async () => {
      const res = await fetch(`${url}/echo-text`, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "hello",
      });

      expect(res.status).toBe(201);
      expect(await res.text()).toBe("hello");
    });

    it("should reject a content type other than the declared one", async () => {
      const res = await fetch(`${url}/tags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"tag":["a"]}',
      });

      expect(res.status).toBe(415);
      expect(await res.json()).toEqual({
        errors: [
          {
            detail:
              "'application/json' content type is not supported, expected 'application/x-www-form-urlencoded'",
          },
        ],
      });
    });

    it("should ignore the body of an endpoint that does not declare one", async () => {
      const res = await fetch(`${url}/only-ok`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ invalid json",
      });

      expect(res.status).toBe(200);
    });
  });

  it("should respond with a valid multipart body", async () => {
    const form = await (await fetch(`${url}/form`)).formData();

    expect(form.get("name")).toBe("linz");
  });

  it("should serve the docs page from the inlined template", async () => {
    const res = await fetch(`${url}/docs`);
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain("<title>Linz Test API</title>");
    expect(html).toContain('data-url="/openapi.json"');
  });

  it("should respond 404 even when the host header is malformed", async () => {
    const { port } = server.address() as AddressInfo;
    const res = await new Promise<{ status?: number; body: string }>((resolve, reject) => {
      http
        .get({ port, path: "/missing?x=1", headers: { host: "bad host:abc" } }, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ ...(res.statusCode && { status: res.statusCode }), body }));
        })
        .on("error", reject);
    });

    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ errors: [{ detail: "Cannot find GET /missing" }] });
  });
});

describe("not found handling", () => {
  const ping = (operationId: string): LinzEndpoint =>
    endpoint({
      operationId,
      responses: { 200: z.object({ from: z.string() }) },
      handler: async () => ({ from: operationId }),
    });

  async function withServer(app: Router, run: (url: string) => Promise<void>) {
    const server = http.createServer(app.handler());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    try {
      await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  it("should keep routes registered after createApi reachable when disabled", async () => {
    const app = new Router();
    createApi(app, { "get:/a": ping("getA") }, { notFound: false });
    createApi(app, { "get:/b": ping("getB") });

    await withServer(app, async (url) => {
      expect(await (await fetch(`${url}/a`)).json()).toEqual({ from: "getA" });
      expect(await (await fetch(`${url}/b`)).json()).toEqual({ from: "getB" });
      expect((await fetch(`${url}/missing`)).status).toBe(404);
    });
  });

  it("should let the handler be mounted manually after other routes", async () => {
    const fallbackHandler = jest.fn(async () => {});
    const app = new Router();
    createApi(app, { "get:/a": ping("getA") }, { notFound: false });
    app.get("/extra", (_: http.IncomingMessage, res: http.ServerResponse) => {
      res.writeHead(200).end("extra");
    });
    app.use(notFoundHandler({ fallbackHandler }));

    await withServer(app, async (url) => {
      expect(await (await fetch(`${url}/extra`)).text()).toBe("extra");
      expect((await fetch(`${url}/missing`)).status).toBe(404);
      expect(fallbackHandler).toHaveBeenCalledTimes(1);
    });
  });
});
