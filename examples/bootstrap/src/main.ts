import * as fs from "fs";

import { initExpress } from "@apskhem/linz";
import { buildJson } from "@apskhem/linz";
import express, { Express } from "express";
import router from "router";
import { install } from "source-map-support";

import { TAG } from "common/constants/values";

import pk from "../package.json"

// Enable source map support
install();

const app: Express = express();
const port = 3000;

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

fs.writeFileSync("dist/openapi.json", JSON.stringify(swaggerJson, null, 2));

initExpress(app, router, {
  cors: true,
  docs: {
    vendor: "scalar",
    path: "/",
    specUrl: "dist/openapi.json"
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
