import * as http from "http";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as NodeReadableStream } from "stream/web";

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
import { type DocsViewer, renderDocsPage } from "./internal/docs";
import { formatIncomingRequest, PayloadValidationError } from "./internal/utils";

import {
  ApiError,
  type AppliedSecurity,
  type HttpMethod,
  HttpResponse,
  type LinzEndpoint,
  type LinzEndpointGroup,
  METHODS,
} from "./";

const INTERNAL_SERVER_ERROR = "Internal server error";

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
    viewer: DocsViewer;
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
  /**
   * Registers the catch-all 404 handler (which runs `fallbackHandler` first) after the endpoints.
   * Disable it to mount more routes on the same router after `createApi`,
   * then mount `notFoundHandler(config)` last yourself.
   *
   * @default true
   */
  notFound: boolean;
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

    const defaultStatus = getDefaultStatus(method as HttpMethod, operatorObject.responses);

    app[method as HttpMethod](path, async (req: http.IncomingMessage, res: http.ServerResponse) => {
      try {
        const extensions = {};

        // process auth (if has) before touching the body, any one of the securities must pass
        if (operatorObject.security?.length) {
          await authenticateAny(operatorObject.security, req, extensions);
        }

        // only an endpoint declaring a body reads it, and only in the declared content type
        const body = operatorObject.requestBody
          ? parseBody(
              await collectBody(req),
              req.headers["content-type"] ?? "",
              config?.request,
              operatorObject.requestBody.mimeType
            )
          : undefined;

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
        const usedStatus = result.payload.status ?? defaultStatus;

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
          throw new Error(INTERNAL_SERVER_ERROR);
        }

        // response
        const { body: payloadBody } = result.payload;
        if (payloadBody instanceof Readable || payloadBody instanceof ReadableStream) {
          res.writeHead(usedStatus, {
            "content-type": responseValidator.mimeType,
            ...result.payload.headers,
          });

          // destroys both ends on failure, an error after this point is handled by the guard below
          await pipeline(
            payloadBody instanceof Readable
              ? payloadBody
              : Readable.fromWeb(payloadBody as NodeReadableStream),
            res
          );
        } else {
          const responseBody = responseValidator.parse(result.payload.body);

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
        // the response has already started (e.g. a failed stream), it can only be aborted
        if (res.headersSent) {
          config?.logger?.error?.(`Failed after the response was sent: ${formatError(err)}`);
          if (!res.writableEnded) {
            res.destroy();
          }
          return;
        }

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
            detail: INTERNAL_SERVER_ERROR,
          });

          config?.logger?.error?.(
            `Invalid output format to the corresponding defined output schema: ${formatError(err)}`
          );
        } else {
          // never expose internal details of unexpected errors to clients
          statusCode = 500;
          errors.push({
            detail: INTERNAL_SERVER_ERROR,
          });

          config?.logger?.error?.(formatError(err));
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
    const docTemplate = renderDocsPage(config.docs.viewer, {
      title: config.docs.spec.info.title,
      specUrl: config.docs.specPath,
      theme: config.docs.theme,
    });

    app.get(config.docs.specPath, (req: http.IncomingMessage, res: http.ServerResponse) => {
      res.writeHead(200, { "content-type": "application/json" }).end(specJson);
    });
    app.get(config.docs.docsPath, (req: http.IncomingMessage, res: http.ServerResponse) => {
      res.writeHead(200, { "content-type": "text/html" }).end(docTemplate);
    });
  }

  if (config?.notFound !== false) {
    app.use(notFoundHandler(config));
  }
}

/**
 * Creates the catch-all handler, responding 404 unless `fallbackHandler` has responded.
 * Mount it after every route.
 */
export function notFoundHandler(
  config?: Partial<Pick<CreateApiConfig, "fallbackHandler" | "logger">>
) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      await config?.fallbackHandler?.(req, res);

      if (res.headersSent) {
        return;
      }

      const pathname = (req.url ?? "/").split("?")[0];

      res.writeHead(404, { "content-type": "application/json" }).end(
        JSON.stringify({
          errors: [
            {
              detail: `Cannot find ${req.method} ${pathname}`,
            },
          ],
        })
      );
    } catch (err) {
      config?.logger?.error?.(formatError(err));

      if (!res.headersSent) {
        res
          .writeHead(500, { "content-type": "application/json" })
          .end(JSON.stringify({ errors: [{ detail: INTERNAL_SERVER_ERROR }] }));
      }
    }
  };
}

/**
 * Uses the conventional status (`201` for `post`, `200` otherwise) when it is defined,
 * then the lowest defined 2xx status, then the conventional status.
 */
function getDefaultStatus(method: HttpMethod, responses: LinzEndpoint["responses"]): number {
  const conventionalStatus = method === "post" ? 201 : 200;
  if (conventionalStatus in responses) {
    return conventionalStatus;
  }

  const successStatuses = Object.keys(responses)
    .map(Number)
    .filter((status) => status >= 200 && status < 300)
    .sort((a, b) => a - b);

  return successStatuses[0] ?? conventionalStatus;
}

/**
 * Includes the stack trace in the message itself, since not every logger
 * (e.g. pino) keeps extra arguments that do not match a format placeholder.
 */
function formatError(err: unknown): string {
  return err instanceof Error ? (err.stack ?? String(err)) : String(err);
}

/**
 * Follows OpenAPI semantics where the listed security requirements are alternatives.
 * Each attempt gets its own extensions object so a failed attempt cannot leak partial state.
 * Throws the first failure when none of them passes.
 */
async function authenticateAny(
  securities: AppliedSecurity[],
  req: http.IncomingMessage,
  extensions: Record<string, any>
): Promise<void> {
  let firstError: unknown;

  for (const secOp of securities) {
    const attemptExtensions = {};
    try {
      await secOp.authenticate(req, attemptExtensions);
      Object.assign(extensions, attemptExtensions);
      return;
    } catch (err) {
      firstError ??= err;
    }
  }

  throw firstError;
}
