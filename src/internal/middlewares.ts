import * as http from "http";

import { parse as parseContentType } from "fast-content-type-parse";
import { mapValues } from "radash";

import * as multipart from "./multipart";

/**
 * Configurations for incoming requests.
 */
export type RequestBodyConfig = {
  /**
   * Enables parsing multiple values for a query string.
   * If `false`, only the last value is used.
   *
   * @default false
   */
  multiValueQueryString?: boolean;
  /**
   * Enables parsing multiple values for `multipart/form-data`.
   * If `false`, only the last value is used.
   *
   * @default false
   */
  multiValueFormData?: boolean;
  /**
   * Enables parsing multiple values for `application/x-www-form-urlencoded`.
   * If `false`, only the last value is used.
   *
   * @default false
   */
  multiValueUrlEncoded?: boolean;
};

export class BodyParserError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.statusCode = statusCode;
  }
}

export function collectBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const bufferChunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => bufferChunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(bufferChunks)));
    req.on("error", (err) => reject(err));
  });
}

export function parseBody(
  body: Buffer,
  contentTypeHeader: string,
  config?: RequestBodyConfig
): any | undefined {
  if (!body.length) {
    return undefined;
  }

  let contentType: ReturnType<typeof parseContentType>;
  try {
    contentType = parseContentType(contentTypeHeader ?? "");
  } catch (err) {
    throw new BodyParserError(400, String(err));
  }

  if (contentType.type === "application/json") {
    try {
      const charset = (contentType.parameters["charset"] as BufferEncoding) ?? "utf-8";

      return JSON.parse(body.toString(charset));
    } catch (err) {
      throw new BodyParserError(400, String(err));
    }
  } else if (contentType.type === "multipart/form-data") {
    const boundary = contentType.parameters["boundary"]?.trim().replace(/^["']|["']$/g, "");

    if (!boundary) {
      throw new BodyParserError(400, "Cannot find multipart boundary");
    }

    const parts = multipart.parse(body, boundary);

    const mergedItems: Record<string, (string | File)[]> = {};
    for (const part of parts) {
      const rawContentType = part.headers["content-type"];
      const contentType = rawContentType ? parseContentType(rawContentType) : null;
      const charset = (contentType?.parameters["charset"] as BufferEncoding) ?? "utf-8";

      if (!part.name) {
        continue;
      }

      const data = part.filename
        ? new File([part.data], part.filename, part.type ? { type: part.type } : {})
        : part.data.toString(charset);

      (mergedItems[part.name] ??= []).push(data);
    }

    return config?.multiValueFormData ? mergedItems : mapValues(mergedItems, (v) => v.at(-1));
  } else if (contentType.type === "application/x-www-form-urlencoded") {
    const charset = (contentType?.parameters["charset"] as BufferEncoding) ?? "utf-8";
    const data = body.toString(charset);
    const dataUrl = new URLSearchParams(data);

    const mergedItems: Record<string, string[]> = {};
    for (const [key, value] of dataUrl.entries()) {
      (mergedItems[key] ??= []).push(value);
    }

    return config?.multiValueUrlEncoded ? mergedItems : mapValues(mergedItems, (v) => v.at(-1));
  } else if (contentType.type === "application/octet-stream") {
    return body;
  } else {
    const message = `'${contentType.type}' content type is not supported`;
    throw new BodyParserError(415, message);
  }
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(";").reduce(
    (cookies, cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      if (!name) {
        return cookies;
      }
      cookies[name] = decodeURIComponent(rest.join("="));
      return cookies;
    },
    {} as Record<string, string>
  );
}
