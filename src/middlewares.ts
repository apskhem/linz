import { Request, Response, NextFunction } from "express";
import { responseExpressError } from "internal-utils";

export function expressBodyParser(req: Request, res: Response, next: NextFunction): void {
  const bufferChunks: Buffer[] = [];

  req.on("data", (chunk: Buffer) => bufferChunks.push(chunk));

  req.on("end", () => {
    const body = Buffer.concat(bufferChunks);

    if (req.headers["content-type"] === "application/json") {
      try {
        req.body = body.toJSON();
      } catch (err) {
        responseExpressError(res, 400, "Invalid JSON");
      }
    } else {
      responseExpressError(res, 415, `'${req.headers}' content type is not supported.`);
    }

    next();
  });

  req.on("error", (err) => {
    responseExpressError(res, 500, "Server Error");
  });
}
