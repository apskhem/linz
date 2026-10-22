# Linz

A Node.js web framework where every endpoint is described once, with [Zod](https://zod.dev) schemas, and that description does the rest:

- **Validates requests**: parameters, headers, cookies and bodies are checked before your handler runs, and invalid requests get a `400` with the issues.
- **Types handlers**: the handler's input is typed from the schemas, with no casting.
- **Checks responses**: what a handler returns is checked against the declared response, so the API cannot drift from its documentation.
- **Generates OpenAPI 3.1**: the spec and an interactive docs page (Scalar, Swagger UI, Redoc, RapiDoc or Stoplight Elements) come from the same definitions.

## Install

```bash
npm install github:apskhem/linz#main zod
```

Linz needs Node.js 20 or later and Zod 4. It ships both ES modules and CommonJS.

## Quick start

```ts
import * as http from "node:http";

import { buildJson, createApi, endpoint, Router } from "@apskhem/linz";
import { z } from "zod";

const endpoints = {
  "get:/hello/:name": endpoint({
    operationId: "sayHello",
    parameters: { path: z.object({ name: z.string() }) },
    responses: { 200: z.object({ message: z.string() }) },
    handler: async ({ params }) => ({ message: `Hello, ${params.name}!` }),
  }),
};

const app = new Router();

createApi(app, endpoints, {
  docs: {
    viewer: "scalar",
    spec: buildJson({
      openapi: "3.1.0",
      info: { title: "Hello API", version: "1.0.0" },
      paths: endpoints,
    }),
    docsPath: "/docs",
    specPath: "/openapi.json",
  },
});

http.createServer(app.handler()).listen(3000);
```

```console
$ curl localhost:3000/hello/Ada
{"message":"Hello, Ada!"}
```

The interactive docs are at http://localhost:3000/docs and the spec at http://localhost:3000/openapi.json.

## Learn more

- **[Manual](MANUAL.md)**: concepts, how-to guides, configuration reference and notes.
- **[Example project](examples/bootstrap)**: a complete API with authentication, uploads and a suggested project layout.

## Development

```bash
npm install
npm run check      # type-check
npm run lint       # lint with oxlint
npm test           # unit and integration tests
npm run test:e2e   # end-to-end HTTP tests with Hurl
npm run bench      # HTTP throughput against the bare router
npm run build      # bundle into dist/
```

## Contributing

Suggestions, bug reports and pull requests are welcome. Please open an issue to discuss larger changes first.

## License

[MIT](LICENSE)
