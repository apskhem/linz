import type * as http from "http";

import type { Router } from "@routejs/router";
import cors from "cors";

import { type LinzEndpointGroup, METHODS } from "../endpoint";
import { parseMethodPath } from "../internal/paths";
import type { CreateApiConfig } from "./config";
import { renderDocsPage } from "./docs";
import { createEndpointHandler } from "./endpoint-handler";
import { notFoundHandler } from "./not-found";

export function createApi(
  app: Router,
  endpoints: LinzEndpointGroup,
  config?: Partial<CreateApiConfig>
) {
  if (config?.cors) {
    app.use(cors(typeof config.cors === "boolean" ? {} : config.cors));
  }

  config?.logger?.info?.(`Registering ${Object.keys(endpoints).length} endpoints...`);

  const registeredOpId = new Set<string>();
  for (const [methodPath, operation] of Object.entries(endpoints)) {
    const { method, path } = parseMethodPath(methodPath);

    if (registeredOpId.has(operation.operationId)) {
      throw new Error(`Duplicate operation ID "${operation.operationId}" for path ${path}`);
    }
    registeredOpId.add(operation.operationId);

    if (!METHODS.some((m) => m === method)) {
      throw new Error(`Invalid method "${method}" for path ${path}`);
    }

    config?.logger?.info?.(`${operation.operationId} -> ${method.toUpperCase()} ${path}`);

    app[method](path, createEndpointHandler(method, operation, config));
  }

  if (config?.docs) {
    registerDocs(app, config.docs);
  }

  if (config?.notFound !== false) {
    app.use(notFoundHandler(config));
  }
}

function registerDocs(app: Router, docs: CreateApiConfig["docs"]): void {
  const specJson = JSON.stringify(docs.spec);
  const docsPage = renderDocsPage(docs.viewer, {
    title: docs.spec.info.title,
    specUrl: docs.specPath,
    theme: docs.theme,
  });

  app.get(docs.specPath, (_: http.IncomingMessage, res: http.ServerResponse) => {
    res.writeHead(200, { "content-type": "application/json" }).end(specJson);
  });
  app.get(docs.docsPath, (_: http.IncomingMessage, res: http.ServerResponse) => {
    res.writeHead(200, { "content-type": "text/html" }).end(docsPage);
  });
}
