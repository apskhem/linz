// src/adapter/engine-express.ts
import * as fs from "fs";
import { Readable } from "stream";
import bodeParser from "body-parser";
import cors from "cors";
import formidable from "formidable";
import { mapValues as mapValues2 } from "lodash";

// src/utils.ts
import { compact, intersection, isEmpty, mapKeys, mapValues, merge } from "lodash";
function mergeEndpointGroups(prefix, groups) {
  const readKeys = [];
  for (const group of groups) {
    const keys = Object.keys(group).map((key) => cleanPath(`${prefix}${key}`));
    const dupKeys = intersection(readKeys, keys);
    if (dupKeys.length) {
      throw new Error(`Duplication keys occured: ${dupKeys.join(", ")}`);
    }
    readKeys.push(...keys);
  }
  return mapKeys(merge({}, ...groups), (v, k) => cleanPath(k.replace(/:/, `:${prefix}`)));
}
function applyGroupConfig(group, config) {
  return mapValues(group, (v) => ({ ...config, ...v }));
}
function formatExpressReq(req, validator) {
  const errors = {};
  const body = tryCatch(
    () => validator.requestBody?.parse(req.body) || req.body,
    (err) => errors["body"] = JSON.parse(err.message)
  );
  const queries = tryCatch(
    () => validator.parameters?.query?.parse(req.query) || req.query,
    (err) => errors["queries"] = JSON.parse(err.message)
  );
  const params = tryCatch(
    () => validator.parameters?.path?.parse(req.params) || req.params,
    (err) => errors["params"] = JSON.parse(err.message)
  );
  const headers = tryCatch(
    () => validator.parameters?.header?.parse(req.headers) || req.headers,
    (err) => errors["headers"] = JSON.parse(err.message)
  );
  const cookies = tryCatch(
    () => validator.parameters?.cookie?.parse(req.cookies) || req.cookies,
    (err) => errors["cookies"] = JSON.parse(err.message)
  );
  if (!isEmpty(errors)) {
    throw new ValidationError(errors);
  }
  return {
    body: body ?? null,
    queries: queries ?? {},
    params: params ?? {},
    headers: headers ?? {},
    cookies: cookies ?? {}
  };
}
function prepareResponse(body) {
  if (typeof body === "string" || typeof body === "number" || typeof body === "boolean") {
    return {
      contentType: "text/plain",
      body: String(body)
    };
  }
  if (Array.isArray(body) || typeof body === "object") {
    return {
      contentType: "application/json",
      body: JSON.stringify(body)
    };
  }
  if (Buffer.isBuffer(body)) {
    return {
      contentType: "application/octet-stream",
      body
    };
  }
  if (body instanceof URLSearchParams) {
    return {
      contentType: "application/x-www-form-urlencoded",
      body: Array.from(body).map((item) => item.map(encodeURIComponent).join("=")).join("&")
    };
  }
  return {
    contentType: "text/plain",
    body: String(body)
  };
}
function convertPathParams(path) {
  const paramRegex = /:([^/]+)/g;
  const newPath = cleanPath(path).replace(paramRegex, "{$1}");
  const paramNames = [];
  let match = null;
  while ((match = paramRegex.exec(path)) !== null) {
    paramNames.push(match[1]);
  }
  return {
    path: newPath,
    params: compact(paramNames)
  };
}
function cleanPath(path) {
  return path.replace(/\/+/gi, "/");
}
function tryCatch(fn, handler) {
  try {
    return fn();
  } catch (err) {
    handler(err);
    return null;
  }
}

