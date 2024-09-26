"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ApiError: () => ApiError,
  HttpResponse: () => HttpResponse,
  METHODS: () => METHODS,
  Security: () => Security,
  ValidationError: () => ValidationError,
  applyGroupConfig: () => applyGroupConfig,
  buildJson: () => buildJson,
  convertPathParams: () => convertPathParams,
  endpoint: () => endpoint,
  formatExpressReq: () => formatExpressReq,
  initExpress: () => initExpress,
  mergeEndpointGroups: () => mergeEndpointGroups,
  prepareResponse: () => prepareResponse
});
module.exports = __toCommonJS(src_exports);

// src/adapter/engine-express.ts
var fs = __toESM(require("fs"));
var import_stream = require("stream");
var import_body_parser = __toESM(require("body-parser"));
var import_cors = __toESM(require("cors"));
var import_formidable = __toESM(require("formidable"));
var import_lodash2 = require("lodash");

// src/utils.ts
var import_lodash = require("lodash");
function mergeEndpointGroups(prefix, groups) {
  const readKeys = [];
  for (const group of groups) {
    const keys = Object.keys(group).map((key) => cleanPath(`${prefix}${key}`));
    const dupKeys = (0, import_lodash.intersection)(readKeys, keys);
    if (dupKeys.length) {
      throw new Error(`Duplication keys occured: ${dupKeys.join(", ")}`);
    }
    readKeys.push(...keys);
  }
  return (0, import_lodash.mapKeys)((0, import_lodash.merge)({}, ...groups), (v, k) => cleanPath(k.replace(/:/, `:${prefix}`)));
}
function applyGroupConfig(group, config) {
  return (0, import_lodash.mapValues)(group, (v) => ({ ...config, ...v }));
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
  if (!(0, import_lodash.isEmpty)(errors)) {
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
    params: (0, import_lodash.compact)(paramNames)
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
    app.use((0, import_cors.default)());
  }
  app.use(import_body_parser.default.json());
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
        const form = (0, import_formidable.default)({});
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
        req.body = (0, import_lodash2.mapValues)(mergedItems, (v) => v[0]);
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
          if (result.body instanceof import_stream.Readable) {
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
var import_zod_openapi = require("@anatine/zod-openapi");
var import_lodash3 = require("lodash");
var import_zod = require("zod");
var API_ERROR_COMPONENT_NAME = "ApiError";
var GeneralErrorSchema = import_zod.z.object({
  statusCode: import_zod.z.number().int().min(100).max(599),
  message: import_zod.z.union([import_zod.z.object({}), import_zod.z.any().array(), import_zod.z.string()])
});
var ValidationErrorSchema = import_zod.z.object({
  statusCode: import_zod.z.number().int().min(100).max(599),
  message: import_zod.z.union([import_zod.z.object({}), import_zod.z.any().array(), import_zod.z.string()])
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
        const { properties = {}, required = [] } = (0, import_zod_openapi.generateSchema)(schema);
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
    const requestBodySchemaName = `${(0, import_lodash3.upperFirst)(operationObject.operationId)}RequestBody`;
    if (operationObject.requestBody) {
      const schema = (0, import_zod_openapi.generateSchema)(operationObject.requestBody);
      schemaComponent[requestBodySchemaName] = operationObject.requestBodyType === "multipart/form-data" ? intoFormDataBody(schema) : schema;
    }
    const responseSchemaName = `${(0, import_lodash3.upperFirst)(operationObject.operationId)}Response`;
    if (operationObject.responses) {
      for (const [status, schema] of Object.entries(operationObject.responses)) {
        if (typeof schema === "object") {
          schemaComponent[responseSchemaName] = (0, import_zod_openapi.generateSchema)(schema);
        }
      }
    }
    pathObject[method] = {
      tags: operationObject.tags?.length ? Object.values(operationObject.tags).map((v) => v.name) : void 0,
      summary: operationObject.summary || operationObject.operationId,
      description: operationObject.description,
      operationId: operationObject.operationId,
      deprecated: operationObject.deprecated,
      parameters: (0, import_lodash3.isEmpty)(parameterObject) ? void 0 : parameterObject,
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
        ...(0, import_lodash3.mapValues)(operationObject.responses, (v) => {
          return {
            description: "[DUMMY]",
            content: typeof v === "boolean" ? intoContentTypeRef("application/json", API_ERROR_COMPONENT_NAME) : intoContentTypeRef("application/json", responseSchemaName)
          };
        }),
        "400": operationObject.requestBody || !(0, import_lodash3.isEmpty)(operationObject.parameters) ? {
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
        [API_ERROR_COMPONENT_NAME]: (0, import_zod_openapi.generateSchema)(GeneralErrorSchema)
      },
      securitySchemes: config.security?.length ? (0, import_lodash3.mapValues)(
        (0, import_lodash3.keyBy)(
          config.security.map((x) => x.inner),
          "name"
        ),
        ({ handler, name, ...o }) => o
      ) : void 0
    },
    tags: config.tags && !(0, import_lodash3.isEmpty)(config.tags) ? Object.values(config.tags) : void 0
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
    properties: (0, import_lodash3.mapValues)(
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=index.js.map