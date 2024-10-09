import { Request, Response, NextFunction } from "express";
import { responseExpressError } from "internal-utils";

export function expressBodyParser(req: Request, res: Response, next: NextFunction): void {
  const bufferChunks: Buffer[] = [];

  req.on("data", (chunk: Buffer) => bufferChunks.push(chunk));

  req.on("end", () => {
    const body = Buffer.concat(bufferChunks);

    if (req.method === "GET") {
      return next();
    } else if (req.headers["content-type"] === "application/json") {
      try {
        if (body.length) {
          req.body = JSON.parse(body.toString("utf-8"));
        }
      } catch (err) {
        return responseExpressError(res, 400, "Invalid JSON");
      }

      return next();
    } else {
      return responseExpressError(res, 415, `'${req.headers["content-type"]}' content type is not supported`);
    }
  });

  req.on("error", (err) => {
    responseExpressError(res, 500, "Server Error");
  });
}
