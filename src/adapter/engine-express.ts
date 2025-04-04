import * as fs from "fs";
import * as http from "http";
import { Readable } from "stream";
import * as url from "url";

import { Router } from "@routejs/router";
import cors, { type CorsOptions } from "cors";
import type { OpenAPIV3 } from "openapi-types";
import { match } from "path-to-regexp";
import { SCALAR_TEMPLATE } from "templates";

import {
  ApiError,
  FormDataBody,
  type HttpMethod,
  HttpResponse,
  type LinzEndpointGroup,
  METHODS,
  ValidationError
} from "../";
import { expressBodyParser, parseCookies } from "../internal/middlewares";
import { formatExpressReq, responseError } from "../internal/utils";

const DEFAULT_HEADER: http.OutgoingHttpHeaders = {
  "content-type": "application/json"
};

type OpenAPIDocsOptions = {
  vendor: "scalar";
  spec: OpenAPIV3.Document;
  docsPath: string;
  specPath: string;
}

type InitExpressConfig = {
  cors: boolean | CorsOptions;
  docs: OpenAPIDocsOptions
};

export function createApi(
  app: Router,
  endpoints: LinzEndpointGroup,
  config?: Partial<InitExpressConfig>
) {
  if (config?.cors) {
    app.use(cors(typeof config.cors === "boolean" ? {} : config.cors));
  }

  app.use(expressBodyParser);

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
        params: match(path)(parsedUrl.pathname || ""),
        cookies: parseCookies(req.headers.cookie)
      });

      const extensions = {};

      try {
        // validate
        const validatedReq = formatExpressReq(req as any, operatorObject);

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
    registerDocsEndpoints(app, config.docs);
  }

  // fallback
  app.use((req: http.IncomingMessage, res: http.ServerResponse) => {
    const { pathname } = url.parse(req.url || "", true);

    responseError(res, 404, `Cannot find ${req.method} ${pathname}`);
  });
}

function handleError(err: unknown, res: http.ServerResponse) {
  if (err instanceof ApiError) {
    res
      .writeHead(err.status, DEFAULT_HEADER)
      .end(JSON.stringify({
        statusCode: err.status,
        message: err.message
      }));
  } else if (err instanceof ValidationError) {
    res
      .writeHead(400, DEFAULT_HEADER)
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
      .writeHead(500, DEFAULT_HEADER)
      .end(JSON.stringify({
        statusCode: 500,
        message: err.message
      }));
  } else {
    console.error(String(err));
    res
      .writeHead(500, DEFAULT_HEADER)
      .end(JSON.stringify({
        statusCode: 500,
        message: String(err)
      }));
  }
}

function registerDocsEndpoints(app: Router, options: OpenAPIDocsOptions) {
  app.get(options.docsPath, (req: http.IncomingMessage, res: http.ServerResponse) => {
    res
      .writeHead(200, { "content-type": "text/html" })
      .end(
        SCALAR_TEMPLATE
          .replace("{{title}}", options.spec.info.title)
          .replace("{{specUrl}}", options.specPath)
      );
  });
  app.get(options.specPath, (req: http.IncomingMessage, res: http.ServerResponse) => {
    res
      .writeHead(200, { "content-type": "application/json" })
      .end(JSON.stringify(options.spec));
  });
}
