import type { OpenAPIV3_1 } from "openapi-types";
import { pascal, title } from "radash";
import type { z } from "zod";

import type { LinzEndpointGroup } from "../endpoint";
import { jsonApiErrorResponseSchema } from "../errors";
import { convertPathParams, parseMethodPath } from "../internal/paths";
import { buildOperation, JSON_API_ERROR_COMPONENT_NAME } from "./operation";
import { SpecRegistry } from "./registry";
import { toJsonSchema } from "./schema";

const JSON_SCHEMA_DIALECTS = [
  "https://spec.openapis.org/oas/3.1/dialect/base",
  "https://spec.openapis.org/oas/3.1/dialect/2024-11-10",
] as const;

/**
 * Configuration object for building an OpenAPI specification.
 */
export type BuilderConfig = {
  /**
   * The OpenAPI version used in the specification.
   */
  openapi: "3.1.0" | "3.1.1";
  /**
   * Information about the API, including title, description, and version.
   */
  info: OpenAPIV3_1.Document["info"];
  /**
   * The default value for the `$schema` keyword within `SchemaObject` contained within this OAS document.
   */
  jsonSchemaDialect?: (typeof JSON_SCHEMA_DIALECTS)[number];
  /**
   * A list of server definitions describing where the API can be accessed.
   */
  servers?: OpenAPIV3_1.Document["servers"];
  /**
   * The defined API paths and their respective operations.
   */
  paths: LinzEndpointGroup;
  /**
   * The incoming webhooks that MAY be received as part of this API and that the API consumer MAY choose to implement.
   */
  webhooks?: OpenAPIV3_1.Document["webhooks"];
  /**
   * Additional external documentation.
   */
  externalDocs?: OpenAPIV3_1.Document["externalDocs"];
  /**
   * Additional reusable schemas, defined using Zod types,
   * that are not being auto-listed by `paths`.
   */
  additionalSchemas?: Record<string, z.ZodType>;
};

/**
 * Builds an OpenAPI JSON document based on the provided configuration.
 *
 * @param {BuilderConfig} config - The configuration object for building the OpenAPI specification.
 * @returns {OpenAPIV3_1.Document} The generated OpenAPI document.
 */
export function buildJson(config: BuilderConfig): OpenAPIV3_1.Document {
  const registry = new SpecRegistry();
  const paths: OpenAPIV3_1.PathsObject = {};

  for (const [methodPath, operation] of Object.entries(config.paths)) {
    if (operation.hidden) {
      continue;
    }

    const { method, path: routePath } = parseMethodPath(methodPath);
    const { path } = convertPathParams(routePath);

    registry.addOperation(operation, path);
    (paths[path] ??= {})[method as OpenAPIV3_1.HttpMethods] = buildOperation(operation, registry);
  }

  registry.addSchema(
    JSON_API_ERROR_COMPONENT_NAME,
    toJsonSchema(jsonApiErrorResponseSchema, { io: "output" }),
    "the built-in error schema"
  );
  for (const [key, schema] of Object.entries(config.additionalSchemas ?? {})) {
    registry.addSchema(
      pascal(title(key)),
      toJsonSchema(schema, { io: "output" }),
      `additionalSchemas "${key}"`
    );
  }

  return {
    openapi: config.openapi,
    info: config.info,
    jsonSchemaDialect: config.jsonSchemaDialect ?? JSON_SCHEMA_DIALECTS[0],
    ...(config.servers && {
      servers: config.servers,
    }),
    paths,
    ...(config.webhooks && {
      webhooks: config.webhooks,
    }),
    components: registry.toComponents(),
    tags: registry.getTags(),
    ...(config.externalDocs && {
      externalDocs: config.externalDocs,
    }),
  };
}
