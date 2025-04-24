import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { Readable } from "stream";
import * as url from "url";

import { Router } from "@routejs/router";
import cors, { type CorsOptions } from "cors";
import type { OpenAPIV3_1 } from "openapi-types";

import { collectBody, MiddlewareError, parseBody, parseCookies } from "./internal/middlewares";
import { formatIncomingRequest, responseError } from "./internal/utils";

import { ApiError, type HttpMethod, HttpResponse, type LinzEndpointGroup, METHODS } from "./";

type CreateApiConfig = {
  /**
   * CORS configurations, `true` means permissive CORS.
   */
  cors: boolean | CorsOptions;
  docs: {
    viewer: "scalar" | "swagger" | "redoc" | "rapidoc" | "spotlight-elements";
    spec: OpenAPIV3_1.Document;
    docsPath: string;
    specPath: string;
    theme?: string;
  };
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

  console.log(`[server]: Registering ${Object.keys(endpoints).length} endpoints...`);

  const registeredOpId = new Set<string>();
  for (const [methodPath, operatorObject] of Object.entries(endpoints)) {
    const [method = "", ...pathParts] = methodPath.split(":");
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
      try {
        const bodyBuffer = await collectBody(req);
        const body = parseBody(bodyBuffer, req.headers["content-type"] ?? "");

        const extensions = {};

        // process auth (if has) sequentially
        if (operatorObject.security?.length) {
          for (const secOp of operatorObject.security) {
            await secOp.authenticate(req, extensions);
          }
        }

        // validate
        const validatedReq = formatIncomingRequest(
          {
            body: body,
            query: url.parse(req.url || "", true).query,
            cookies: parseCookies(req.headers.cookie ?? ""),
            params: (req as any).params,
            headers: req.headers,
          },
          res,
          operatorObject
        )!;

        // process main handler
        const tmpResult = await operatorObject.handler(validatedReq, {
          extensions,
          req,
          res,
          ...(operatorObject.security && {
            security: operatorObject.security,
          }),
        });
        const result =
          tmpResult instanceof HttpResponse ? tmpResult : new HttpResponse({ body: tmpResult });
        const usedStatus = result.payload.status ?? (method === "post" ? 201 : 200);

        // validate result
        const responseValidator =
          operatorObject.responses[usedStatus] || operatorObject.responses["default"];

        if (
          !responseValidator ||
          typeof responseValidator === "boolean" ||
          typeof responseValidator === "string"
        ) {
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
        if (
          result.payload.body instanceof Readable ||
          result.payload.body instanceof fs.ReadStream
        ) {
          res.writeHead(usedStatus, result.payload.headers);

          result.payload.body.pipe(res);
        } else if (typeof result.payload.body === "undefined") {
          res.writeHead(usedStatus, result.payload.headers).end();
        } else {
          const out = await responseValidator.serialize(result.payload.body);

          res
            .writeHead(usedStatus, {
              "content-type": responseValidator.mimeType,
              ...out.headers,
              ...result.payload.headers,
            })
            .end(out.buffer);
        }
      } catch (err) {
        let statusCode: number;
        let message: string;

        if (err instanceof ApiError) {
          statusCode = err.status;
          message = err.message;
        } else if (err instanceof MiddlewareError) {
          statusCode = err.statusCode;
          message = err.message;
        } else if (err instanceof Error) {
          statusCode = 500;
          message = err.message;
          console.error(String(err));
        } else {
          statusCode = 500;
          message = String(err);
          console.error(String(err));
        }

        res.writeHead(statusCode, { "content-type": "application/json" }).end(
          JSON.stringify({
            statusCode,
            message,
          })
        );
      }
    });
  }

  // docs config
  if (config?.docs) {
    const specJson = JSON.stringify(config.docs.spec);
    const docTemplate = fs
      .readFileSync(path.join(__dirname, `./templates/${config.docs.viewer}.hbs`), "utf-8")
      .replace("{{title}}", config.docs.spec.info.title)
      .replace("{{specUrl}}", config.docs.specPath)
      .replace("{{theme}}", config.docs.theme ?? "");

    app.get(config.docs.specPath, (req: http.IncomingMessage, res: http.ServerResponse) => {
      res.writeHead(200, { "content-type": "application/json" }).end(specJson);
    });
    app.get(config.docs.docsPath, (req: http.IncomingMessage, res: http.ServerResponse) => {
      res.writeHead(200, { "content-type": "text/html" }).end(docTemplate);
    });
  }

  // fallback
  app.use(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    await config?.fallbackHandler?.(req, res);

    if (res.headersSent) {
      return;
    }

    const { pathname } = url.parse(req.url || "", true);

    responseError(res, 404, `Cannot find ${req.method} ${pathname}`);
  });
}
