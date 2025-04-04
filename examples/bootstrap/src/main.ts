import * as http from "http";

import { buildJson, createApi } from "@apskhem/linz";
import { Router } from "@routejs/router";
import router from "router";
import { install } from "source-map-support";

import { TAG } from "common/constants/values";

import pk from "../package.json";

// Enable source map support
install();

const app = new Router();

const swaggerJson = buildJson({
  openapi: "3.0.3",
  info: {
    title: "Linz Bootstrap API",
    version: pk.version,
  },
  tags: TAG,
  paths: router,
  security: []
});

createApi(app, router, {
  cors: true,
  docs: {
    vendor: "scalar",
    spec: swaggerJson,
    docsPath: "/",
    specPath: "/openapi.json",
  }
});

http.createServer(app.handler()).listen(3000);
