import type { OpenAPIV3_1 } from "openapi-types";
import type { z } from "zod";
import type { LinzEndpointGroup } from "../endpoint";
declare const JSON_SCHEMA_DIALECTS: readonly ["https://spec.openapis.org/oas/3.1/dialect/base", "https://spec.openapis.org/oas/3.1/dialect/2024-11-10"];
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
export declare function buildJson(config: BuilderConfig): OpenAPIV3_1.Document;
export {};
