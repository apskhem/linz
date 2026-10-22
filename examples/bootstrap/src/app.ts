import { createApi, type Logger, Router } from "@apskhem/linz";

import { endpoints } from "./endpoints";
import { openApiDocument } from "./openapi";

/**
 * Creates the router serving the API and its docs, without starting a server,
 * so it can also be mounted elsewhere or used in tests.
 */
export function createApp(logger: Logger): Router {
  const app = new Router();

  createApi(app, endpoints, {
    cors: true,
    logger,
    docs: {
      viewer: "scalar",
      spec: openApiDocument,
      docsPath: "/docs",
      specPath: "/openapi.json",
    },
  });

  return app;
}
