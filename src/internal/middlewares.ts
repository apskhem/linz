import * as http from "http";

import { parse as parseContentType } from "fast-content-type-parse";

import * as multipart from "./multipart";

export class MiddlewareError extends Error {
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

export function parseBody(body: Buffer, contentTypeHeader: string): any | null {
  let contentType: ReturnType<typeof parseContentType>;
  try {
    contentType = parseContentType(contentTypeHeader ?? "");
  } catch (err) {
    throw new MiddlewareError(400, String(err));
  }

  if (!body.length) {
    return null;
  } else if (contentType.type === "application/json") {
    try {
      JSON.parse(body.toString((contentType.parameters["charset"] as BufferEncoding) ?? "utf-8"));
    } catch (err) {
      throw new MiddlewareError(400, "Invalid JSON");
    }
  } else if (contentType.type === "multipart/form-data") {
    const boundary = contentType.parameters["boundary"]?.trim().replace(/^["']|["']$/g, "");

    if (!boundary) {
      throw new MiddlewareError(400, "Cannot find multipart boundary");
    }

    const parts = multipart.parse(body, boundary);

    const mergedItems: Record<string, (string | File)[]> = {};
    for (const part of parts) {
      if (!part.name) {
        continue;
      }

      const data = part.filename
        ? new File(
            [part.data],
            part.filename,
            part.type
              ? {
                  type: part.type,
                }
              : {}
          )
        : part.data.toString("utf-8");

      (mergedItems[part.name] ??= []).push(data);
    }

    return mergedItems;
  } else if (contentType.type === "application/x-www-form-urlencoded") {
    const data = body.toString((contentType.parameters["charset"] as BufferEncoding) ?? "utf-8");
    const dataUrl = new URLSearchParams(data);

    const mergedItems: Record<string, string[]> = {};
    for (const [key, value] of dataUrl.entries()) {
      (mergedItems[key] ??= []).push(value);
    }

    return mergedItems;
  } else if (contentType.type === "application/octet-stream") {
    return body;
  } else {
    const message = `'${contentType.type}' content type is not supported`;
    throw new MiddlewareError(415, message);
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
