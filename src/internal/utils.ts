import * as http from "http";

import { type HTTPMessage, type LinzEndpoint } from "../core";

export class ValidationError extends Error {
  errors: { in: keyof HTTPMessage; result: any }[] = [];

  constructor() {
    super();
  }

  addIssue(issue: ValidationError["errors"][number]) {
    this.errors.push(issue);
  }

  hasIssue(): boolean {
    return this.errors.length > 0;
  }
}

export function formatIncomingRequest(
  message: Record<keyof HTTPMessage, any>,
  validator: LinzEndpoint
): Readonly<HTTPMessage> {
  const errors = new ValidationError();

  const resultBody = validator.requestBody?.body.safeParse(message.body);
  if (resultBody?.error) {
    errors.addIssue({
      in: "body",
      result: resultBody.error.errors,
    });
  }
  const resultQuery = validator.parameters?.query?.safeParse(message.queries);
  if (resultQuery?.error) {
    errors.addIssue({
      in: "queries",
      result: resultQuery.error.errors,
    });
  }
  const resultPath = validator.parameters?.path?.safeParse(message.params);
  if (resultPath?.error) {
    errors.addIssue({
      in: "params",
      result: resultPath.error.errors,
    });
  }
  const resultHeader = validator.parameters?.header?.safeParse(message.headers);
  if (resultHeader?.error) {
    errors.addIssue({
      in: "headers",
      result: resultHeader.error.errors,
    });
  }
  const resultCookie = validator.parameters?.cookie?.safeParse(message.cookies);
  if (resultCookie?.error) {
    errors.addIssue({
      in: "cookies",
      result: resultCookie.error.errors,
    });
  }

  if (errors.hasIssue()) {
    throw errors;
  }

  return {
    body: resultBody?.data,
    queries: (resultQuery?.data as HTTPMessage["queries"]) ?? {},
    params: (resultPath?.data as HTTPMessage["params"]) ?? {},
    headers: (resultHeader?.data as HTTPMessage["headers"]) ?? {},
    cookies: (resultCookie?.data as HTTPMessage["cookies"]) ?? {},
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