// src/adapter/engine-express.ts
function initExpress(app, endpoints, config) {
  if (config?.cors) {
    app.use(cors());
  }
  app.use(bodeParser.json());
  console.log(`[server]: Registering ${Object.keys(endpoints).length} endpoints...`);
  const registeredOpId = /* @__PURE__ */ new Set();
  for (const [methodPath, operatorObject] of Object.entries(endpoints)) {
    const [method = "", ...pathParts] = methodPath.split(/:/);
    const path = pathParts.join(":");
    if (registeredOpId.has(operatorObject.operationId)) {
      throw new Error(`Duplicate operation ID "${operatorObject.operationId}" for path ${path}`);
    } else {
      registeredOpId.add(operatorObject.operationId);
    }
    if (!METHODS.some((m) => m === method)) {
      throw new Error(`Invalid method "${method}" for path ${path}`);
    }
    console.log(`[register]: ${operatorObject.operationId} -> ${method.toUpperCase()} ${path}`);
    app[method](path, async (req, res) => {
      const extensions = {};
      if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        const mergedItems = {};
        for (const [key, values = []] of Object.entries(fields)) {
          mergedItems[key] ??= [];
          mergedItems[key]?.push(...values);
        }
        for (const [key, values = []] of Object.entries(files)) {
          mergedItems[key] ??= [];
          const formattedValues = values.map((v) => {
            const buffer = fs.readFileSync(v.filepath);
            const data = new Uint8Array(buffer);
            const file = new File([data], v.originalFilename || v.newFilename, {
              type: v.mimetype || ""
            });
            fs.rmSync(v.filepath);
            return file;
          });
          mergedItems[key]?.push(...formattedValues);
        }
        const err = [];
        for (const [key, values = []] of Object.entries(mergedItems)) {
          if (values.length > 1) {
            err.push({
              field: key,
              message: "Duplicate keys"
            });
          }
        }
        if (err.length) {
          return handleError(
            new ValidationError({
              body: err
            }),
            res
          );
        }
        req.body = mapValues2(mergedItems, (v) => v[0]);
      }
      try {
        const validatedReq = formatExpressReq(req, operatorObject);
        if (operatorObject.security?.length) {
          for (const secOp of operatorObject.security) {
            await secOp.inner.handler(validatedReq, extensions);
          }
        }
        const result = await operatorObject.handler(validatedReq, extensions);
        const validate = result instanceof HttpResponse ? result.status ? operatorObject.responses[result.status] || operatorObject.responses["default"] : operatorObject.responses[method === "post" ? 201 : 200] || operatorObject.responses["default"] : operatorObject.responses[method === "post" ? 201 : 200] || operatorObject.responses["default"];
        if (!validate || typeof validate === "boolean") {
          console.error(
            `[error]: There is no corresponding validator defined in schema for status ${result?.status ?? "default"}`
          );
          throw new Error("Internal server error");
        }
        try {
          validate.parse(result instanceof HttpResponse ? result.body : result);
        } catch (err) {
          console.error(
            "[error]: Invalid output format to the corresponding defined output schema"
          );
          console.error(String(err));
          throw new Error("Internal server error");
        }
        if (result instanceof HttpResponse) {
          if (result.body instanceof Readable) {
            Object.entries(result.headers ?? {}).map(([k, v]) => res.setHeader(k, v));
            result.body.pipe(res);
            return;
          }
          const preparedResult = prepareResponse(result.body);
          return res.header(result.headers).status(result.status ?? (method === "post" ? 201 : 200)).contentType(preparedResult.contentType).send(preparedResult.body);
        } else {
          const preparedResult = prepareResponse(result);
          return res.status(method === "post" ? 201 : 200).contentType(preparedResult.contentType).send(preparedResult.body);
        }
      } catch (err) {
        return handleError(err, res);
      }
    });
  }
  if (config?.docs) {
    registerDocsEndpoints(app, config.docs.path, config.docs.specUrl);
  }
  registerNotFoundHandler(app);
}
function handleError(err, res) {
  if (err instanceof ApiError) {
    res.status(err.status).send({
      statusCode: err.status,
      message: err.message
    });
  } else if (err instanceof ValidationError) {
    res.status(400).send({
      statusCode: 400,
      message: Object.entries(JSON.parse(err.message)).map(([k, v]) => ({
        in: k,
        result: v
      }))
    });
  } else if (err instanceof Error) {
    console.error(String(err));
    res.status(500).send({
      statusCode: 500,
      message: err.message
    });
  } else {
    console.error(String(err));
    res.status(500).send(String(err));
  }
}
function registerDocsEndpoints(app, docPath, specFilePath) {
  app.get(docPath, (req, res) => {
    const data = fs.readFileSync("dist/index.html", "utf-8");
    res.contentType("html").send(data);
  });
  app.get("/openapi.json", (req, res) => {
    const data = fs.readFileSync(specFilePath, "utf-8");
    res.contentType("json").send(data);
  });
}
function registerNotFoundHandler(app) {
  app.all("*", (req, res) => {
    res.status(404).send({
      statusCode: 404,
      message: `Cannot find ${req.method.toUpperCase()} ${req.path}`
    });
  });
}

