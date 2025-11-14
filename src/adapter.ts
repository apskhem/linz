import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { Readable } from "stream";

import { Router } from "@routejs/router";
import cors, { type CorsOptions } from "cors";
import type { OpenAPIV3_1 } from "openapi-types";
import { mapValues } from "radash";
import { z } from "zod";

import {
  BodyParserError,
  collectBody,
  parseBody,
  parseCookies,
  type RequestBodyConfig,
} from "./internal/middlewares";
import { formatIncomingRequest, PayloadValidationError } from "./internal/utils";

import { ApiError, type HttpMethod, HttpResponse, type LinzEndpointGroup, METHODS } from "./";

export interface Logger {
  emergency?: (message: string, ...meta: any[]) => void; // Level 0
  alert?: (message: string, ...meta: any[]) => void; // Level 1
  critical?: (message: string, ...meta: any[]) => void; // Level 2
  error?: (message: string, ...meta: any[]) => void; // Level 3
  warning?: (message: string, ...meta: any[]) => void; // Level 4
  notice?: (message: string, ...meta: any[]) => void; // Level 5
  info?: (message: string, ...meta: any[]) => void; // Level 6
  debug?: (message: string, ...meta: any[]) => void; // Level 7
}

export type CreateApiConfig = {
  /**
   * CORS configurations, `true` means permissive CORS.
   */
  cors: boolean | CorsOptions;
  /**
   * Configurations related to OpenAPI documents.
   */
  docs: {
    /**
     * The documents viewer.
     */
    viewer: "scalar" | "swagger" | "redoc" | "rapidoc" | "spotlight-elements";
    /**
     * The OpenAPI spec.
     */
    spec: OpenAPIV3_1.Document;
    /**
     * The path for users to view the docs.
     * The docs will render to the set `viewer`.
     */
    docsPath: string;
    /**
     * The path get the OpenAPI spec file in JSON.
     */
    specPath: string;
    /**
     * The theme configurations for the docs viewer.
     */
    theme?: string;
  };
  /**
   * Incoming requests configurations.
   * Applies to all endpoints.
   */
  request: RequestBodyConfig;
  logger: Logger;
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

  config?.logger?.info?.(`Registering ${Object.keys(endpoints).length} endpoints...`);

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

    config?.logger?.info?.(`${operatorObject.operationId} -> ${method.toUpperCase()} ${path}`);

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

        // parse query string
        const queries = req.url ? new URLSearchParams(req.url.split("?")[1]) : [];
        const mergedQueries: Record<string, string[]> = {};
        for (const [key, value] of queries.entries()) {
          (mergedQueries[key] ??= []).push(value);
        }

        // validate
        const validatedReq = formatIncomingRequest(
          {
            body,
            queries: config?.request?.multiValueQueryString
              ? mergedQueries
              : mapValues(mergedQueries, (v) => v.at(-1)),
            cookies: parseCookies(req.headers.cookie ?? ""),
            params: (req as any).params,
            headers: req.headers,
          },
          operatorObject
        );

        // process main handler
        const tmpResult = await operatorObject.handler(validatedReq, {
          extensions,
          req,
          res,
          ...(operatorObject.security && {
            security: operatorObject.security,
          }),
        });

        if (res.headersSent) {
          return;
        }

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
          config?.logger?.error?.(
            `There is no corresponding validator defined in schema for status ${usedStatus}/default`
          );
          throw new Error("Internal server error");
        }

        // response
        if (
          result.payload.body instanceof Readable ||
          result.payload.body instanceof fs.ReadStream
        ) {
          res.writeHead(usedStatus, result.payload.headers);

          result.payload.body.pipe(res);
        } else {
          const responseBody = responseValidator.body.parse(result.payload.body);

          if (typeof responseBody === "undefined") {
            res.writeHead(usedStatus, result.payload.headers).end();
          } else {
            const out = await responseValidator.serialize(responseBody);

            res
              .writeHead(usedStatus, {
                "content-type": responseValidator.mimeType,
                ...out.headers,
                ...result.payload.headers,
              })
              .end(out.buffer);
          }
        }
      } catch (err) {
        let statusCode: number;
        let errors = [];
        let headers: http.OutgoingHttpHeaders = {};

        if (err instanceof ApiError) {
          statusCode = err.status;
          if (Array.isArray(err.errors)) {
            errors.push(...err.errors);
          } else {
            errors.push(err.errors);
          }
          if (err.headers) {
            headers = err.headers;
          }
        } else if (err instanceof BodyParserError) {
          statusCode = err.statusCode;
          errors.push({
            detail: err.message,
          });
        } else if (err instanceof PayloadValidationError) {
          statusCode = 400;
          errors.push(
            ...err.errors.map((e) => ({
              meta: e,
            }))
          );
        } else if (err instanceof z.ZodError) {
          statusCode = 500;
          errors.push({
            detail: "Internal server error",
          });

          config?.logger?.error?.(
            "Invalid output format to the corresponding defined output schema"
          );
          config?.logger?.error?.(JSON.stringify(err));
        } else if (err instanceof Error) {
          statusCode = 500;
          errors.push({
            detail: err.message,
          });

          config?.logger?.error?.(String(err));
        } else {
          statusCode = 500;
          errors.push({
            detail: String(err),
          });

          config?.logger?.error?.(String(err));
        }

        res
          .writeHead(statusCode, { "content-type": "application/json", ...headers })
          .end(JSON.stringify({ errors }));
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

    const { pathname } = new URL(req.url || "", `http://${req.headers.host}`);

    res.writeHead(404, { "content-type": "application/json" }).end(
      JSON.stringify({
        errors: [
          {
            detail: `Cannot find ${req.method} ${pathname}`,
          },
        ],
      })
    );
  });
}
