// Serves the benchmark routes with either the bundled library (`linz`) or the bare router it is
// built on (`router`), so the difference is what Linz adds: validation, serialization and errors.
// Run by `bench/run.mjs` in a child process, it reports its port to the parent once listening.
import * as http from "node:http";

import { z } from "zod";

import { createApi, endpoint, Router } from "./.build/index.mjs";

const user = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(z.string()),
});

const note = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
});

function createLinzApp() {
  const app = new Router();

  createApi(app, {
    "get:/hello": endpoint({
      operationId: "getHello",
      responses: { 200: z.object({ message: z.string() }) },
      handler: async () => ({ message: "Hello, world!" }),
    }),
    "get:/users/:id": endpoint({
      operationId: "getUser",
      parameters: {
        path: z.object({ id: z.string() }),
        query: z.object({ fields: z.string().optional() }),
      },
      responses: { 200: user },
      handler: async ({ params, queries }) => ({
        id: params.id,
        name: "Ada",
        fields: queries.fields?.split(",") ?? [],
      }),
    }),
    "post:/notes": endpoint({
      operationId: "createNote",
      requestBody: z.object({
        title: z.string().min(1),
        tags: z.array(z.string()).default([]),
      }),
      responses: { 201: note },
      handler: async ({ body }) => ({ id: "1", ...body }),
    }),
  });

  return app;
}

function createRouterApp() {
  const app = new Router();

  const sendJson = (res, status, body) => {
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  };

  app.get("/hello", (_req, res) => sendJson(res, 200, { message: "Hello, world!" }));
  app.get("/users/:id", (req, res) => {
    const fields = new URLSearchParams(req.url.split("?")[1]).get("fields");
    sendJson(res, 200, { id: req.params.id, name: "Ada", fields: fields?.split(",") ?? [] });
  });
  app.post("/notes", (req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString());
      sendJson(res, 201, { id: "1", title: body.title, tags: body.tags ?? [] });
    });
  });

  return app;
}

const apps = { linz: createLinzApp, router: createRouterApp };

const createApp = apps[process.argv[2]];
if (!createApp) {
  throw new Error(`Unknown server "${process.argv[2]}", expected one of: ${Object.keys(apps)}`);
}

const server = http.createServer(createApp().handler());
server.listen(0, "127.0.0.1", () => process.send({ port: server.address().port }));
process.on("disconnect", () => process.exit());
