import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { Readable } from "stream";
import * as url from "url";

import { Router } from "@routejs/router";
import cors, { type CorsOptions } from "cors";
import type { OpenAPIV3 } from "openapi-types";

import { bodyParserMiddleware, parseCookies } from "./internal/middlewares";
import { formatIncomingRequest, responseError } from "./internal/utils";

import {
  ApiError,
  FormDataBody,
  type HttpMethod,
  HttpResponse,
  type LinzEndpointGroup,
  METHODS,
  ValidationError
} from "./";

const JSON_HEADER: http.OutgoingHttpHeaders = {
  "content-type": "application/json"
};

type CreateApiConfig = {
  cors: boolean | CorsOptions;
  docs: {
    viewer: "scalar" | "swagger" | "redoc" | "rapidoc" | "spotlight-elements";
    spec: OpenAPIV3.Document;
    docsPath: string;
    specPath: string;
    theme?: string;
  },
  fallbackHandler: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
};

export function createApi(
  app: Router,
  endpoints: LinzEndpointGroup,
  config?: Partial<CreateApiConfig>
) {
  if (config?.cors) {
    app.use(cors(typeof config.cors === "boolean" ? {} : config.cors));
  }

  app.use(bodyParserMiddleware);

  console.log(`[server]: Registering ${Object.keys(endpoints).length} endpoints...`);

  const registeredOpId = new Set<string>();
  for (const [ methodPath, operatorObject ] of Object.entries(endpoints)) {
    const [ method = "", ...pathParts ] = methodPath.split(":");
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

    app[method as HttpMethod](path, async (req: http.IncomingMessage, res: http.ServerResponse) => {
      const parsedUrl = url.parse(req.url || "", true);

      Object.assign(req, {
        query: parsedUrl.query,
        cookies: parseCookies(req.headers.cookie)
      });

      const extensions = {};

      try {
        // validate
        const validatedReq = formatIncomingRequest(req as any, operatorObject);

        // process auth (if has) sequentially
        if (operatorObject.security?.length) {
          for (const secOp of operatorObject.security) {
            await secOp.inner.handler(validatedReq, extensions);
          }
        }

        // process main handler
        const tmpResult = await operatorObject.handler(validatedReq, extensions);
        const result = tmpResult instanceof HttpResponse ? tmpResult : new HttpResponse({ body: tmpResult });
        const usedStatus = result.payload.status ?? (method === "post" ? 201 : 200);

        // validate result
        const responseValidator = operatorObject.responses[usedStatus] || operatorObject.responses["default"];

        if (!responseValidator || typeof responseValidator === "boolean" || typeof responseValidator === "string") {
          console.error(
            `[error]: There is no corresponding validator defined in schema for status ${usedStatus}/default`
          );
          throw new Error("Internal server error");
        }

        try {
          responseValidator.body.parse(result.payload.body);
        } catch (err) {
          console.error(
            "[error]: Invalid output format to the corresponding defined output schema"
          );
          console.error(String(err));
          throw new Error("Internal server error");
        }

        // response
        if (result.payload.body instanceof Readable || result.payload.body instanceof fs.ReadStream) {
          res.writeHead(usedStatus, result.payload.headers);

          result.payload.body.pipe(res);
        } else {
          if (typeof result.payload.body === "undefined") {
            res
              .writeHead(usedStatus, result.payload.headers)
              .end();
          } else if (responseValidator instanceof FormDataBody) {
            const [ mimeType, body ] = await responseValidator.serializeWithContentType(result.payload.body);

            res
              .writeHead(usedStatus, {
                "content-type": mimeType,
                ...result.payload.headers
              })
              .end(body);
          } else {
            res
              .writeHead(usedStatus, {
                "content-type": responseValidator.mimeType,
                ...result.payload.headers
              })
              .end(await responseValidator.serialize(result.payload.body));
          }
        }
      } catch (err) {
        handleError(err, res);
      }
    });
  }

  // docs config
  if (config?.docs) {
    registerDocumentEndpoints(app, config.docs);
  }

  // fallback
  app.use(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    await config?.fallbackHandler?.(req, res) ?? Promise.resolve(null);

    if (res.headersSent) {
      return;
    }

    const { pathname } = url.parse(req.url || "", true);

    responseError(res, 404, `Cannot find ${req.method} ${pathname}`);
  });
}

function handleError(err: unknown, res: http.ServerResponse) {
  if (err instanceof ApiError) {
    res
      .writeHead(err.status, JSON_HEADER)
      .end(JSON.stringify({
        statusCode: err.status,
        message: err.message
      }));
  } else if (err instanceof ValidationError) {
    res
      .writeHead(400, JSON_HEADER)
      .end(JSON.stringify({
        statusCode: 400,
        message: Object.entries(JSON.parse(err.message)).map(([ k, v ]) => ({
          in: k,
          result: v
        }))
      }));
  } else if (err instanceof Error) {
    console.error(String(err));
    res
      .writeHead(500, JSON_HEADER)
      .end(JSON.stringify({
        statusCode: 500,
        message: err.message
      }));
  } else {
    console.error(String(err));
    res
      .writeHead(500, JSON_HEADER)
      .end(JSON.stringify({
        statusCode: 500,
        message: String(err)
      }));
  }
}

function registerDocumentEndpoints(app: Router, options: CreateApiConfig["docs"]) {
  const specJson = JSON.stringify(options.spec);
  const docTemplate = fs.readFileSync(path.join(__dirname, `./templates/${options.viewer}.hbs`), "utf-8")
    .replace("{{title}}", options.spec.info.title)
    .replace("{{specUrl}}", options.specPath)
    .replace("{{theme}}", options.theme ?? "");

  app.get(options.specPath, (req: http.IncomingMessage, res: http.ServerResponse) => {
    res
      .writeHead(200, { "content-type": "application/json" })
      .end(specJson);
  });
  app.get(options.docsPath, (req: http.IncomingMessage, res: http.ServerResponse) => {
    res
      .writeHead(200, { "content-type": "text/html" })
      .end(docTemplate);
  });
}
