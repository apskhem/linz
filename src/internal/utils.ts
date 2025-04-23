import * as http from "http";

import { type HTTPRequest, type LinzEndpoint } from "../core";

type AdditionalRequestObjects = {
  body: any;
  query: any;
  params: any;
  cookies: any;
};

export function formatIncomingRequest(
  req: http.IncomingMessage & AdditionalRequestObjects,
  res: http.ServerResponse,
  validator: LinzEndpoint
): Readonly<HTTPRequest> | null {
  const errors = [] as any[];

  const resultBody = validator.requestBody?.body.safeParse(req.body);
  if (resultBody.error) {
    errors.push({
      in: "body",
      result: resultBody.error.errors,
    });
  }
  const resultQuery = validator.parameters?.query?.safeParse(req.query);
  if (resultQuery?.error) {
    errors.push({
      in: "queries",
      result: resultQuery.error.errors,
    });
  }
  const resultPath = validator.parameters?.path?.safeParse(req.params);
  if (resultPath?.error) {
    errors.push({
      in: "params",
      result: resultPath.error.errors,
    });
  }
  const resultHeader = validator.parameters?.header?.safeParse(req.headers);
  if (resultHeader?.error) {
    errors.push({
      in: "headers",
      result: resultHeader.error.errors,
    });
  }
  const resultCookie = validator.parameters?.cookie?.safeParse(req.cookies);
  if (resultCookie?.error) {
    errors.push({
      in: "cookies",
      result: resultCookie.error.errors,
    });
  }

  if (errors.length) {
    res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify(errors));

    return null;
  }

  return {
    body: resultBody?.data ?? null,
    queries: (resultQuery?.data as HTTPRequest["queries"]) ?? {},
    params: (resultPath?.data as HTTPRequest["params"]) ?? {},
    headers: (resultHeader?.data as HTTPRequest["headers"]) ?? {},
    cookies: (resultCookie?.data as HTTPRequest["cookies"]) ?? {},
  };
}

export function responseError(
  res: http.ServerResponse,
  statusCode: number,
  message: string,
  loggerScope?: string
): void {
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

export function convertPathParams(path: string): { path: string; params: string[] } {
  const paramRegex = /:([^/]+)/g;

  const newPath = cleanPath(path).replace(paramRegex, "{$1}");

  const paramNames: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = paramRegex.exec(path)) !== null) {
    paramNames.push(match[1]!);
  }

  return {
    path: newPath,
    params: paramNames,
  };
}

export function cleanPath(path: string): string {
  return path.replace(/\/+/gi, "/");
}
