import httpStatus from "http-status";
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { isEmpty, mapEntries, mapValues, pascal, shake, title } from "radash";
import { z } from "zod";

import { convertPathParams } from "./internal/utils";

import { FormDataBody, JsonBody, LinzEndpoint, LinzEndpointGroup, OctetStreamBody, Security, UrlEncodedBody } from ".";
import zodToJsonSchema from "zod-to-json-schema";

const GENERAL_API_ERROR_COMPONENT_NAME = "GeneralApiError";
const VALIDATION_ERROR_COMPONENT_NAME = "ValidationError";

const ZOD_ISSUE_SCHEMA = z.object({
  code: z.enum([
    "invalid_type",
    "invalid_literal",
    "unrecognized_keys",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite",
    "custom"
  ]),
  path: z.union([z.string(), z.number().int().min(0)]).array(),
  fatal: z.boolean().optional(),
  message: z.string()
}).passthrough();

const ZOD_ERROR_SCHEMA = z.object({
  in: z.enum([ "body", "queries", "params", "headers", "cookies" ])
    .describe("The part of a request where data validation failed"),
  result: z.array(ZOD_ISSUE_SCHEMA)
    .describe("An array of error items")
});

const GENERAL_ERROR_SCHEMA = z.object({
  statusCode: z.number().int().min(100).max(599)
    .describe("The HTTP response status code"),
  message: z.string()
    .describe("The message associated with the error")
})
  .describe("A general HTTP error response");

const VALIDATION_ERROR_SCHEMA = GENERAL_ERROR_SCHEMA.extend({
  message: z.union([
    z.array(ZOD_ERROR_SCHEMA)
      .describe("An array of error schemas detailing validation issues"),
    z.string()
      .describe("Alternatively, a simple error message")
  ])
})
  .describe("An error related to the validation process with more detailed information");

