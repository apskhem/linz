import { generateSchema } from "@anatine/zod-openapi";
import { isEmpty, keyBy, mapValues, upperFirst } from "lodash";
import { OpenAPIV3 } from "openapi-types";
import { z } from "zod";

import { convertPathParams } from "./internal-utils";

import { LinzEndpointGroup, Security } from ".";

const API_ERROR_COMPONENT_NAME = "ApiError";

const GENERAL_ERROR_SCHEMA = z.object({
  statusCode: z.number().int().min(100).max(599),
  message: z.union([ z.object({}), z.any().array(), z.string() ])
});

const VALIDATION_ERROR_SCHEMA = z.object({
  statusCode: z.number().int().min(100).max(599),
  message: z.union([ z.object({}), z.any().array(), z.string() ])
});

export type BuilderConfig = {
  openapi: "3.0.3";
  info: OpenAPIV3.Document["info"];
  servers?: OpenAPIV3.Document["servers"];
  tags?: Record<string, OpenAPIV3.TagObject>;
  paths: LinzEndpointGroup;
  security?: Security<any>[];
};

export function buildJson(config: BuilderConfig): OpenAPIV3.Document {
  const transformedPath = {} as OpenAPIV3.Document["paths"];

  const schemaComponent = {} as NonNullable<OpenAPIV3.ComponentsObject["schemas"]>;

  for (const [ methodPath, operationObject ] of Object.entries(config.paths)) {
    const [ method, ...pathParts ] = methodPath.split(/:/);
    const { path, params: pathParams } = convertPathParams(pathParts.join(":"));

    const parameterObject = [] as OpenAPIV3.ParameterObject[];
    const pathObject = transformedPath[path] ?? {};

    // collect parameters
    if (operationObject.parameters) {
      for (const [ type, schema ] of Object.entries(operationObject.parameters)) {
        const { properties = {}, required = [] } = generateSchema(schema) as OpenAPIV3.SchemaObject;

        for (const [ name, itemSchema ] of Object.entries(properties)) {
          const { description, ...schema } = itemSchema as OpenAPIV3.SchemaObject;

          parameterObject.push({
            name,
            in: type,
            description,
            required: required.includes(name) || undefined,
            schema
          });
        }
      }
    }

    // collect body objects
    const requestBodySchemaName = `${upperFirst(operationObject.operationId)}RequestBody`;
    if (operationObject.requestBody) {
      const schema = generateSchema(operationObject.requestBody) as OpenAPIV3.SchemaObject;

      schemaComponent[requestBodySchemaName]
        = operationObject.requestBodyType === "multipart/form-data"
          ? intoFormDataBody(schema)
          : schema;
    }

    // collect response objects
    const responseSchemaName = `${upperFirst(operationObject.operationId)}Response`;
    if (operationObject.responses) {
      for (const [ status, schema ] of Object.entries(operationObject.responses)) {
        if (typeof schema === "object") {
          schemaComponent[responseSchemaName] = generateSchema(schema) as OpenAPIV3.SchemaObject;
        }
      }
    }

    // wrap up
    pathObject[method as OpenAPIV3.HttpMethods] = {
      tags: operationObject.tags?.length
        ? Object.values(operationObject.tags).map((v) => v.name)
        : undefined,
      summary: operationObject.summary || operationObject.operationId,
      description: operationObject.description,
      operationId: operationObject.operationId,
      deprecated: operationObject.deprecated,
      parameters: isEmpty(parameterObject) ? undefined : parameterObject,
      security: operationObject.security?.map((sec) => ({
        [sec.inner.name]: []
      })),
      requestBody: operationObject.requestBody
        ? {
          description: "[DUMMY]",
          content: intoContentTypeRef(
            operationObject.requestBodyType || "application/json",
            requestBodySchemaName
          )
        }
        : undefined,
      responses: {
        ...mapValues(operationObject.responses, (v) => {
          return {
            description: "[DUMMY]",
            content:
              typeof v === "boolean"
                ? intoContentTypeRef("application/json", API_ERROR_COMPONENT_NAME)
                : intoContentTypeRef("application/json", responseSchemaName)
          };
        }),
        "400":
          operationObject.requestBody || !isEmpty(operationObject.parameters)
            ? {
              description: "Misformed data in a sending request",
              content: intoContentTypeRef("application/json", API_ERROR_COMPONENT_NAME)
            }
            : undefined!,
        "401": operationObject.security?.length
          ? {
            description: "Unauthorized",
            content: intoContentTypeRef("application/json", API_ERROR_COMPONENT_NAME)
          }
          : undefined!,
        "500": {
          description: "Server unhandled or runtime error that may occur",
          content: intoContentTypeRef("application/json", API_ERROR_COMPONENT_NAME)
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
        [API_ERROR_COMPONENT_NAME]: generateSchema(GENERAL_ERROR_SCHEMA) as OpenAPIV3.SchemaObject
      },
      securitySchemes: config.security?.length
        ? mapValues(
          keyBy(
            config.security.map((x) => x.inner),
            "name"
          ),
          ({ handler, name, ...o }) => o as OpenAPIV3.SecuritySchemeObject
        )
        : undefined
    },
    tags: config.tags && !isEmpty(config.tags) ? Object.values(config.tags) : undefined
  };
}

function intoContentTypeRef(
  contentType: string,
  schemaComponentName: string
): Pick<OpenAPIV3.ResponseObject, "content"> {
  return {
    [contentType]: {
      schema: {
        $ref: `#/components/schemas/${schemaComponentName}`
      }
    }
  };
}

function intoFormDataBody(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  return {
    type: schema.type,
    properties: mapValues(schema.properties, (v: any) =>
      v.nullable ? { type: "string", format: "binary" } : v
    )
  } as OpenAPIV3.SchemaObject;
}
