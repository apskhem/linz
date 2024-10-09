import { Request, Response } from "express";
import { compact, isEmpty } from "lodash";

import { HTTPRequest, LinzEndpoint, ValidationError } from ".";

export function formatExpressReq(req: Request, validator: LinzEndpoint): Readonly<HTTPRequest> {
  const errors = {} as ConstructorParameters<typeof ValidationError>[0];

  const body = tryCatch(
    () => validator.requestBody?.parse(req.body) || req.body,
    (err: any) => (errors["body"] = JSON.parse(err.message))
  );
  const queries = tryCatch(
    () => validator.parameters?.query?.parse(req.query) || req.query,
    (err: any) => (errors["queries"] = JSON.parse(err.message))
  );
  const params = tryCatch(
    () => validator.parameters?.path?.parse(req.params) || req.params,
    (err: any) => (errors["params"] = JSON.parse(err.message))
  );
  const headers = tryCatch(
    () => validator.parameters?.header?.parse(req.headers) || req.headers,
    (err: any) => (errors["headers"] = JSON.parse(err.message))
  );
  const cookies = tryCatch(
    () => validator.parameters?.cookie?.parse(req.cookies) || req.cookies,
    (err: any) => (errors["cookies"] = JSON.parse(err.message))
  );

  if (!isEmpty(errors)) {
    throw new ValidationError(errors);
  }

  return {
    body: body ?? null,
    queries: (queries as Record<string, string>) ?? {},
    params: (params as Record<string, string>) ?? {},
    headers: (headers as Record<string, string>) ?? {},
    cookies: (cookies as Record<string, string>) ?? {}
  };
}

export function responseExpressError(res: Response, statusCode: number, message: string): void {
  res
    .status(statusCode)
    .contentType("application/json")
    .send({ statusCode, message });
}

type PreparedResponse = {
  contentType: string;
  body: string | Buffer;
};

export function prepareResponse<T>(body: T): PreparedResponse {
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
      body: Array.from(body)
        .map((item) => item.map(encodeURIComponent).join("="))
        .join("&")
    };
  }

  return {
    contentType: "text/plain",
    body: String(body)
  };
}

export function convertPathParams(path: string): { path: string, params: string[] } {
  const paramRegex = /:([^/]+)/g;

  const newPath = cleanPath(path).replace(paramRegex, "{$1}");

  const paramNames = [];
  let match: RegExpExecArray | null = null;
  while ((match = paramRegex.exec(path)) !== null) {
    paramNames.push(match[1]);
  }

  return {
    path: newPath,
    params: compact(paramNames)
  };
}

export function cleanPath(path: string): string {
  return path.replace(/\/+/gi, "/");
}

function tryCatch<T>(fn: () => T, handler: (err: unknown) => void): T | null {
  try {
    return fn();
  } catch (err: unknown) {
    handler(err);
    return null;
  }
}
