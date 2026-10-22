import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { isEmpty, mapValues } from "radash";
import { z } from "zod";

import { FormDataBody } from "../bodies";

/**
 * Which side of a schema to describe: what clients send (`input`, e.g. before defaults
 * and transforms apply) or what the server sends (`output`).
 */
export type SchemaIo = "input" | "output";

export function toJsonSchema(
  schema: z.ZodType,
  options: { io: SchemaIo; contentType?: string }
): OpenAPIV3_1.SchemaObject {
  const { io, contentType } = options;
  let jsonSchema = z.toJSONSchema(schema, {
    unrepresentable: "any",
    io,
  }) as OpenAPIV3_1.SchemaObject;

  if (contentType === FormDataBody.mimeType) {
    for (const fieldName in jsonSchema.properties ?? {}) {
      if (jsonSchema.properties && isEmpty(jsonSchema.properties[fieldName])) {
        jsonSchema.properties[fieldName] = {
          type: "string",
          format: "binary",
          contentMediaType: "application/octet-stream",
        };
      }
    }
  }

  delete jsonSchema["$schema"];

  return jsonSchema;
}

/**
 * Converts an object schema into OpenAPI header objects, keyed by header name.
 */
export function toHeaderObjects(
  headers: z.ZodObject,
  io: SchemaIo
): Record<string, OpenAPIV3_1.HeaderObject> {
  const { properties = {}, required = [] } = toJsonSchema(headers, { io });

  return Object.fromEntries(
    Object.entries(properties).map(([name, schema]) => {
      const { description, ...headerSchema } = schema as OpenAPIV3_1.SchemaObject;

      return [
        name,
        {
          ...(description && { description }),
          ...(required.includes(name) && { required: true }),
          schema: headerSchema as OpenAPIV3.SchemaObject,
        },
      ];
    })
  );
}

/**
 * Creates the content of a request or response body, referencing its schema component.
 */
export function intoContentTypeRef(
  contentType: string,
  schemaComponentName: string,
  options: {
    io?: SchemaIo;
    isVoid?: boolean;
    encoding?: FormDataBody["encoding"] | undefined;
    examples?: Record<string, OpenAPIV3_1.ExampleObject> | null;
  } = {}
): Pick<OpenAPIV3_1.ResponseObject, "content"> {
  const { io = "output", isVoid, encoding, examples } = options;

  return {
    [contentType]: {
      ...(!isVoid && {
        schema: {
          $ref: `#/components/schemas/${schemaComponentName}`,
        },
      }),
      ...(examples && { examples }),
      ...(!isVoid &&
        encoding && {
          encoding: mapValues(encoding, (v) => ({
            ...v,
            ...(v.contentType && {
              contentType: v.contentType.join(", "),
            }),
            ...(v.headers && {
              headers: toHeaderObjects(v.headers, io),
            }),
          })),
        }),
    },
  };
}
