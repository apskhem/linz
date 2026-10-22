import type { z } from "zod";

import type { HTTPMessage, LinzEndpoint } from "../endpoint";

function fmtError(err: unknown): string {
  try {
    return JSON.parse(String(err));
  } catch {
    return String(err);
  }
}

export class PayloadValidationError extends Error {
  errors: { in: keyof HTTPMessage; result: any }[] = [];

  constructor() {
    super();
  }

  addIssue(issue: PayloadValidationError["errors"][number]) {
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
  const errors = new PayloadValidationError();

  let resultBody;
  try {
    resultBody = validator.requestBody?.body.safeParse(message.body);
    if (resultBody?.error) {
      errors.addIssue({
        in: "body",
        result: resultBody.error.issues,
      });
    }
  } catch (error) {
    errors.addIssue({
      in: "body",
      result: fmtError(error),
    });
  }

  let resultQuery;
  try {
    resultQuery = validator.parameters?.query?.safeParse(message.queries);
    if (resultQuery?.error) {
      errors.addIssue({
        in: "queries",
        result: resultQuery.error.issues,
      });
    }
  } catch (error) {
    errors.addIssue({
      in: "queries",
      result: fmtError(error),
    });
  }

  let resultPath;
  try {
    resultPath = validator.parameters?.path?.safeParse(message.params);
    if (resultPath?.error) {
      errors.addIssue({
        in: "params",
        result: resultPath.error.issues,
      });
    }
  } catch (error) {
    errors.addIssue({
      in: "params",
      result: fmtError(error),
    });
  }

  let resultHeader;
  try {
    const headerSchema = validator.parameters?.header;
    resultHeader = headerSchema?.safeParse(matchHeaderNames(message.headers, headerSchema));
    if (resultHeader?.error) {
      errors.addIssue({
        in: "headers",
        result: resultHeader.error.issues,
      });
    }
  } catch (error) {
    errors.addIssue({
      in: "headers",
      result: fmtError(error),
    });
  }

  let resultCookie;
  try {
    resultCookie = validator.parameters?.cookie?.safeParse(message.cookies);
    if (resultCookie?.error) {
      errors.addIssue({
        in: "cookies",
        result: resultCookie.error.issues,
      });
    }
  } catch (error) {
    errors.addIssue({
      in: "cookies",
      result: fmtError(error),
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

/**
 * Node lowercases incoming header names, so the ones declared in the schema are looked up
 * case-insensitively and handed to the validator under their declared names.
 */
function matchHeaderNames(
  headers: Record<string, unknown>,
  schema: z.ZodObject
): Record<string, unknown> {
  const matched = { ...headers };
  for (const name of Object.keys(schema.shape)) {
    const value = headers[name.toLowerCase()];
    if (value !== undefined) {
      matched[name] = value;
    }
  }
  return matched;
}
