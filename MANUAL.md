# Linz manual

This manual explains how Linz works and how to use it. Read [Concepts](#concepts) once to get the model, then jump to the [how-to guides](#how-to-guides) and the [reference](#reference) as needed. [Notes](#notes) collects behaviors worth knowing before you ship.

- [Concepts](#concepts)
  - [Endpoints](#endpoints)
  - [The request lifecycle](#the-request-lifecycle)
  - [Bodies](#bodies)
  - [Responses](#responses)
  - [Errors](#errors)
  - [Security](#security)
  - [Endpoint groups](#endpoint-groups)
  - [The OpenAPI document](#the-openapi-document)
- [How-to guides](#how-to-guides)
- [Reference](#reference)
- [Notes](#notes)

## Concepts

### Endpoints

An endpoint is one operation of your API: a method, a path and a definition. Endpoints are written as a plain object whose keys are `<method>:<path>`. Path parameters use `:name`.

```ts
import { endpoint, type LinzEndpointGroup } from "@apskhem/linz";
import { z } from "zod";

const endpoints: LinzEndpointGroup = {
  "get:/books/:id": endpoint({
    operationId: "getBook",
    summary: "Get a book",
    parameters: {
      path: z.object({ id: z.string() }),
    },
    responses: {
      200: z.object({ id: z.string(), title: z.string() }),
      404: "Book not found",
    },
    handler: async ({ params }) => ({ id: params.id, title: "Dune" }),
  }),
};
```

The definition is the single source of truth:

| Field | Purpose |
| --- | --- |
| `operationId` | A unique name for the operation. Required. It also names the generated schemas. |
| `summary`, `description`, `tags`, `deprecated` | Documentation only. |
| `parameters` | Zod object schemas for `path`, `query`, `header` and `cookie` values. |
| `requestBody` | The accepted body: a Zod schema (JSON) or one of the [body classes](#bodies). |
| `responses` | The possible responses by status code. See [Responses](#responses). |
| `security` | Who may call the endpoint. See [Security](#security). |
| `hidden` | Leaves the endpoint out of the OpenAPI document. It is still served. |
| `handler` | Your code. It receives the validated request and returns the response. |

Always wrap definitions in `endpoint()`. It infers the handler's types from the schemas and turns Zod schema shorthands into `JsonBody`.

The handler receives two arguments:

- **The validated message**: `params`, `queries`, `headers`, `cookies` and `body`, each typed from its schema and already transformed by it (defaults applied, transforms run).
- **The context**: `extensions` (data set by [security handlers](#security)), the raw Node.js `req` and `res`, and the endpoint's `security`.

### The request lifecycle

For every request to an endpoint, Linz runs these steps in order. Any step can end the request with an error response.

1. **Authenticate.** If the endpoint has `security`, its handlers run before anything else. See [Security](#security).
2. **Read the body.** Only if the endpoint declares a `requestBody`. The request's `Content-Type` must match the declared body, otherwise `415`.
3. **Validate.** The body and each declared parameter location are parsed with their schemas. All problems are collected and returned together as one `400`.
4. **Run the handler.**
5. **Validate the response.** The returned body is parsed with the response schema of its status. A mismatch is a bug on the server, so it becomes a `500` and is logged.
6. **Send.** The body is serialized for its content type (JSON, form data, text...).

If the handler sends a response itself through `ctx.res`, Linz stops after step 4.

### Bodies

A body type pairs a Zod schema with a content type. It is used for request bodies and response bodies alike.

| Class | Content type | Schema |
| --- | --- | --- |
| `JsonBody` | `application/json` | Any Zod schema. A bare Zod schema is shorthand for `new JsonBody(schema)`. |
| `FormDataBody` | `multipart/form-data` | A Zod object. Use `z.instanceof(File)` for files. |
| `UrlEncodedBody` | `application/x-www-form-urlencoded` | A Zod object of scalar or array fields. |
| `TextBody` | `text/plain` | A Zod string, `z.string()` by default. |
| `HtmlBody` | `text/html` | A Zod string, `z.string()` by default. |
| `OctetStreamBody` | `application/octet-stream` | Raw bytes as a `Buffer`. |

Bodies can carry documentation, written into the OpenAPI document:

```ts
new JsonBody(Book)
  .describe("The created book")                                   // description
  .requireHeaders(z.object({ location: z.string() }))             // response headers
  .setExamples({ dune: { value: { id: "1", title: "Dune" } } });  // examples
```

`FormDataBody` and `UrlEncodedBody` also take OpenAPI encoding options per field as a second argument, such as the accepted content types of an uploaded file.

### Responses

`responses` maps status codes to what the endpoint can answer:

- **A body** (a Zod schema or a body class) is a success or error response the handler returns. Its schema validates what is sent.
- **A string or `true`** documents an error response produced by throwing an [`ApiError`](#errors). The string is its description.
- **`default`** is used for any status without its own entry.

The handler returns either the body itself, which is sent with the endpoint's default status, or an `HttpResponse` to choose the status and headers:

```ts
import { HttpResponse } from "@apskhem/linz";

// default status
return book;

// explicit status and headers
return new HttpResponse({ status: 201, headers: { location: `/books/${book.id}` }, body: book });

// no body
return HttpResponse.withoutBody(204);
```

The default status is `201` for `post` and `200` for other methods, when the endpoint declares it. Otherwise it is the lowest `2xx` status the endpoint declares.

### Errors

Every error response has the same shape, following [JSON:API errors](https://jsonapi.org/format/#errors):

```json
{ "errors": [{ "status": "404", "detail": "Book 42 not found" }] }
```

To answer with an error, throw an `ApiError` from a handler or a security handler:

```ts
import { ApiError } from "@apskhem/linz";

throw new ApiError(404, { status: "404", detail: `Book ${id} not found` });

// several errors, and response headers
throw new ApiError(429, [{ detail: "Too many requests" }], { "retry-after": "60" });
```

Linz produces these errors itself:

| Status | When |
| --- | --- |
| `400` | The request failed validation. Each item has `meta.in` (`body`, `queries`, `params`, `headers` or `cookies`) and `meta.result` (the Zod issues). Also for malformed bodies. |
| `404` | No endpoint matches the path. |
| `415` | The body's content type differs from the declared one, or its charset is unsupported. |
| `500` | Anything else: an unexpected exception, or a response that does not match its schema. |

A `500` never includes the original error message, which could expose internals. The error and its stack trace go to the [logger](#log-requests-and-errors) instead.

### Security

A `Security` describes one way to authenticate. Its handler inspects the request and throws to reject it. Whatever it puts in `extensions` reaches the endpoint handler as `ctx.extensions`.

```ts
import { ApiError, Security } from "@apskhem/linz";

export const bearerAuth = new Security({
  name: "bearerAuth",
  schema: { type: "http", scheme: "bearer" }, // OpenAPI security scheme
  handler: async (req, scopes, extensions) => {
    const user = await verifyToken(req.headers.authorization, scopes);
    if (!user) {
      throw new ApiError(401, { detail: "Missing or invalid token" });
    }
    extensions.user = user;
  },
});
```

Endpoints opt in with `security: [bearerAuth.apply(["books:write"])]`. The scopes are passed to the handler.

When an endpoint lists several securities, they are alternatives, as in OpenAPI: the first one that passes wins, and if none passes, the first failure is returned. Security runs before the body is read, so unauthenticated requests cost nothing to parse.

### Endpoint groups

Endpoints are plain objects, so you can organize them in modules and combine them:

- `mergeEndpointGroups(prefix, groups)` merges groups under a path prefix and throws on duplicate routes.
- `applyGroupConfig(group, config)` applies `tags`, `security`, `hidden` or `deprecated` to every endpoint of a group. Tags and securities are added to each endpoint's own; `hidden` and `deprecated` apply only where an endpoint does not set them.

```ts
import { applyGroupConfig, mergeEndpointGroups } from "@apskhem/linz";

const books = applyGroupConfig(bookEndpoints, { tags: [{ name: "Books" }] });

export const endpoints = {
  ...healthEndpoints,                                 // GET /health
  ...mergeEndpointGroups("/v1", [books, authors]),   // GET /v1/books/:id, ...
};
```

### The OpenAPI document

`buildJson` turns endpoints into an OpenAPI 3.1 document:

```ts
import { buildJson } from "@apskhem/linz";

const spec = buildJson({
  openapi: "3.1.0",
  info: { title: "Books API", version: "1.0.0" },
  servers: [{ url: "https://api.example.com" }],
  paths: endpoints,
});
```

What it generates:

- **Parameters and request bodies** are described as clients send them: fields with a `.default()` are optional, and transformed fields show their input type. Responses are described as the server sends them.
- **Schemas** become named components: `<OperationId>RequestBody` and `<OperationId><Status>Response`, such as `GetBookOkResponse` or `GetBookNotFoundResponse`. The error shape is `JsonApiError`.
- **Responses Linz may produce** are added for you: `400` when there are parameters or a body, `415` when there is a body, `401` when there is security, and `500` always.
- **Security schemes and tags** are collected from the endpoints.

`buildJson` throws when two things would get the same name, instead of silently overwriting one: duplicate operation IDs, generated schema names that collide, two different `Security` objects sharing a name, or two tags sharing a name with different descriptions.

## How-to guides

### Create a server

`createApi` registers endpoints on a [`Router`](https://github.com/routejs/router), re-exported by Linz. `app.handler()` returns a standard `(req, res)` request listener for Node's `http` module.

```ts
import * as http from "node:http";

import { createApi, Router } from "@apskhem/linz";

const app = new Router();
createApi(app, endpoints, { cors: true, logger: console });

http.createServer(app.handler()).listen(3000);
```

### Read parameters

Declare each location you need as a Zod object. Only declared locations are validated and passed to the handler.

```ts
endpoint({
  operationId: "searchBooks",
  parameters: {
    query: z.object({
      q: z.string(),
      page: z.string().regex(/^\d+$/).transform(Number).default(1), // values arrive as strings
    }),
    header: z.object({ "Accept-Language": z.string().optional() }),
    cookie: z.object({ session: z.string().optional() }),
  },
  responses: { 200: SearchResult },
  handler: async ({ queries, headers }) => search(queries.q, queries.page, headers["Accept-Language"]),
});
```

Header names are matched case-insensitively and given to the handler under the name you declared.

### Accept a request body

```ts
// JSON, the shorthand
requestBody: z.object({ title: z.string(), year: z.number().int() }),

// a file upload
requestBody: new FormDataBody(z.object({ cover: z.instanceof(File), caption: z.string() })),

// an HTML form
requestBody: new UrlEncodedBody(z.object({ email: z.string(), topics: z.array(z.string()) })),

// plain text or raw bytes
requestBody: new TextBody(),
requestBody: new OctetStreamBody(),
```

Make the body optional with `.optional()` on its schema. A request without a body then reaches the handler with `body` set to `undefined`.

### Accept multiple values for one key

By default, a repeated key such as `?tag=a&tag=b` keeps only its last value. To keep all of them, enable it in `createApi`:

```ts
createApi(app, endpoints, {
  request: {
    multiValueQueryString: true,  // query strings
    multiValueUrlEncoded: true,   // application/x-www-form-urlencoded bodies
    multiValueFormData: true,     // multipart/form-data bodies
  },
});
```

With a flag on, every value of that kind arrives as an array, so declare those fields with `z.array(...)`. See [Notes](#notes).

### Stream a response

Return a Node.js `Readable` or a web `ReadableStream` as the body. It is sent as it is produced, with the content type of the declared response.

```ts
endpoint({
  operationId: "exportBooks",
  responses: { 200: new TextBody() },
  handler: async () => new HttpResponse({ body: fs.createReadStream("books.csv") }),
});
```

Streamed bodies are not validated. If the stream fails midway, the connection is closed and the error is logged.

### Protect endpoints

Apply a `Security` to the endpoints that need it, or to a whole group:

```ts
const writeEndpoints = applyGroupConfig(endpoints, { security: [bearerAuth.apply([])] });
```

To accept either of two methods, list both. The first that passes is used:

```ts
security: [bearerAuth.apply([]), apiKeyAuth.apply([])],
```

### Serve the docs

Pass the document from `buildJson` to `createApi`:

```ts
createApi(app, endpoints, {
  docs: {
    viewer: "scalar", // or "swagger", "redoc", "rapidoc", "spotlight-elements"
    spec: buildJson({ openapi: "3.1.0", info: { title: "Books API", version: "1.0.0" }, paths: endpoints }),
    docsPath: "/docs",
    specPath: "/openapi.json",
    theme: "moon", // optional, for Scalar and Swagger UI
  },
});
```

The docs page loads the viewer from the jsDelivr CDN, pinned to an exact version with integrity checks.

To use the document elsewhere, for example to generate API clients or review API changes in pull requests, write it to a file:

```ts
fs.writeFileSync("openapi.json", JSON.stringify(spec, null, 2));
```

### Log requests and errors

Pass any logger with `info` and `error` methods, such as `console` or [pino](https://getpino.io):

```ts
createApi(app, endpoints, { logger: pino() });
```

Linz logs the registered routes at `info` level, and unexpected errors with their stack traces at `error` level.

### Handle unknown routes

`createApi` ends the router with a catch-all that answers `404`. To answer first yourself, for example to serve static files, pass a `fallbackHandler`. If it sends a response, the `404` is skipped.

To register more routes on the same router after `createApi`, disable the catch-all and mount it last yourself:

```ts
import { notFoundHandler } from "@apskhem/linz";

createApi(app, endpoints, { notFound: false });
app.get("/legacy", legacyHandler);
app.use(notFoundHandler({ logger }));
```

### Test an API

`createApi` only needs a router, so tests can start a real server on a free port and send requests with `fetch`:

```ts
const app = new Router();
createApi(app, endpoints);

const server = http.createServer(app.handler()).listen(0);
const { port } = server.address() as AddressInfo;

const res = await fetch(`http://127.0.0.1:${port}/books/1`);
expect(res.status).toBe(200);

server.close();
```

For end-to-end tests, [Hurl](https://hurl.dev) describes requests and assertions in plain text. This repository's [`e2e`](e2e) folder and the example's [`requests.hurl`](examples/bootstrap/requests.hurl) show how.

## Reference

### `createApi(app, endpoints, config?)`

| Option | Default | Description |
| --- | --- | --- |
| `cors` | off | `true` for permissive CORS, or [`cors` options](https://github.com/expressjs/cors#configuration-options). |
| `docs` | off | Serves the spec and a docs page: `viewer`, `spec`, `docsPath`, `specPath`, optional `theme`. |
| `request` | all `false` | `multiValueQueryString`, `multiValueUrlEncoded`, `multiValueFormData`. |
| `logger` | none | An object with optional `info`, `error` and other level methods. |
| `fallbackHandler` | none | Runs for unmatched routes before the `404`. |
| `notFound` | `true` | Whether to register the catch-all `404` handler. |

It throws if two endpoints share an `operationId`, or if a key has an unsupported method.

### `buildJson(config)`

| Option | Description |
| --- | --- |
| `openapi` | `"3.1.0"` or `"3.1.1"`. |
| `info` | Title, version and description of the API. |
| `paths` | The endpoints. Hidden endpoints are left out. |
| `servers` | Where the API is served. |
| `jsonSchemaDialect` | Defaults to the OpenAPI 3.1 base dialect. |
| `webhooks`, `externalDocs` | Copied into the document as is. |
| `additionalSchemas` | Extra Zod schemas to publish as components, by name. |

### Methods and content types

- Methods: `get`, `post`, `put`, `patch` and `delete`.
- Request content types: `application/json`, `multipart/form-data`, `application/x-www-form-urlencoded`, `application/octet-stream` and `text/*`, in the charsets Node.js supports (`utf-8`, `latin1`, `utf-16le`...).

### Exports

| Export | Purpose |
| --- | --- |
| `endpoint`, `LinzEndpoint`, `LinzEndpointGroup`, `HTTPMessage`, `HttpMethod`, `METHODS` | Defining endpoints. |
| `JsonBody`, `FormDataBody`, `UrlEncodedBody`, `TextBody`, `HtmlBody`, `OctetStreamBody` | Body types. |
| `HttpResponse` | Responses with a chosen status, headers or a stream. |
| `ApiError`, `JsonApiErrorItem`, `JsonApiErrorResponse` | Error responses. |
| `Security`, `AppliedSecurity` | Authentication. |
| `mergeEndpointGroups`, `applyGroupConfig` | Organizing endpoints. |
| `createApi`, `CreateApiConfig`, `notFoundHandler`, `Logger`, `Router` | Serving. |
| `buildJson`, `BuilderConfig`, `oas3` (OpenAPI 3.1 types) | Documenting. |

## Notes

**Requirements.** Node.js 20 or later and Zod 4. Your app and Linz must share a single copy of Zod: with two copies, schemas from one are not recognized by the other, and TypeScript can run out of memory comparing their types. A regular install shares it through Linz's peer dependency. Watch out with `npm link` or `file:` dependencies; set `install-links=true` in `.npmrc` to install them as copies, as the example project does.

**Only declared parameters reach the handler.** `params`, `queries`, `headers` and `cookies` contain only what their schemas declare. A location without a schema arrives as an empty object, even when the request has values there. Read the raw request through `ctx.req` if you need them.

**Query and form values are strings.** Use `.transform(Number)`, `z.coerce`, or a `.pipe()` to turn them into numbers, booleans or dates.

**The multi-value flags apply to every field.** With `multiValueQueryString` on, every query value is an array, including single ones such as `?page=2`. Declare scalar fields accordingly, or keep the flag off and avoid repeated keys.

**Literal return values may need `as const`.** A handler returning `{ status: "ok" }` for a `z.literal("ok")` field fails to type-check, because TypeScript widens the string. Write `"ok" as const`.

**Error statuses declared as `true` or a string are thrown, not returned.** Returning `new HttpResponse({ status: 404, ... })` for such a status is treated as a mismatch and answered with `500`. Throw an `ApiError` instead, or declare a body for that status.

**Path parameters are always required** in the OpenAPI document, as the specification demands, even when their schema is optional.

**Generated schema names follow operation IDs and statuses.** Renaming an `operationId` or changing a status renames its components, which changes generated client code.

**Security handlers should not read the request body.** The body is read after authentication. A security handler that consumes it leaves the endpoint an empty body.

**Request size is not limited.** Bodies are read into memory. Limit request sizes in front of the service, in a reverse proxy or an API gateway.

**The docs page loads its viewer from a CDN.** It needs internet access in the browser and, under a Content Security Policy, permission to load scripts and styles from `cdn.jsdelivr.net`.
