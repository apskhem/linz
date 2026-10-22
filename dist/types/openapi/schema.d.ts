import type { OpenAPIV3_1 } from "openapi-types";
import { z } from "zod";
import { FormDataBody } from "../bodies";
/**
 * Which side of a schema to describe: what clients send (`input`, e.g. before defaults
 * and transforms apply) or what the server sends (`output`).
 */
export type SchemaIo = "input" | "output";
export declare function toJsonSchema(schema: z.ZodType, options: {
    io: SchemaIo;
    contentType?: string;
}): OpenAPIV3_1.SchemaObject;
/**
 * Converts an object schema into OpenAPI header objects, keyed by header name.
 */
export declare function toHeaderObjects(headers: z.ZodObject, io: SchemaIo): Record<string, OpenAPIV3_1.HeaderObject>;
/**
 * Creates the content of a request or response body, referencing its schema component.
 */
export declare function intoContentTypeRef(contentType: string, schemaComponentName: string, options?: {
    io?: SchemaIo;
    isVoid?: boolean;
    encoding?: FormDataBody["encoding"] | undefined;
    examples?: Record<string, OpenAPIV3_1.ExampleObject> | null;
}): Pick<OpenAPIV3_1.ResponseObject, "content">;