// src/json-builder.ts
import { generateSchema } from "@anatine/zod-openapi";
import { isEmpty as isEmpty2, keyBy, mapValues as mapValues3, upperFirst } from "lodash";
import { z } from "zod";
var API_ERROR_COMPONENT_NAME = "ApiError";
var GeneralErrorSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  message: z.union([z.object({}), z.any().array(), z.string()])
});
var ValidationErrorSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  message: z.union([z.object({}), z.any().array(), z.string()])
});
function buildJson(config) {
  const transformedPath = {};
  const schemaComponent = {};
  for (const [methodPath, operationObject] of Object.entries(config.paths)) {
    const [method, ...pathParts] = methodPath.split(/:/);
    const { path, params: pathParams } = convertPathParams(pathParts.join(":"));
    const parameterObject = [];
    const pathObject = transformedPath[path] ?? {};
    if (operationObject.parameters) {
      for (const [type, schema] of Object.entries(operationObject.parameters)) {
        const { properties = {}, required = [] } = generateSchema(schema);
        for (const [name, itemSchema] of Object.entries(properties)) {
          const { description, ...schema2 } = itemSchema;
          parameterObject.push({
            name,
            in: type,
            description,
            required: required.includes(name) || void 0,
            schema: schema2
          });
        }
      }
    }
    const requestBodySchemaName = `${upperFirst(operationObject.operationId)}RequestBody`;
    if (operationObject.requestBody) {
      const schema = generateSchema(operationObject.requestBody);
      schemaComponent[requestBodySchemaName] = operationObject.requestBodyType === "multipart/form-data" ? intoFormDataBody(schema) : schema;
    }
    const responseSchemaName = `${upperFirst(operationObject.operationId)}Response`;
    if (operationObject.responses) {
      for (const [status, schema] of Object.entries(operationObject.responses)) {
        if (typeof schema === "object") {
          schemaComponent[responseSchemaName] = generateSchema(schema);
        }
      }
    }
    pathObject[method] = {
      tags: operationObject.tags?.length ? Object.values(operationObject.tags).map((v) => v.name) : void 0,
      summary: operationObject.summary || operationObject.operationId,
      description: operationObject.description,
      operationId: operationObject.operationId,
      deprecated: operationObject.deprecated,
      parameters: isEmpty2(parameterObject) ? void 0 : parameterObject,
      security: operationObject.security?.map((sec) => ({
        [sec.inner.name]: []
      })),
      requestBody: operationObject.requestBody ? {
        description: "[DUMMY]",
        content: intoContentTypeRef(
          operationObject.requestBodyType || "application/json",
          requestBodySchemaName
        )
      } : void 0,
      responses: {
        ...mapValues3(operationObject.responses, (v) => {
          return {
            description: "[DUMMY]",
            content: typeof v === "boolean" ? intoContentTypeRef("application/json", API_ERROR_COMPONENT_NAME) : intoContentTypeRef("application/json", responseSchemaName)
          };
        }),
        "400": operationObject.requestBody || !isEmpty2(operationObject.parameters) ? {
          description: "Misformed data in a sending request",
          content: intoContentTypeRef("application/json", API_ERROR_COMPONENT_NAME)
        } : void 0,
        "401": operationObject.security?.length ? {
          description: "Unauthorized",
          content: intoContentTypeRef("application/json", API_ERROR_COMPONENT_NAME)
        } : void 0,
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
        [API_ERROR_COMPONENT_NAME]: generateSchema(GeneralErrorSchema)
      },
      securitySchemes: config.security?.length ? mapValues3(
        keyBy(
          config.security.map((x) => x.inner),
          "name"
        ),
        ({ handler, name, ...o }) => o
      ) : void 0
    },
    tags: config.tags && !isEmpty2(config.tags) ? Object.values(config.tags) : void 0
  };
}
function intoContentTypeRef(contentType, schemaComponentName) {
  return {
    [contentType]: {
      schema: {
        $ref: `#/components/schemas/${schemaComponentName}`
      }
    }
  };
}
function intoFormDataBody(schema) {
  return {
    type: schema.type,
    properties: mapValues3(
      schema.properties,
      (v) => v.nullable ? { type: "string", format: "binary" } : v
    )
  };
}

// src/index.ts
var METHODS = ["get", "post", "put", "patch", "delete"];
function endpoint(endpoint2) {
  return endpoint2;
}
var HttpResponse = class {
  constructor(payload) {
    this.headers = payload.headers;
    this.status = payload.status;
    this.body = payload.body;
    this.stream = payload.stream;
  }
};
var Security = class {
  constructor(config) {
    this.inner = config;
  }
  use(flow, scopes) {
    return this;
  }
};
var ApiError = class extends Error {
  constructor(status, msg) {
    super(msg);
    this.status = status;
    this.msg = msg;
  }
};
var ValidationError = class extends Error {
  constructor(msg) {
    super(JSON.stringify(msg));
    this.msg = msg;
  }
};
export {
  ApiError,
  HttpResponse,
  METHODS,
  Security,
  ValidationError,
  applyGroupConfig,
  buildJson,
  convertPathParams,
  endpoint,
  formatExpressReq,
  initExpress,
  mergeEndpointGroups,
  prepareResponse
};
//# sourceMappingURL=index.mjs.map