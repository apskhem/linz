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
      
      // collect data
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

      req.body = mergedItems;

      return next();
    } else if (req.headers[HEADER_CONTENT_TYPE] === "application/x-www-form-urlencoded") {
      const data = Buffer.concat(bufferChunks).toString("utf-8");
      const dataUrl = new URLSearchParams(data);

      req.body = Object.fromEntries(
        Array.from(dataUrl.keys()).map((k) => [ k, dataUrl.getAll(k) ])
      );

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
