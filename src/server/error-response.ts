import type * as http from "http";

import { z } from "zod";

import { ApiError, type JsonApiErrorItem } from "../errors";
import { BodyParserError } from "./body-parser";
import { formatError, type Logger } from "./logger";
import { PayloadValidationError } from "./validation";

export const INTERNAL_SERVER_ERROR = "Internal server error";

type ErrorResponse = {
  status: number;
  errors: JsonApiErrorItem[];
  headers?: http.OutgoingHttpHeaders;
};

export function sendErrors(
  res: http.ServerResponse,
  { status, errors, headers }: ErrorResponse
): void {
  res
    .writeHead(status, { "content-type": "application/json", ...headers })
    .end(JSON.stringify({ errors }));
}

/**
 * Responds to an error thrown while handling a request. Only `ApiError` and problems with
 * the request are shown to clients, anything else is logged and hidden behind a generic 500.
 */
export function sendErrorResponse(res: http.ServerResponse, err: unknown, logger?: Logger): void {
  // the response has already started (e.g. a failed stream), it can only be aborted
  if (res.headersSent) {
    logger?.error?.(`Failed after the response was sent: ${formatError(err)}`);
    if (!res.writableEnded) {
      res.destroy();
    }
    return;
  }

  sendErrors(res, toErrorResponse(err, logger));
}

function toErrorResponse(err: unknown, logger?: Logger): ErrorResponse {
  if (err instanceof ApiError) {
    return {
      status: err.status,
      errors: Array.isArray(err.errors) ? err.errors : [err.errors],
      ...(err.headers && { headers: err.headers }),
    };
  }
  if (err instanceof BodyParserError) {
    return { status: err.statusCode, errors: [{ detail: err.message }] };
  }
  if (err instanceof PayloadValidationError) {
    return { status: 400, errors: err.errors.map((e) => ({ meta: e })) };
  }

  if (err instanceof z.ZodError) {
    logger?.error?.(
      `Invalid output format to the corresponding defined output schema: ${formatError(err)}`
    );
  } else {
    logger?.error?.(formatError(err));
  }

  // never expose internal details of unexpected errors to clients
  return { status: 500, errors: [{ detail: INTERNAL_SERVER_ERROR }] };
}
