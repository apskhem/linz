import { buildJson } from "@apskhem/linz";

import pkg from "../package.json" with { type: "json" };
import { endpoints } from "./endpoints";

/**
 * The OpenAPI document, generated from the endpoints and their schemas.
 */
export const openApiDocument = buildJson({
  openapi: "3.1.0",
  info: {
    title: "Notes API",
    description: "An example API built with Linz.",
    version: pkg.version,
  },
  paths: endpoints,
});
