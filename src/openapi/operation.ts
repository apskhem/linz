import { status as httpStatus } from "http-status";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { isEmpty, mapValues, pascal, shake, title } from "radash";
import { z } from "zod";

import { FormDataBody, JsonBody, OctetStreamBody, UrlEncodedBody } from "../bodies";
import type { LinzEndpoint } from "../endpoint";
import type { SpecRegistry } from "./registry";
import { intoContentTypeRef, toHeaderObjects, toJsonSchema } from "./schema";

export const JSON_API_ERROR_COMPONENT_NAME = "JsonApiError";

const errorContent = () => intoContentTypeRef(JsonBody.mimeType, JSON_API_ERROR_COMPONENT_NAME);

/**
 * Builds the operation object of an endpoint, registering its body schemas as components.
 */
export function buildOperation(
  operation: LinzEndpoint,
  registry: SpecRegistry
): NonNullable<OpenAPIV3_1.PathItemObject[OpenAPIV3_1.HttpMethods]> {
  const parameters = buildParameters(operation);

  return {
    ...(operation.tags?.length && {
      tags: operation.tags.map((v) => v.name),
    }),
    summary: operation.summary || operation.operationId,
    ...(operation.description && {
      description: operation.description,
    }),
    operationId: operation.operationId,
    ...(operation.deprecated && {
      deprecated: operation.deprecated,
    }),
    ...(!isEmpty(parameters) && {
      parameters,
    }),
    ...(operation.security?.length && {
      security: operation.security.map((sec) => ({
        [sec.security.name]: sec.scopes,
      })),
    }),
    ...(operation.requestBody && {
      requestBody: buildRequestBody(operation, operation.requestBody, registry),
    }),
    responses: buildResponses(operation, registry),
  };
}

function buildParameters(operation: LinzEndpoint): OpenAPIV3_1.ParameterObject[] {
  const parameters: OpenAPIV3_1.ParameterObject[] = [];

  for (const [type, schema] of Object.entries(operation.parameters ?? {})) {
    const { properties = {}, required = [] } = toJsonSchema(schema, { io: "input" });

    for (const [name, itemSchema] of Object.entries(properties)) {
      if ("$ref" in itemSchema) {
        continue;
      }

      const { description, ...schema } = itemSchema;
      const isItemRequired = required.includes(name);

      parameters.push({
        name,
        in: type,
        ...(description && { description }),
        // path parameters must always be required as per OpenAPI
        ...((isItemRequired || type === "path") && { required: true }),
        schema: schema as OpenAPIV3.SchemaObject,
      });
    }
  }

  return parameters;
}

function buildRequestBody(
  operation: LinzEndpoint,
  requestBody: NonNullable<LinzEndpoint["requestBody"]>,
  registry: SpecRegistry
) {
  const schemaName = `${pascal(title(operation.operationId))}RequestBody`;
  const isVoid = requestBody.body.type === z.void().type || requestBody instanceof OctetStreamBody;

  if (!isVoid) {
    registry.addSchema(
      schemaName,
      toJsonSchema(requestBody.body, { io: "input", contentType: requestBody.mimeType }),
      `operation "${operation.operationId}"`
    );
  }

  return {
    ...(requestBody.description && {
      description: requestBody.description,
    }),
    content: intoContentTypeRef(requestBody.mimeType, schemaName, {
      io: "input",
      isVoid,
      encoding:
        requestBody instanceof FormDataBody || requestBody instanceof UrlEncodedBody
          ? requestBody.encoding
          : undefined,
      examples: requestBody.getExamples(),
    }),
    required: !requestBody.body.isOptional(),
  };
}

function buildResponses(operation: LinzEndpoint, registry: SpecRegistry) {
  // each status gets its own component so they cannot overwrite each other
  const getSchemaName = (status: string) =>
    `${pascal(title(operation.operationId))}${getStatusName(status)}Response`;

  for (const [status, schema] of Object.entries(operation.responses ?? {})) {
    if (
      typeof schema === "object" &&
      !(schema instanceof OctetStreamBody) &&
      schema.body.type !== z.void().type
    ) {
      registry.addSchema(
        getSchemaName(status),
        toJsonSchema(schema.body, { io: "output", contentType: schema.mimeType }),
        `operation "${operation.operationId}"`
      );
    }
  }

  return {
    ...mapValues(shake(operation.responses), (v, k) =>
      typeof v === "boolean" || typeof v === "string"
        ? {
            description: (typeof v === "string" && v) || getStatusDescription(String(k)),
            content: errorContent(),
          }
        : {
            description: v.description || getStatusDescription(String(k)),
            ...(v.requiredHeaders && {
              headers: toHeaderObjects(v.requiredHeaders, "output"),
            }),
            content: intoContentTypeRef(v.mimeType, getSchemaName(String(k)), {
              io: "output",
              isVoid: v.body.type === z.void().type || v instanceof OctetStreamBody,
              examples: v.getExamples(),
            }),
          }
    ),
    // the error responses the framework itself may produce
    ...((operation.requestBody || !isEmpty(operation.parameters)) && {
      "400": {
        description: getResponseStatusDesc(operation.responses, 400) || httpStatus[400],
        content: errorContent(),
      },
    }),
    ...(operation.requestBody && {
      "415": {
        description: getResponseStatusDesc(operation.responses, 415) || httpStatus[415],
        content: errorContent(),
      },
    }),
    ...(operation.security?.length && {
      "401": {
        description: getResponseStatusDesc(operation.responses, 401) || httpStatus[401],
        content: errorContent(),
      },
    }),
    "500": {
      description: getResponseStatusDesc(operation.responses, 500) || httpStatus[500],
      content: errorContent(),
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

function getStatusDescription(status: string): string {
  const description = httpStatus[status as keyof typeof httpStatus];

  return typeof description === "string" ? description : "No description";
}

function getResponseStatusDesc(response: LinzEndpoint["responses"], status: number): string | null {
  const tmp = response[status];
  return typeof tmp === "string" ? tmp : null;
}
