// A small notes API built on the bundled library, the way a consumer would use it.
// Run on its own with `node e2e/server.mjs` (after `npm run test:e2e` built it) to explore manually.
import * as http from "node:http";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import {
  ApiError,
  buildJson,
  createApi,
  endpoint,
  FormDataBody,
  HttpResponse,
  Router,
  Security,
  TextBody,
  UrlEncodedBody,
} from "./.build/index.mjs";

const unauthorized = (detail) => new ApiError(401, { status: "401", detail });

const bearer = new Security({
  name: "bearer",
  schema: { type: "http", scheme: "bearer" },
  handler: async (req, _scopes, extensions) => {
    if (req.headers.authorization !== "Bearer secret-token") {
      throw unauthorized("A valid bearer token is required");
    }
    extensions.user = "alice";
  },
});

const apiKey = new Security({
  name: "apiKey",
  schema: { type: "apiKey", in: "header", name: "x-api-key" },
  handler: async (req, _scopes, extensions) => {
    if (req.headers["x-api-key"] !== "key-123") {
      throw unauthorized("A valid API key is required");
    }
    extensions.user = "service";
  },
});

const note = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  content: z.string(),
  author: z.string(),
});

const notesTag = { name: "notes", description: "Notes" };
const auth = [bearer.apply([]), apiKey.apply([])];

function createEndpoints() {
  const notes = new Map();
  let nextId = 1;

  const findNote = (id) => {
    const found = notes.get(id);
    if (!found) {
      throw new ApiError(404, { status: "404", detail: `Note ${id} not found` });
    }
    return found;
  };

  const addNote = (title, tags, author) => {
    const created = { id: String(nextId++), title, tags, content: "", author };
    notes.set(created.id, created);
    return created;
  };

  return {
    "get:/health": endpoint({
      operationId: "getHealth",
      responses: { 200: z.object({ status: z.literal("ok") }) },
      handler: async () => ({ status: "ok" }),
    }),
    "get:/notes": endpoint({
      operationId: "listNotes",
      tags: [notesTag],
      parameters: { query: z.object({ tag: z.array(z.string()).optional() }) },
      responses: { 200: z.object({ items: z.array(note) }) },
      handler: async ({ queries }) => ({
        items: [...notes.values()].filter(
          (n) => !queries.tag || queries.tag.every((t) => n.tags.includes(t))
        ),
      }),
    }),
    "post:/notes": endpoint({
      operationId: "createNote",
      tags: [notesTag],
      security: auth,
      parameters: { header: z.object({ "X-Request-Id": z.string().optional() }) },
      requestBody: z.object({
        title: z.string().min(1),
        tags: z.array(z.string()).default([]),
      }),
      responses: { 201: note },
      handler: async ({ body, headers }, { extensions }) => {
        const created = addNote(body.title, body.tags, extensions.user);
        return new HttpResponse({
          body: created,
          headers: { ...(headers["X-Request-Id"] && { "x-request-id": headers["X-Request-Id"] }) },
        });
      },
    }),
    "post:/notes/import": endpoint({
      operationId: "importNotes",
      tags: [notesTag],
      security: auth,
      requestBody: new UrlEncodedBody(z.object({ title: z.array(z.string()) })),
      responses: { 201: z.object({ created: z.array(note) }) },
      handler: async ({ body }, { extensions }) => ({
        created: body.title.map((title) => addNote(title, ["imported"], extensions.user)),
      }),
    }),
    // registered before `/notes/:id`, which would match it otherwise
    "get:/notes/export": endpoint({
      operationId: "exportNotes",
      tags: [notesTag],
      responses: { 200: new TextBody() },
      handler: async () =>
        new HttpResponse({
          body: Readable.from([...notes.values()].map((n) => `${n.id}\t${n.title}\n`)),
        }),
    }),
    "get:/notes/:id": endpoint({
      operationId: "getNote",
      tags: [notesTag],
      parameters: { path: z.object({ id: z.string() }) },
      responses: { 200: note, 404: "Note not found" },
      handler: async ({ params }) => findNote(params.id),
    }),
    "put:/notes/:id/content": endpoint({
      operationId: "putNoteContent",
      tags: [notesTag],
      security: auth,
      parameters: { path: z.object({ id: z.string() }) },
      requestBody: new TextBody(),
      responses: { 200: new TextBody(), 404: "Note not found" },
      handler: async ({ params, body }) => {
        findNote(params.id).content = body;
        return body;
      },
    }),
    "post:/notes/:id/attachments": endpoint({
      operationId: "uploadAttachment",
      tags: [notesTag],
      security: auth,
      parameters: { path: z.object({ id: z.string() }) },
      requestBody: new FormDataBody(z.object({ label: z.string(), file: z.instanceof(File) })),
      responses: {
        201: z.object({ label: z.string(), name: z.string(), size: z.number() }),
        404: "Note not found",
      },
      handler: async ({ params, body }) => {
        findNote(params.id);
        return { label: body.label, name: body.file.name, size: body.file.size };
      },
    }),
    "get:/boom": endpoint({
      operationId: "getBoom",
      responses: { 200: z.object({}) },
      handler: async () => {
        throw new Error("connection failed: postgres://admin:hunter2@db");
      },
    }),
  };
}

/**
 * Starts the API on the given port (`0` picks a free one).
 */
export async function startServer(port = 0) {
  const endpoints = createEndpoints();
  const app = new Router();

  createApi(app, endpoints, {
    request: { multiValueQueryString: true, multiValueUrlEncoded: true },
    docs: {
      viewer: "scalar",
      spec: buildJson({
        openapi: "3.1.0",
        info: { title: "Notes API", version: "1.0.0" },
        paths: endpoints,
      }),
      docsPath: "/docs",
      specPath: "/openapi.json",
    },
    ...(process.env["E2E_LOG"] && { logger: console }),
  });

  const server = http.createServer(app.handler());
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer(Number(process.env["PORT"] ?? 3000));
  console.log(`Notes API listening on http://127.0.0.1:${server.address().port}`);
}
