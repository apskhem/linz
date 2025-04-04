import { generateSchema } from "@anatine/zod-openapi";
import httpStatus from "http-status";
import { OpenAPIV3 } from "openapi-types";
import { pascal, title, isEmpty, mapValues, objectify, omit, shake, mapEntries } from "radash";
import { z } from "zod";

import { convertPathParams } from "./internal/utils";

import { FormDataBody, JsonBody, LinzEndpoint, LinzEndpointGroup, Security, UrlEncodedBody } from ".";

const GENERAL_API_ERROR_COMPONENT_NAME = "GeneralApiError";
const VALIDATION_ERROR_COMPONENT_NAME = "ValidationError";

const ZOD_ERROR_ITEM = z.object({
  code: z.string(),
  expected: z.string(),
  received: z.string(),
  path: z.string().array(),
  message: z.string()
});

const ZOD_ERROR_SCHEMA = z.object({
  in: z.enum([ "body", "queries", "params", "headers", "cookies" ])
    .describe("The part of a request where data validation failed"),
  result: z.array(ZOD_ERROR_ITEM)
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

/**
 * Configuration object for building an OpenAPI specification.
 */
export type BuilderConfig = {
  /**
   * The OpenAPI version used in the specification.
   */
  openapi: "3.0.3";
  /**
   * Information about the API, including title, description, and version.
   */
  info: OpenAPIV3.Document["info"];
  /**
   * A list of server definitions describing where the API can be accessed.
   */
  servers?: OpenAPIV3.Document["servers"];
  /**
   * A record of tags for grouping related API endpoints.
   * The key is the tag name, and the value is the OpenAPI TagObject.
   */
  tags?: Record<string, OpenAPIV3.TagObject>;
  /**
   * The defined API paths and their respective operations.
   */
  paths: LinzEndpointGroup;
  /**
   * Security definitions specifying authentication and authorization mechanisms.
   */
  security?: Security<any>[];
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
 * @returns {OpenAPIV3.Document} The generated OpenAPI document.
 */
export function buildJson(config: BuilderConfig): OpenAPIV3.Document {
  const transformedPath: OpenAPIV3.Document["paths"] = {};

  const schemaComponent: NonNullable<OpenAPIV3.ComponentsObject["schemas"]> = {};

  for (const [ methodPath, operationObject ] of Object.entries(config.paths)) {
    const [ method, ...pathParts ] = methodPath.split(":");
    const { path } = convertPathParams(pathParts.join(":"));

    const parameterObject: OpenAPIV3.ParameterObject[] = [];
    const pathObject = transformedPath[path] ?? {};

    // collect parameters
    for (const [ type, schema ] of Object.entries(operationObject.parameters ?? {})) {
      const { properties = {}, required = [] } = generateSchema(schema) as OpenAPIV3.SchemaObject;

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
          schema
        });
      }
    }

    // collect body objects
    const requestBodySchemaName = `${pascal(title(operationObject.operationId))}RequestBody`;
    if (operationObject.requestBody && operationObject.requestBody.body._def.typeName !== z.ZodVoid.name) {
      const schema = generateSchema(operationObject.requestBody.body) as OpenAPIV3.SchemaObject;

      schemaComponent[requestBodySchemaName]
        = operationObject.requestBody instanceof FormDataBody
          ? intoFormDataBody(schema)
          : schema;
    }

    // collect response objects
    const responseSchemaName = `${pascal(title(operationObject.operationId))}Response`;
    for (const [ , schema ] of Object.entries(operationObject.responses ?? {})) {
      if (typeof schema === "object" && schema.body._def.typeName !== z.ZodVoid.name) {
        schemaComponent[responseSchemaName] = generateSchema(schema.body) as OpenAPIV3.SchemaObject;
      }
    }

    // wrap up
    pathObject[method as OpenAPIV3.HttpMethods] = {
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
          [sec.inner.name]: []
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
            operationObject.requestBody.body._def.typeName === z.ZodVoid.name,
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
              : intoContentTypeRef(v.mimeType, responseSchemaName, v.body._def.typeName === z.ZodVoid.name)
        })),
        ...((operationObject.requestBody || !isEmpty(operationObject.parameters)) && {
          "400": {
            description: getResponseStatusDesc(operationObject.responses, 400) || "Misformed data in a sending request",
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
          description: getResponseStatusDesc(operationObject.responses, 500) || "Server unhandled or runtime error that may occur",
          content: intoContentTypeRef(JsonBody.mimeType, GENERAL_API_ERROR_COMPONENT_NAME)
        }
      }
    };

    transformedPath[path] = pathObject;
  }

  return {
    openapi: config.openapi,
    info: config.info,
    paths: transformedPath,
    components: {
      schemas: {
        ...schemaComponent,
        [GENERAL_API_ERROR_COMPONENT_NAME]: generateSchema(GENERAL_ERROR_SCHEMA),
        [VALIDATION_ERROR_COMPONENT_NAME]: generateSchema(VALIDATION_ERROR_SCHEMA),
        ...mapEntries(config.additionalSchemas ?? {}, (k, v) => [ pascal(title(k)), generateSchema(v) ])
      },
      ...(config.security?.length && {
        securitySchemes: mapValues(
          objectify(config.security.map((x) => x.inner), (o) => o.name),
          (o) => omit(o, [ "handler", "name" ]) as OpenAPIV3.SecuritySchemeObject
        )
      })
    },
    ...((config.tags && !isEmpty(config.tags)) && {
      tags: Object.values(config.tags)
    })
  };
}

function intoContentTypeRef(
  contentType: string,
  schemaComponentName: string,
  isVoid?: boolean,
  encoding?: FormDataBody["encoding"]
): Pick<OpenAPIV3.ResponseObject, "content"> {
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
            headers: generateSchema(v.headers)["properties"]
          })
        }))
      })
    }
  };
}

function intoFormDataBody(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  return {
    type: schema.type,
    properties: mapValues(schema.properties ?? {}, (fieldProp) => (
      "nullable" in fieldProp && fieldProp.nullable && Object.keys(fieldProp).length === 1
        ? { type: "string", format: "binary" }
        : fieldProp
    ))
  } as OpenAPIV3.SchemaObject;
}

function getResponseStatusDesc(response: LinzEndpoint["responses"], status: number): string | null {
  const tmp = response[status];
  return typeof tmp === "string" ? tmp : null;
}
