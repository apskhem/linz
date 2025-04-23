import * as http from "http";

import { parse as parseContentType } from "fast-content-type-parse";

import * as multipart from "./multipart";
import { responseError } from "./utils";

export function bodyParserMiddleware(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => any
): void {
  const bufferChunks: Buffer[] = [];

  req.on("data", (chunk: Buffer) => bufferChunks.push(chunk));

  req.on("end", async () => {
    let contentType: ReturnType<typeof parseContentType>;
    try {
      contentType = parseContentType(req.headers["content-type"] ?? "");
    } catch (err) {
      responseError(res, 400, String(err));
      return;
    }

    if (!bufferChunks.length) {
      return next();
    } else if (contentType.type === "application/json") {
      const rawBody = Buffer.concat(bufferChunks);

      try {
        if (rawBody.length) {
          Object.assign(req, {
            body: JSON.parse(rawBody.toString("utf-8")),
          });
        }
      } catch (err) {
        return responseError(res, 400, "Invalid JSON");
      }

      return next();
    } else if (contentType.type === "multipart/form-data") {
      const rawBody = Buffer.concat(bufferChunks);

      const boundary = contentType.parameters["boundary"]?.trim().replace(/^["']|["']$/g, "");

      if (!boundary) {
        return responseError(res, 400, "Cannot find multipart boundary");
      }

      const parts = multipart.parse(rawBody, boundary);

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

      Object.assign(req, {
        body: mergedItems,
      });

      return next();
    } else if (contentType.type === "application/x-www-form-urlencoded") {
      const data = Buffer.concat(bufferChunks).toString("utf-8");
      const dataUrl = new URLSearchParams(data);

      const mergedItems: Record<string, string[]> = {};
      for (const [key, value] of dataUrl.entries()) {
        (mergedItems[key] ??= []).push(value);
      }

      Object.assign(req, {
        body: mergedItems,
      });

      return next();
    } else if (contentType.type === "application/octet-stream") {
      Object.assign(req, {
        body: Buffer.concat(bufferChunks),
      });

      return next();
    } else {
      const message = `'${contentType.type}' content type is not supported`;
      return responseError(res, 415, message);
    }
  });

  req.on("error", (err) => {
    responseError(res, 500, String(err));
  });
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
