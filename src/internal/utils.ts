import * as http from "http";

import { type HTTPRequest, type LinzEndpoint, ValidationError } from "../core";

type AdditionalRequestObjects = {
  body: any,
  query: any;
  params: any;
  cookies: any;
};

export function formatIncomingRequest(req: http.IncomingMessage & AdditionalRequestObjects, validator: LinzEndpoint): Readonly<HTTPRequest> {
  const errors = {} as ConstructorParameters<typeof ValidationError>[0];

  const body = tryCatch(
    () => validator.requestBody?.body.parse(req.body) || req.body,
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

  if (Object.keys(errors).length) {
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

export function responseError(res: http.ServerResponse, statusCode: number, message: string, loggerScope?: string): void {
  if (typeof loggerScope === "string") {
    if (loggerScope) {
      console.error(`[error:${loggerScope}]: ${message}`);
    } else {
      console.error(`[error]: ${message}`);
    }
  }

  res
    .writeHead(statusCode, { "content-type": "application/json" })
    .end(JSON.stringify({ statusCode, message }));
}

export function convertPathParams(path: string): { path: string, params: string[] } {
  const paramRegex = /:([^/]+)/g;

  const newPath = cleanPath(path).replace(paramRegex, "{$1}");

  const paramNames: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = paramRegex.exec(path)) !== null) {
    paramNames.push(match[1]!);
  }

  return {
    path: newPath,
    params: paramNames
  };
}

export function cleanPath(path: string): string {
  return path.replace(/\/+/gi, "/");
}

function tryCatch<T>(fn: () => T, handler: (err: unknown) => void): T | null {
  try {
    return fn();
  } catch (err) {
    handler(err);
    return null;
  }
}
