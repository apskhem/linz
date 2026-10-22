import httpStatus from "http-status";
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { isEmpty, mapEntries, mapValues, pascal, shake, title } from "radash";
import { z } from "zod";

import { convertPathParams } from "./internal/utils";

import {
  FormDataBody,
  JsonBody,
  LinzEndpoint,
  LinzEndpointGroup,
  OctetStreamBody,
  Security,
  UrlEncodedBody,
} from ".";

const JsonApiErrorItem = z
  .object({
    id: z
      .string()
      .optional()
      .describe("A unique identifier for this particular occurrence of the problem."),
    links: z
      .object({
        about: z
          .string()
          .url()
          .optional()
          .describe("A link that leads to further details about this particular error."),
      })
      .optional()
      .describe("Links that lead to further details about the error."),
    status: z
      .string()
      .optional()
      .describe("HTTP status code applicable to this error, represented as a string."),
    code: z
      .string()
      .optional()
      .describe("An application-specific error code identifying the type of error."),
    title: z
      .string()
      .optional()
      .describe(
        "A short, human-readable summary of the problem that should not change from occurrence to occurrence."
      ),
    detail: z
      .string()
      .optional()
      .describe("A human-readable explanation specific to this occurrence of the problem."),
    source: z
      .object({
        pointer: z
          .string()
          .optional()
          .describe(
            "JSON Pointer to the request entity where the error originated (e.g., /data/attributes/email)."
          ),
        parameter: z
          .string()
          .optional()
          .describe("Query parameter name that caused the error (e.g., 'sort')."),
        header: z
          .string()
          .optional()
          .describe(
            "A string indicating the name of a single request header which caused the error."
          ),
      })
      .optional()
      .describe("An object containing references to the source of the error."),
    meta: z
      .record(z.string(), z.any())
      .optional()
      .describe("A meta object containing non-standard, implementation-specific details."),
  })
  .describe("A single error object conforming to JSON:API specification.");

const JsonApiErrorResponse = z
  .object({
    errors: z.array(JsonApiErrorItem).describe("Array of JSON:API error objects."),
  })
  .describe("JSON:API error response object.");

