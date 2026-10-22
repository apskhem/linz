# Linz bootstrap

A small but complete API built with Linz: notes you can list, create, update, delete and attach files to.
Use it to see how the pieces fit together, or copy this folder as the starting point of your own API.

## Run it

```bash
npm install
npm run dev
```

The API runs at http://localhost:3000, with interactive docs at http://localhost:3000/docs.
Requests that change notes need the header `Authorization: Bearer dev-token`.

[`requests.hurl`](requests.hurl) walks through every endpoint. With the server running:

```bash
npx @orangeopensource/hurl --test --variable base_url=http://localhost:3000 requests.hurl
```

## Scripts

| Script            | What it does                                                        |
| ----------------- | ------------------------------------------------------------------- |
| `npm run dev`     | Runs the API and restarts it when a file changes.                   |
| `npm run build`   | Bundles the API into `dist/main.js`.                                |
| `npm start`       | Runs the bundle, for production.                                    |
| `npm run check`   | Type-checks the project.                                            |
| `npm run openapi` | Writes the OpenAPI document to `openapi.json`, e.g. to generate clients. |

## Configuration

| Variable    | Default     | Purpose                                     |
| ----------- | ----------- | ------------------------------------------- |
| `PORT`      | `3000`      | Port to listen on.                          |
| `API_TOKEN` | `dev-token` | Bearer token required to change notes.      |
| `LOG_LEVEL` | `info`      | [pino](https://getpino.io) log level.       |

## Project layout

```
src/
  main.ts          starts the HTTP server and shuts it down cleanly
  app.ts           creates the router: endpoints, docs, CORS and logging
  config.ts        settings from environment variables
  endpoints.ts     the list of every endpoint group, with their path prefixes
  openapi.ts       the OpenAPI document, generated from the endpoints
  common/
    security.ts    the bearer token check, shared by protected endpoints
    tags.ts        tags that group endpoints in the docs
  modules/
    health/
      health.endpoints.ts
    notes/
      notes.schemas.ts     Zod schemas for notes and their inputs
      notes.store.ts       in-memory storage, replace it with a database
      notes.endpoints.ts   the notes endpoints
scripts/
  write-openapi.ts         used by `npm run openapi`
```

A request flows from `main.ts` to the router made in `app.ts`, which serves the endpoints listed in `endpoints.ts`.
Each module keeps its schemas, its data access and its endpoints side by side.

## Adding an endpoint

1. Describe its input and output with Zod in the module's `*.schemas.ts`.
2. Add it to the module's `*.endpoints.ts`, keyed by method and path:

   ```ts
   "get:/notes/:id": endpoint({
     operationId: "getNote",
     parameters: { path: NoteParams },
     responses: { 200: Note, 404: "Note not found" },
     handler: async ({ params }) => { /* ... */ },
   }),
   ```

3. For a new module, add its endpoint group to `src/endpoints.ts`.

From the schemas, Linz:

- validates parameters and bodies, answering `400` with the issues when they are invalid,
- types `params`, `queries`, `headers`, `cookies` and `body` in the handler,
- checks what the handler returns against the response schema,
- documents the endpoint in the OpenAPI document and the docs page.

Throw an `ApiError` to answer with an error status, as `notes.endpoints.ts` does for missing notes.
Any other error answers `500` without exposing its details, and is logged.

## Using Linz in your own project

This example installs Linz from this repository (`"@apskhem/linz": "file:../.."`).
After changing the library, rebuild it with `npm run build` at the repository root, then run `npm install` here again.

In your own project, install Linz together with Zod, which it uses for schemas:

```bash
npm install github:apskhem/linz#main zod
```
