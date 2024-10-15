import { NextFunction, Request, Response } from "express";
import { mapValues } from "lodash";

import * as multipart from "./multipart";
import { responseExpressError } from "./utils";

const HEADER_CONTENT_TYPE = "content-type";

export function expressBodyParser(req: Request, res: Response, next: NextFunction): void {
  const bufferChunks: Buffer[] = [];

  req.on("data", (chunk: Buffer) => bufferChunks.push(chunk));

  req.on("end", async () => {
    if (req.method === "GET") {
      return next();
    } else if (req.headers[HEADER_CONTENT_TYPE] === "application/json") {
      const rawBody = Buffer.concat(bufferChunks);

      try {
        if (rawBody.length) {
          req.body = JSON.parse(rawBody.toString("utf-8"));
        }
      } catch (err) {
        return responseExpressError(res, 400, "Invalid JSON");
      }

      return next();
    } else if (req.headers[HEADER_CONTENT_TYPE]?.startsWith("multipart/form-data")) {
      const rawBody = Buffer.concat(bufferChunks);

      const boundary = multipart.getBoundary(req.headers["content-type"]);

      if (!boundary) {
        return responseExpressError(res, 400, "Cannot find multipart boundary");
      }

      const parts = multipart.parse(rawBody, boundary);
      
      const mergedItems = {} as Record<string, (string | File)[]>;
      for (const part of parts) {
        if (!part.name) {
          continue;
        }

        const data = part.filename
          ? new File([ part.data ], part.filename, part.type ? {
            type: part.type
          } : {})
          : part.data.toString("utf-8");

        (mergedItems[part.name] ??= []).push(data);
      }

      // validate
      const err = [];
      for (const [ key, values = [] ] of Object.entries(mergedItems)) {
        if (values.length > 1) {
          err.push({
            field: key,
            message: "Duplicated key"
          });
        }
      }
      if (err.length) {
        return responseExpressError(
          res,
          400,
          JSON.stringify({
            in: "body",
            result: err.map(({ field, message }) => ({
              path: [ field ],
              message
            }))
          })
        );
      }
      
      req.body = mapValues(mergedItems, (v) => v[0]);

      return next();
    } else if (req.headers[HEADER_CONTENT_TYPE] === "application/x-www-form-urlencoded") {
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
        return responseExpressError(
          res,
          400,
          JSON.stringify({
            in: "body",
            result: duplicatedKeys.map((fieldName) => ({
              path: [ fieldName ],
              message: "Duplicated key"
            }))
          })
        );
      }

      req.body = Object.fromEntries(dataUrl);

      return next();
    } else if (req.headers[HEADER_CONTENT_TYPE] === "application/octet-stream") {
      req.body = Buffer.concat(bufferChunks);

      return next();
    } else {
      return responseExpressError(res, 415, `'${req.headers[HEADER_CONTENT_TYPE]}' content type is not supported`);
    }
  });

  req.on("error", (err) => {
    responseExpressError(res, 500, String(err));
  });
}