const JSON_SCHEMA_DIALECTS = [
  "https://json-schema.org/draft/2020-12/schema#",
  "https://json-schema.org/draft/2019-09/schema#",
  "https://json-schema.org/draft-07/schema#",
  "https://json-schema.org/draft-06/schema#",
  "http://json-schema.org/draft-04/schema#"
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
   * The default value for the $schema keyword within Schema Objects contained within this OAS document.
   */
  jsonSchemaDialect?: (typeof JSON_SCHEMA_DIALECTS)[number],
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
  const transformedPath: OpenAPIV3_1.Document["paths"] = {};

  const schemaComponent: NonNullable<OpenAPIV3_1.ComponentsObject["schemas"]> = {};

  let collectedApplyingSecuritySet = new Set<Security>();
  let collectedApplyingTagSet = new Set<OpenAPIV3_1.TagObject>();
  for (const [ methodPath, operationObject ] of Object.entries(config.paths)) {
    const [ method, ...pathParts ] = methodPath.split(":");
    const { path } = convertPathParams(pathParts.join(":"));

    const parameterObject: OpenAPIV3_1.ParameterObject[] = [];
    const pathObject = transformedPath[path] ?? {};

    for (const sec of operationObject.security ?? []) {
      collectedApplyingSecuritySet.add(sec.security);
    }
    for (const tag of operationObject.tags ?? []) {
      collectedApplyingTagSet.add(tag);
    }

    // collect parameters
    for (const [ type, schema ] of Object.entries(operationObject.parameters ?? {})) {
      const { properties = {}, required = [] } = toJsonSchema(schema);

      for (const [ name, itemSchema ] of Object.entries(properties)) {
        if ("$ref" in itemSchema) {
          continue;
        }

        const { description, ...schema } = itemSchema;
        const isItemRequired = required.includes(name);

        parameterObject.push({
          name,
          in: type,
          ...(description && { description }),
          ...(isItemRequired && { required: isItemRequired }),
          schema: schema as OpenAPIV3.SchemaObject
        });
      }
    }

    // collect body objects
    const requestBodySchemaName = `${pascal(title(operationObject.operationId))}RequestBody`;
    if (
      operationObject.requestBody
      && operationObject.requestBody.body._def.typeName !== z.ZodVoid.name
      && !(operationObject.requestBody instanceof OctetStreamBody)
    ) {
      schemaComponent[requestBodySchemaName] = toJsonSchema(
        operationObject.requestBody.body,
        operationObject.requestBody.mimeType
      );
    }

    // collect response objects
    const responseSchemaName = `${pascal(title(operationObject.operationId))}Response`;
    for (const [ , schema ] of Object.entries(operationObject.responses ?? {})) {
      if (schema instanceof OctetStreamBody) {
        continue;
      }
      if (typeof schema === "object" && schema.body._def.typeName !== z.ZodVoid.name) {
        schemaComponent[responseSchemaName] = toJsonSchema(
          schema.body,
          schema.mimeType
        );
      }
    }

    // wrap up
    pathObject[method as OpenAPIV3_1.HttpMethods] = {
      ...(operationObject.tags?.length && {
        tags: Object.values(operationObject.tags).map((v) => v.name)
      }),
      summary: operationObject.summary || operationObject.operationId,
      ...(operationObject.description && {
        description: operationObject.description
      }),
      operationId: operationObject.operationId,
      ...(operationObject.deprecated && {
        deprecated: operationObject.deprecated
      }),
      ...(!isEmpty(parameterObject) && {
        parameters: parameterObject
      }),
      ...(operationObject.security?.length && {
        security: operationObject.security.map((sec) => ({
          [sec.security.name]: sec.scopes
        }))
      }),
      ...(operationObject.requestBody && {
        requestBody: {
          ...(operationObject.requestBody.description && {
            description: operationObject.requestBody.description
          }),
          content: intoContentTypeRef(
            operationObject.requestBody.mimeType,
            requestBodySchemaName,
            operationObject.requestBody.body._def.typeName === z.ZodVoid.name || operationObject.requestBody instanceof OctetStreamBody,
            operationObject.requestBody instanceof FormDataBody || operationObject.requestBody instanceof UrlEncodedBody
              ? operationObject.requestBody.encoding
              : undefined
          ),
          required: !operationObject.requestBody.body.isOptional()
        }
      }),
      responses: {
        ...mapValues(shake(operationObject.responses), (v, k) => ({
          description: (typeof v === "string" ? v : null)
            || String(httpStatus[`${k}` as keyof typeof httpStatus])
            || "No description",
          content:
            typeof v === "boolean" || typeof v === "string"
              ? intoContentTypeRef(JsonBody.mimeType, GENERAL_API_ERROR_COMPONENT_NAME)
              : intoContentTypeRef(v.mimeType, responseSchemaName, v.body._def.typeName === z.ZodVoid.name || v instanceof OctetStreamBody)
        })),
        ...((operationObject.requestBody || !isEmpty(operationObject.parameters)) && {
          "400": {
            description: getResponseStatusDesc(operationObject.responses, 400) || httpStatus[400],
            content: intoContentTypeRef(JsonBody.mimeType, VALIDATION_ERROR_COMPONENT_NAME)
          }
        }),
        ...(operationObject.security?.length && {
          "401": {
            description: getResponseStatusDesc(operationObject.responses, 401) || httpStatus[401],
            content: intoContentTypeRef(JsonBody.mimeType, GENERAL_API_ERROR_COMPONENT_NAME)
          }
        }),
        "500": {
          description: getResponseStatusDesc(operationObject.responses, 500) || httpStatus[500],
          content: intoContentTypeRef(JsonBody.mimeType, GENERAL_API_ERROR_COMPONENT_NAME)
        }
      }
    };

    transformedPath[path] = pathObject;
  }

  return {
    openapi: config.openapi,
    info: config.info,
    jsonSchemaDialect: config.jsonSchemaDialect ?? JSON_SCHEMA_DIALECTS[0],
    paths: transformedPath,
    ...(config.webhooks && ({
      webhooks: config.webhooks,
    })),
    components: {
      schemas: {
        ...schemaComponent,
        [GENERAL_API_ERROR_COMPONENT_NAME]: toJsonSchema(GENERAL_ERROR_SCHEMA),
        [VALIDATION_ERROR_COMPONENT_NAME]: toJsonSchema(VALIDATION_ERROR_SCHEMA),
        ...mapEntries(config.additionalSchemas ?? {}, (k, v) => [ pascal(title(k)), toJsonSchema(v) ])
      },
      ...(collectedApplyingSecuritySet.size && {
        securitySchemes: Object.fromEntries(
          [...collectedApplyingSecuritySet.values()].map((sec) => [sec.name, sec.schema])
        )
      })
    },
    tags: [...collectedApplyingTagSet.values()],
    ...(config.externalDocs && ({
      externalDocs: config.externalDocs,
    })),
  };
}

// -- helpers

function intoContentTypeRef(
  contentType: string,
  schemaComponentName: string,
  isVoid?: boolean,
  encoding?: FormDataBody["encoding"]
): Pick<OpenAPIV3_1.ResponseObject, "content"> {
  if (isVoid) {
    return {
      [contentType]: {}
    };
  }

  return {
    [contentType]: {
      schema: {
        $ref: `#/components/schemas/${schemaComponentName}`
      },
      ...(encoding && {
        encoding: mapValues(encoding, (v) => ({
          ...v,
          ...(v.contentType && {
            contentType: v.contentType.join(", ")
          }),
          ...(v.headers && {
            headers: toJsonSchema(v.headers).properties
          })
        }))
      })
    }
  };
}

function getResponseStatusDesc(response: LinzEndpoint["responses"], status: number): string | null {
  const tmp = response[status];
  return typeof tmp === "string" ? tmp : null;
}

function toJsonSchema(schema: Parameters<typeof zodToJsonSchema>[0], contentType?: string): OpenAPIV3_1.SchemaObject {
  let jsonSchema = zodToJsonSchema(schema, { target: "jsonSchema2019-09" }) as OpenAPIV3_1.SchemaObject;

  if (contentType === FormDataBody.mimeType) {
    for (const fieldName in jsonSchema.properties ?? {}) {
      if (jsonSchema.properties && isEmpty(jsonSchema.properties[fieldName])) {
        jsonSchema.properties[fieldName] = {
          type: "string",
          contentMediaType: "application/octet-stream"
        };
      }
    }
  }

  jsonSchema["$schema"] = JSON_SCHEMA_DIALECTS[0];

  return jsonSchema;
}
