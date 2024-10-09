import * as fs from "fs";
import { Readable } from "stream";

import bodeParser from "body-parser";
import cors, { CorsOptions } from "cors";
import { Express, Request, Response } from "express";
import formidable from "formidable";
import { mapValues } from "lodash";

import {
  ApiError,
  HttpMethod,
  HttpResponse,
  LinzEndpoint,
  LinzEndpointGroup,
  METHODS,
  ValidationError
} from "../";
import { formatExpressReq, prepareResponse } from "../utils";

type InitExpressConfig = {
  cors: boolean | CorsOptions;
  docs: {
    vendor: "scalar";
    path: string;
    specUrl: string;
  };
};

export function initExpress(
  app: Express,
  endpoints: LinzEndpointGroup,
  config?: Partial<InitExpressConfig>
) {
  if (config?.cors) {
    app.use(cors(typeof config.cors === "boolean" ? {} : config.cors));
  }

  app.use(bodeParser.json());

  console.log(`[server]: Registering ${Object.keys(endpoints).length} endpoints...`);

  const registeredOpId = new Set<string>();
  for (const [ methodPath, operatorObject ] of Object.entries(endpoints)) {
    const [ method = "", ...pathParts ] = methodPath.split(/:/);
    const path = pathParts.join(":");

    if (registeredOpId.has(operatorObject.operationId)) {
      throw new Error(`Duplicate operation ID "${operatorObject.operationId}" for path ${path}`);
    } else {
      registeredOpId.add(operatorObject.operationId);
    }

    if (!METHODS.some((m) => m === method)) {
      throw new Error(`Invalid method "${method}" for path ${path}`);
    }

    console.log(`[register]: ${operatorObject.operationId} -> ${method.toUpperCase()} ${path}`);

    app[method as HttpMethod](path, async (req: Request, res: Response) => {
      const extensions = {};

      // parse body for multipart/form-data
      if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
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
              message: "Duplicate keys"
            });
          }
        }

        if (err.length) {
          return handleError(
            new ValidationError({
              body: err
            }),
            res
          );
        }

        req.body = mapValues(mergedItems, (v) => v[0]);
      }

      try {
        // validate
        const validatedReq = formatExpressReq(req, operatorObject);

        // process auth (if has)
        if (operatorObject.security?.length) {
          for (const secOp of operatorObject.security) {
            await secOp.inner.handler(validatedReq, extensions);
          }
        }

        // process main handler
        const result = await operatorObject.handler(validatedReq, extensions);

        // validate result
        const validate: LinzEndpoint["responses"][number] | undefined = result instanceof HttpResponse
          ? (
            result.status
              ? operatorObject.responses[result.status] || operatorObject.responses["default"]
              : operatorObject.responses[method === "post" ? 201 : 200] || operatorObject.responses["default"]
          ) : (
            operatorObject.responses[method === "post" ? 201 : 200]
              || operatorObject.responses["default"]
          );

        if (!validate || typeof validate === "boolean") {
          console.error(
            `[error]: There is no corresponding validator defined in schema for status ${result?.status ?? "default"}`
          );
          throw new Error("Internal server error");
        }

        try {
          validate.parse(result instanceof HttpResponse ? result.body : result);
        } catch (err: unknown) {
          console.error(
            "[error]: Invalid output format to the corresponding defined output schema"
          );
          console.error(String(err));
          throw new Error("Internal server error");
        }

        // prepare response
        if (result instanceof HttpResponse) {
          // FIXME: right now, support only image stream
          if (result.body instanceof Readable) {
            Object.entries(result.headers ?? {}).map(([ k, v ]) => res.setHeader(k, v));

            result.body.pipe(res);

            return;
          }

          const preparedResult = prepareResponse(result.body);

          return res
            .header(result.headers)
            .status(result.status ?? (method === "post" ? 201 : 200))
            .contentType(preparedResult.contentType)
            .send(preparedResult.body);
        } else {
          const preparedResult = prepareResponse(result);

          return res
            .status(method === "post" ? 201 : 200)
            .contentType(preparedResult.contentType)
            .send(preparedResult.body);
        }
      } catch (err: unknown) {
        return handleError(err, res);
      }
    });
  }

  // docs config
  if (config?.docs) {
    registerDocsEndpoints(app, config.docs.path, config.docs.specUrl);
  }

  // fallback
  registerNotFoundHandler(app);
}

function handleError(err: unknown, res: Response) {
  if (err instanceof ApiError) {
    res.status(err.status).send({
      statusCode: err.status,
      message: err.message
    });
  } else if (err instanceof ValidationError) {
    res.status(400).send({
      statusCode: 400,
      message: Object.entries(JSON.parse(err.message)).map(([ k, v ]) => ({
        in: k,
        result: v
      }))
    });
  } else if (err instanceof Error) {
    console.error(String(err));
    res.status(500).send({
      statusCode: 500,
      message: err.message
    });
  } else {
    console.error(String(err));
    res.status(500).send(String(err));
  }
}

function registerDocsEndpoints(app: Express, docPath: string, specFilePath: string) {
  app.get(docPath, (req, res) => {
    const data = fs.readFileSync("dist/index.html", "utf-8");
    res.contentType("html").send(data);
  });
  app.get("/openapi.json", (req, res) => {
    const data = fs.readFileSync(specFilePath, "utf-8");
    res.contentType("json").send(data);
  });
}

function registerNotFoundHandler(app: Express) {
  app.all("*", (req, res) => {
    res.status(404).send({
      statusCode: 404,
      message: `Cannot find ${req.method.toUpperCase()} ${req.path}`
    });
  });
}
