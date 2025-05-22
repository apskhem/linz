import * as http from "http";

import { buildJson, createApi, Router } from "@apskhem/linz";
import pino from "pino";
import router from "router";
import { install } from "source-map-support";

import pkg from "../package.json";

// Enable source map support
install();

const app = new Router();

const openApiSpec = buildJson({
  openapi: "3.1.0",
  info: {
    title: "Linz Bootstrap API",
    version: pkg.version,
  },
  paths: router,
});

const logger = pino();

createApi(app, router, {
  cors: true,
  request: {
    multiValueQueryString: true
  },
  docs: {
    viewer: "scalar",
    spec: openApiSpec,
    docsPath: "/",
    specPath: "/openapi.json",
  },
  logger
});

http.createServer(app.handler()).listen(3000);
