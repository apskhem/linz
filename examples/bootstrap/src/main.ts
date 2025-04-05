import * as http from "http";

import { buildJson, createApi, Router } from "@apskhem/linz";
import router from "router";
import { install } from "source-map-support";

import { TAG } from "common/constants/values";

import pkg from "../package.json";

// Enable source map support
install();

const app = new Router();

const swaggerJson = buildJson({
  openapi: "3.0.3",
  info: {
    title: "Linz Bootstrap API",
    version: pkg.version,
  },
  tags: TAG,
  paths: router,
  security: []
});

createApi(app, router, {
  cors: true,
  docs: {
    viewer: "scalar",
    spec: swaggerJson,
    docsPath: "/",
    specPath: "/openapi.json",
  }
});

http.createServer(app.handler()).listen(3000);
