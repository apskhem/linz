import type { OpenAPIV3_1 } from "openapi-types";
import type { LinzEndpoint } from "../endpoint";
import type { SpecRegistry } from "./registry";
export declare const JSON_API_ERROR_COMPONENT_NAME = "JsonApiError";
/**
 * Builds the operation object of an endpoint, registering its body schemas as components.
 */
export declare function buildOperation(operation: LinzEndpoint, registry: SpecRegistry): NonNullable<OpenAPIV3_1.PathItemObject[OpenAPIV3_1.HttpMethods]>;
