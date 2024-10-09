import * as fs from "fs";
import { Readable } from "stream";

import cors, { type CorsOptions } from "cors";
import type { Express, Response } from "express";
import { expressBodyParser } from "middlewares";

import {
  ApiError,
  HttpMethod,
  HttpResponse,
  LinzEndpoint,
  LinzEndpointGroup,
  METHODS,
  ValidationError
} from "../";
import { formatExpressReq, prepareResponse, responseExpressError } from "../internal-utils";

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

  app.use(expressBodyParser);

  console.log(`[server]: Registering ${Object.keys(endpoints).length} endpoints...`);

  const registeredOpId = new Set<string>();
  for (const [ methodPath, operatorObject ] of Object.entries(endpoints)) {
    const [ method = "", ...pathParts ] = methodPath.split(":");
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

    app[method as HttpMethod](path, async (req, res) => {
      const extensions = {};

      try {
        // validate
        const validatedReq = formatExpressReq(req, operatorObject);

        // process auth (if has) sequentially
        if (operatorObject.security?.length) {
          for (const secOp of operatorObject.security) {
            await secOp.inner.handler(validatedReq, extensions);
          }
        }

        // process main handler
        const result = await operatorObject.handler(validatedReq, extensions);

        // validate result
        const usedStatus = method === "post" ? 201 : 200;
        const validate: LinzEndpoint["responses"][number] | undefined = result instanceof HttpResponse
          ? (
            result.payload.status
              ? operatorObject.responses[result.payload.status] || operatorObject.responses["default"]
              : operatorObject.responses[usedStatus] || operatorObject.responses["default"]
          ) : (
            operatorObject.responses[usedStatus]
              || operatorObject.responses["default"]
          );

        if (!validate || typeof validate === "boolean" || typeof validate === "string") {
          const status = result instanceof HttpResponse ? result.payload.status : usedStatus;

          console.error(
            `[error]: There is no corresponding validator defined in schema for status ${status ?? "default"}`
          );
          throw new Error("Internal server error");
        }

        try {
          validate.parse(result instanceof HttpResponse ? result.payload.body : result);
        } catch (err: unknown) {
          console.error(
            "[error]: Invalid output format to the corresponding defined output schema"
          );
          console.error(String(err));
          throw new Error("Internal server error");
        }

        // prepare response
        const headers = result instanceof HttpResponse ? result.payload.headers : undefined;
        const status = result instanceof HttpResponse ? result.payload.status : undefined;
        const body = result instanceof HttpResponse ? result.payload.body : result;

        if (result instanceof HttpResponse && result.payload.body instanceof Readable) {
          res.header(result.payload.headers);

          return result.payload.body.pipe(res);
        } else {
          const preparedResult = prepareResponse(body);
          const preparedStatus = status ?? usedStatus;

          if (preparedResult) {
            return res
              .contentType(preparedResult.contentType)
              .status(preparedStatus)
              .header(headers)
              .send(preparedResult.body);
          } else {
            return res
              .header(headers)
              .end();
          }
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
    res.status(500).send({
      statusCode: 500,
      message: String(err)
    });
  }
}

function registerDocsEndpoints(app: Express, docPath: string, specFilePath: string) {
  app.get(docPath, (req, res) => {
    res
      .contentType("html")
      .send(fs.readFileSync("dist/index.html"));
  });
  app.get("/openapi.json", (req, res) => {
    res
      .contentType("json")
      .send(fs.readFileSync(specFilePath));
  });
}

function registerNotFoundHandler(app: Express) {
  app.all("*", (req, res) => {
    responseExpressError(res, 404, `Cannot find ${req.method.toUpperCase()} ${req.path}`);
  });
}
