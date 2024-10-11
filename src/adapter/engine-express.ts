import { Readable } from "stream";

import cors, { type CorsOptions } from "cors";
import type { Express, Response } from "express";
import type { OpenAPIV3 } from "openapi-types";
import { SCALAR_TEMPLATE } from "templates";

import {
  ApiError,
  type HttpMethod,
  HttpResponse,
  type LinzEndpointGroup,
  METHODS,
  ValidationError
} from "../";
import { expressBodyParser } from "../internal/middlewares";
import { formatExpressReq, prepareResponse, responseExpressError } from "../internal/utils";

type OpenAPIDocsOptions = {
  vendor: "scalar";
  spec: OpenAPIV3.Document;
  docsPath: string;
  specPath: string;
}

type InitExpressConfig = {
  cors: boolean | CorsOptions;
  docs: OpenAPIDocsOptions
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
        const tmpResult = await operatorObject.handler(validatedReq, extensions);
        const result = tmpResult instanceof HttpResponse ? tmpResult : new HttpResponse({ body: tmpResult });
        const usedStatus = result.payload.status ?? (method === "post" ? 201 : 200);

        // validate result
        const responseValidator = operatorObject.responses[usedStatus] || operatorObject.responses["default"];

        if (!responseValidator || typeof responseValidator === "boolean" || typeof responseValidator === "string") {
          console.error(
            `[error]: There is no corresponding validator defined in schema for status ${usedStatus}/default`
          );
          throw new Error("Internal server error");
        }

        try {
          responseValidator.parse(result.payload.body);
        } catch (err) {
          console.error(
            "[error]: Invalid output format to the corresponding defined output schema"
          );
          console.error(String(err));
          throw new Error("Internal server error");
        }

        // response
        if (result.payload.body instanceof Readable) {
          res.header(result.payload.headers);

          result.payload.body.pipe(res);
        } else {
          const preparedResult = prepareResponse(result.payload.body);

          if (preparedResult) {
            res
              .contentType(preparedResult.contentType)
              .status(usedStatus)
              .header(result.payload.headers)
              .send(preparedResult.body);
          } else {
            res
              .header(result.payload.headers)
              .end();
          }
        }
      } catch (err) {
        handleError(err, res);
      }
    });
  }

  // docs config
  if (config?.docs) {
    registerDocsEndpoints(app, config.docs);
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

function registerDocsEndpoints(app: Express, options: OpenAPIDocsOptions) {
  app.get(options.docsPath, (req, res) => {
    res
      .contentType("html")
      .send(
        SCALAR_TEMPLATE
          .replace("{{title}}", options.spec.info.title)
          .replace("{{specUrl}}", options.specPath)
      );
  });
  app.get(options.specPath, (req, res) => {
    res
      .contentType("json")
      .send(JSON.stringify(options.spec, null, 2));
  });
}

function registerNotFoundHandler(app: Express) {
  app.all("*", (req, res) => {
    responseExpressError(res, 404, `Cannot find ${req.method.toUpperCase()} ${req.path}`);
  });
}
