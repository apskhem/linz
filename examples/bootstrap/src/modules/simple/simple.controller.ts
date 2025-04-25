import { endpoint, FormDataBody, JsonBody, LinzEndpointGroup, OctetStreamBody } from "@apskhem/linz";
import { applyGroupConfig } from "@apskhem/linz";
import { z } from "zod";
import * as fs from "fs";

import { TAG } from "common/constants/values";

const endpoints: LinzEndpointGroup = {
  "post:/echo/:path": endpoint({
    parameters: {
      path: z.object({
        path: z.string(),
      })
    },
    responses: {
      201: z.object({
        path: z.string()
      }),
      404: true
    },
    operationId: "echoPathSimple",
    handler: async ({ params }) => {
      return { path: params.path };
    }
  }),
  "post:/echo/simple/body": endpoint({
    requestBody: new JsonBody(
      z.object({
        echo: z.string().nullable()
      })
    ),
    responses: {
      201: z.object({
        body: z.string()
      }),
      404: true
    },
    operationId: "echoBodySimple",
    handler: async ({ body }) => {
      return { body: body.echo ?? "null!" };
    }
  }),
  "post:/echo/simple/query": endpoint({
    parameters: {
      query: z.object({
        echo: z.tuple([z.string()])
      })
    },
    responses: {
      201: z.object({
        body: z.string()
      }),
      404: true
    },
    operationId: "echoBodyQuery",
    handler: async ({ queries }) => {
      return { body: JSON.stringify(queries.echo) ?? "null!" };
    }
  }),
  "post:/echo/simple/void": endpoint({
    requestBody: new JsonBody(
      z.object({
        echo: z.string()
      })
    ).describe("Echo void result"),
    responses: {
      201: z.void(),
      404: true
    },
    operationId: "echoVoidSimple",
    handler: async ({ body }) => {
      return void {};
    }
  }),
  "post:/echo/tmp": endpoint({
    requestBody: new JsonBody(
      z.object({
        echo: z.string()
      })
    ).describe("Echo void result"),
    responses: {
      201: new OctetStreamBody(),
      404: true
    },
    operationId: "echoOctetStream",
    handler: async ({ body }) => {
      return void {};
    }
  }),
  "post:/echo/simple/upload": endpoint({
    requestBody: new FormDataBody(
      z.object({
        file: z.instanceof(File),
        field: z.string()
      }),
      {
        file: {
          contentType: ["image/png", "image/jpeg"],
          headers: z.object({
            "X-Custom-Header": z.string().describe("This is a custom header")
          })
        }
      }
    ),
    responses: {
      201: z.object({
        field: z.string()
      }),
      404: true
    },
    operationId: "echoUploadSimple",
    handler: async ({ body }) => {
      const file = body.file;

      fs.writeFileSync(file.name, new Uint8Array(await file.slice().arrayBuffer()))
      return { field: body.field };
    }
  })
};

export default applyGroupConfig(endpoints, {
  tags: [ TAG.simple ],
  security: []
});