const JSON_API_ERROR_COMPONENT_NAME = "JsonApiError";

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
  const transformedPath: OpenAPIV3_1.Document["paths"] = {};
  const collectedApplyingSecuritySet = new Set<Security>();
  const collectedApplyingTagSet = new Set<OpenAPIV3_1.TagObject>();
  const schemaComponent: NonNullable<OpenAPIV3_1.ComponentsObject["schemas"]> = {};

  for (const [methodPath, operationObject] of Object.entries(config.paths)) {
    if (operationObject.hidden) {
      continue;
    }

    const [method, ...pathParts] = methodPath.split(":");
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
    for (const [type, schema] of Object.entries(operationObject.parameters ?? {})) {
      const { properties = {}, required = [] } = toJsonSchema(schema);

      for (const [name, itemSchema] of Object.entries(properties)) {
        if ("$ref" in itemSchema) {
          continue;
        }

        const { description, ...schema } = itemSchema;
        const isItemRequired = required.includes(name);

        parameterObject.push({
          name,
          in: type,
          ...(description && { description }),
          // path parameters must always be required as per OpenAPI
          ...((isItemRequired || type === "path") && { required: true }),
          schema: schema as OpenAPIV3.SchemaObject,
        });
      }
    }

    // collect body objects
    const requestBodySchemaName = `${pascal(title(operationObject.operationId))}RequestBody`;
    if (
      operationObject.requestBody &&
      operationObject.requestBody.body.type !== z.void().type &&
      !(operationObject.requestBody instanceof OctetStreamBody)
    ) {
      schemaComponent[requestBodySchemaName] = toJsonSchema(
        operationObject.requestBody.body,
        operationObject.requestBody.mimeType
      );
    }

    // collect response objects, each status gets its own component so they cannot overwrite each other
    const getResponseSchemaName = (status: string) =>
      `${pascal(title(operationObject.operationId))}${getStatusName(status)}Response`;
    for (const [status, schema] of Object.entries(operationObject.responses ?? {})) {
      if (schema instanceof OctetStreamBody) {
        continue;
      }
      if (typeof schema === "object" && schema.body.type !== z.void().type) {
        schemaComponent[getResponseSchemaName(status)] = toJsonSchema(schema.body, schema.mimeType);
      }
    }

    // wrap up
    pathObject[method as OpenAPIV3_1.HttpMethods] = {
      ...(operationObject.tags?.length && {
        tags: Object.values(operationObject.tags).map((v) => v.name),
      }),
      summary: operationObject.summary || operationObject.operationId,
      ...(operationObject.description && {
        description: operationObject.description,
      }),
      operationId: operationObject.operationId,
      ...(operationObject.deprecated && {
        deprecated: operationObject.deprecated,
      }),
      ...(!isEmpty(parameterObject) && {
        parameters: parameterObject,
      }),
      ...(operationObject.security?.length && {
        security: operationObject.security.map((sec) => ({
          [sec.security.name]: sec.scopes,
        })),
      }),
      ...(operationObject.requestBody && {
        requestBody: {
          ...(operationObject.requestBody.description && {
            description: operationObject.requestBody.description,
          }),
          content: intoContentTypeRef(
            operationObject.requestBody.mimeType,
            requestBodySchemaName,
            operationObject.requestBody.body.type === z.void().type ||
              operationObject.requestBody instanceof OctetStreamBody,
            operationObject.requestBody instanceof FormDataBody ||
              operationObject.requestBody instanceof UrlEncodedBody
              ? operationObject.requestBody.encoding
              : undefined
          ),
          required: !operationObject.requestBody.body.isOptional(),
        },
      }),
      responses: {
        ...mapValues(shake(operationObject.responses), (v, k) => ({
          description:
            (typeof v === "string" ? v : null) ||
            String(httpStatus[`${k}` as keyof typeof httpStatus]) ||
            "No description",
          content:
            typeof v === "boolean" || typeof v === "string"
              ? intoContentTypeRef(JsonBody.mimeType, JSON_API_ERROR_COMPONENT_NAME)
              : intoContentTypeRef(
                  v.mimeType,
                  getResponseSchemaName(String(k)),
                  v.body.type === z.void().type || v instanceof OctetStreamBody
                ),
        })),
        ...((operationObject.requestBody || !isEmpty(operationObject.parameters)) && {
          "400": {
            description: getResponseStatusDesc(operationObject.responses, 400) || httpStatus[400],
            content: intoContentTypeRef(JsonBody.mimeType, JSON_API_ERROR_COMPONENT_NAME),
          },
        }),
        ...(operationObject.requestBody && {
          "415": {
            description: getResponseStatusDesc(operationObject.responses, 415) || httpStatus[415],
            content: intoContentTypeRef(JsonBody.mimeType, JSON_API_ERROR_COMPONENT_NAME),
          },
        }),
        ...(operationObject.security?.length && {
          "401": {
            description: getResponseStatusDesc(operationObject.responses, 401) || httpStatus[401],
            content: intoContentTypeRef(JsonBody.mimeType, JSON_API_ERROR_COMPONENT_NAME),
          },
        }),
        "500": {
          description: getResponseStatusDesc(operationObject.responses, 500) || httpStatus[500],
          content: intoContentTypeRef(JsonBody.mimeType, JSON_API_ERROR_COMPONENT_NAME),
        },
      },
    };

    transformedPath[path] = pathObject;
  }

  return {
    openapi: config.openapi,
    info: config.info,
    jsonSchemaDialect: config.jsonSchemaDialect ?? JSON_SCHEMA_DIALECTS[0],
    paths: transformedPath,
    ...(config.webhooks && {
      webhooks: config.webhooks,
    }),
    components: {
      schemas: {
        ...schemaComponent,
        [JSON_API_ERROR_COMPONENT_NAME]: toJsonSchema(JsonApiErrorResponse),
        ...mapEntries(config.additionalSchemas ?? {}, (k, v) => [
          pascal(title(k)),
          toJsonSchema(v),
        ]),
      },
      ...(collectedApplyingSecuritySet.size && {
        securitySchemes: Object.fromEntries(
          [...collectedApplyingSecuritySet.values()].map((sec) => [sec.name, sec.schema])
        ),
      }),
    },
    tags: [...collectedApplyingTagSet.values()],
    ...(config.externalDocs && {
      externalDocs: config.externalDocs,
    }),
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
      [contentType]: {},
    };
  }

  return {
    [contentType]: {
      schema: {
        $ref: `#/components/schemas/${schemaComponentName}`,
      },
      ...(encoding && {
        encoding: mapValues(encoding, (v) => ({
          ...v,
          ...(v.contentType && {
            contentType: v.contentType.join(", "),
          }),
          ...(v.headers && {
            headers: toJsonSchema(v.headers).properties,
          }),
        })),
      }),
    },
  };
}

/**
 * Converts a response status into a PascalCase name, e.g. `404` -> `NotFound`.
 * Falls back to the status itself when it has no standard name, e.g. `299` -> `299`.
 */
function getStatusName(status: string): string {
  if (status === "default") {
    return "Default";
  }

  const name = httpStatus[`${status}_NAME` as keyof typeof httpStatus];

  return typeof name === "string" ? pascal(title(name.toLowerCase())) : status;
}

function getResponseStatusDesc(response: LinzEndpoint["responses"], status: number): string | null {
  const tmp = response[status];
  return typeof tmp === "string" ? tmp : null;
}

function toJsonSchema(schema: z.ZodType, contentType?: string): OpenAPIV3_1.SchemaObject {
  let jsonSchema = z.toJSONSchema(schema, {
    unrepresentable: "any",
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
