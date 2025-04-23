import * as http from "http";

import { mapValues } from "radash";

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
    if (req.method === "GET" || !bufferChunks.length) {
      return next();
    } else if (req.headers["content-type"] === "application/json") {
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
    } else if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
      const rawBody = Buffer.concat(bufferChunks);

      const boundary = multipart.getBoundary(req.headers["content-type"]);

      if (!boundary) {
        return responseError(res, 400, "Cannot find multipart boundary");
      }

      const parts = multipart.parse(rawBody, boundary);

      const mergedItems = {} as Record<string, (string | File)[]>;
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

      // validate
      const err = [];
      for (const [key, values = []] of Object.entries(mergedItems)) {
        if (values.length > 1) {
          err.push({
            field: key,
            message: "Duplicated key",
          });
        }
      }
      if (err.length) {
        return responseError(
          res,
          400,
          JSON.stringify({
            in: "body",
            result: err.map(({ field, message }) => ({
              path: [field],
              message,
            })),
          })
        );
      }

      Object.assign(req, {
        body: mapValues(mergedItems, (v) => v[0]),
      });

      return next();
    } else if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
      const data = Buffer.concat(bufferChunks).toString("utf-8");
      const dataUrl = new URLSearchParams(data);

      const duplicatedKeys: string[] = [];
      Array.from(dataUrl.keys()).reduce((acc, x) => {
        if (acc.has(x)) {
          duplicatedKeys.push(x);
        }
        return acc.add(x);
      }, new Set<string>());

      if (duplicatedKeys.length) {
        return responseError(
          res,
          400,
          JSON.stringify({
            in: "body",
            result: duplicatedKeys.map((fieldName) => ({
              path: [fieldName],
              message: "Duplicated key",
            })),
          })
        );
      }

      Object.assign(req, {
        body: Object.fromEntries(dataUrl),
      });

      return next();
    } else if (req.headers["content-type"] === "application/octet-stream") {
      Object.assign(req, {
        body: Buffer.concat(bufferChunks),
      });

      return next();
    } else {
      return responseError(
        res,
        415,
        `'${req.headers["content-type"]}' content type is not supported`
      );
    }
  });

  req.on("error", (err) => {
    responseError(res, 500, String(err));
  });
}

export function parseCookies(cookieHeader = "") {
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
