import * as fs from "fs";

import { NextFunction, Request, Response } from "express";
import formidable from "formidable";
import { responseExpressError } from "internal-utils";
import { mapValues } from "lodash";

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
      const form = formidable({});
      const [ fields, files ] = await form.parse(req);

      // collect data
      const mergedItems = {} as Record<string, (string | File)[]>;
      for (const [ key, values = [] ] of Object.entries(fields)) {
        mergedItems[key] ??= [];
        mergedItems[key]?.push(...values);
      }
      for (const [ key, values = [] ] of Object.entries(files)) {
        mergedItems[key] ??= [];

        const formattedValues = values.map((v) => {
          const buffer = fs.readFileSync(v.filepath);
          const data = new Uint8Array(buffer);
          const file = new File([ data ], v.originalFilename || v.newFilename, {
            type: v.mimetype || ""
          });
          fs.rmSync(v.filepath);

          return file;
        });

        mergedItems[key]?.push(...formattedValues);
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
        acc.has(x) ? duplicatedKeys.push(x) : acc.add(x);
        return acc;
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
