import * as http from "http";

import { parse as parseContentType } from "fast-content-type-parse";
import { mapValues } from "radash";

import * as multipart from "../internal/multipart";

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
    // the stream was already consumed (e.g. by a security handler), there is nothing left to read
    if (req.readableEnded) {
      resolve(Buffer.alloc(0));
      return;
    }

    const bufferChunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => bufferChunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(bufferChunks)));
    req.on("error", (err) => reject(err));
  });
}

/**
 * Parses a request body. When `expectedType` is given, any other content type is rejected with 415.
 */
export function parseBody(
  body: Buffer,
  contentTypeHeader: string,
  config?: RequestBodyConfig,
  expectedType?: string
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

  if (expectedType && contentType.type !== expectedType) {
    const message = `'${contentType.type}' content type is not supported, expected '${expectedType}'`;
    throw new BodyParserError(415, message);
  }

  if (contentType.type === "application/json") {
    const charset = getCharset(contentType.parameters);
    try {
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
      if (!part.name) {
        continue;
      }

      let data: string | File;
      if (part.filename) {
        data = new File([part.data], part.filename, part.type ? { type: part.type } : {});
      } else {
        const rawContentType = part.headers["content-type"];
        let partContentType: ReturnType<typeof parseContentType> | null = null;
        try {
          partContentType = rawContentType ? parseContentType(rawContentType) : null;
        } catch (err) {
          throw new BodyParserError(400, `Invalid content type of part '${part.name}': ${err}`);
        }

        data = Buffer.from(part.data.buffer).toString(getCharset(partContentType?.parameters));
      }

      (mergedItems[part.name] ??= []).push(data);
    }

    return config?.multiValueFormData ? mergedItems : mapValues(mergedItems, (v) => v.at(-1));
  } else if (contentType.type === "application/x-www-form-urlencoded") {
    const data = body.toString(getCharset(contentType.parameters));
    const dataUrl = new URLSearchParams(data);

    const mergedItems: Record<string, string[]> = {};
    for (const [key, value] of dataUrl.entries()) {
      (mergedItems[key] ??= []).push(value);
    }

    return config?.multiValueUrlEncoded ? mergedItems : mapValues(mergedItems, (v) => v.at(-1));
  } else if (contentType.type === "application/octet-stream") {
    return body;
  } else if (contentType.type.startsWith("text/")) {
    return body.toString(getCharset(contentType.parameters));
  } else {
    const message = `'${contentType.type}' content type is not supported`;
    throw new BodyParserError(415, message);
  }
}

function getCharset(parameters?: Record<string, string>): BufferEncoding {
  const charset = parameters?.["charset"] ?? "utf-8";

  if (!Buffer.isEncoding(charset)) {
    throw new BodyParserError(415, `'${charset}' charset is not supported`);
  }

  return charset;
}
