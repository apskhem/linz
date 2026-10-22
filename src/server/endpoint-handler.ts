import type * as http from "http";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as NodeReadableStream } from "stream/web";

import { mapValues } from "radash";

import type { HttpMethod, HTTPMessage, LinzEndpoint } from "../endpoint";
import { HttpResponse } from "../response";
import { authenticateAny } from "../security";
import { collectBody, parseBody, type RequestBodyConfig } from "./body-parser";
import { parseCookies } from "./cookies";
import type { CreateApiConfig } from "./config";
import { INTERNAL_SERVER_ERROR, sendErrorResponse } from "./error-response";
import type { Logger } from "./logger";
import { formatIncomingRequest } from "./validation";

/**
 * Creates the request handler of one endpoint: authenticates, reads and validates the
 * request, runs the endpoint handler, then validates and sends its result.
 */
export function createEndpointHandler(
  method: HttpMethod,
  operation: LinzEndpoint,
  config?: Partial<CreateApiConfig>
) {
  const defaultStatus = getDefaultStatus(method, operation.responses);

  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const extensions = {};

      // process auth (if has) before touching the body, any one of the securities must pass
      if (operation.security?.length) {
        await authenticateAny(operation.security, req, extensions);
      }

      const message = await readRequest(req, operation, config?.request);

      const handlerResult = await operation.handler(message, {
        extensions,
        req,
        res,
        ...(operation.security && {
          security: operation.security,
        }),
      });

      // the handler has responded by itself
      if (res.headersSent) {
        return;
      }

      const result =
        handlerResult instanceof HttpResponse
          ? handlerResult
          : new HttpResponse({ body: handlerResult });

      await sendResult(res, result, operation, defaultStatus, config?.logger);
    } catch (err) {
      sendErrorResponse(res, err, config?.logger);
    }
  };
}

async function readRequest(
  req: http.IncomingMessage,
  operation: LinzEndpoint,
  requestConfig?: RequestBodyConfig
): Promise<Readonly<HTTPMessage>> {
  // only an endpoint declaring a body reads it, and only in the declared content type
  const body = operation.requestBody
    ? parseBody(
        await collectBody(req),
        req.headers["content-type"] ?? "",
        requestConfig,
        operation.requestBody.mimeType
      )
    : undefined;

  return formatIncomingRequest(
    {
      body,
      queries: parseQueries(req.url, requestConfig),
      cookies: parseCookies(req.headers.cookie ?? ""),
      params: (req as any).params,
      headers: req.headers,
    },
    operation
  );
}

function parseQueries(
  url: string | undefined,
  requestConfig?: RequestBodyConfig
): Record<string, string | string[] | undefined> {
  const mergedQueries: Record<string, string[]> = {};
  for (const [key, value] of new URLSearchParams(url?.split("?")[1]).entries()) {
    (mergedQueries[key] ??= []).push(value);
  }

  return requestConfig?.multiValueQueryString
    ? mergedQueries
    : mapValues(mergedQueries, (v) => v.at(-1));
}

async function sendResult(
  res: http.ServerResponse,
  result: HttpResponse<unknown>,
  operation: LinzEndpoint,
  defaultStatus: number,
  logger?: Logger
): Promise<void> {
  const status = result.payload.status ?? defaultStatus;
  const responseBody = operation.responses[status] || operation.responses["default"];

  if (!responseBody || typeof responseBody === "boolean" || typeof responseBody === "string") {
    logger?.error?.(
      `There is no corresponding validator defined in schema for status ${status}/default`
    );
    throw new Error(INTERNAL_SERVER_ERROR);
  }

  const { body, headers } = result.payload;

  if (body instanceof Readable || body instanceof ReadableStream) {
    res.writeHead(status, { "content-type": responseBody.mimeType, ...headers });

    // destroys both ends on failure, the error is then handled by `sendErrorResponse`
    await pipeline(
      body instanceof Readable ? body : Readable.fromWeb(body as NodeReadableStream),
      res
    );
    return;
  }

  const parsedBody = responseBody.parse(body);

  if (typeof parsedBody === "undefined") {
    res.writeHead(status, headers).end();
    return;
  }

  const out = await responseBody.serialize(parsedBody);

  res
    .writeHead(status, {
      "content-type": responseBody.mimeType,
      ...out.headers,
      ...headers,
    })
    .end(out.buffer);
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
