import { endpoint, LinzEndpointGroup } from "@apskhem/linz";
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
    requestBody: z.object({
      echo: z.string()
    }),
    responses: {
      201: z.object({
        body: z.string()
      }),
      404: true
    },
    operationId: "echoBodySimple",
    handler: async ({ body }) => {
      return { body: body.echo };
    }
  }),
  "post:/echo/simple/void": endpoint({
    requestBody: z.object({
      echo: z.string()
    }),
    responses: {
      201: z.void(),
      404: true
    },
    operationId: "echoVoidSimple",
    handler: async ({ body }) => {
      return void {};
    }
  }),
  "post:/echo/simple/upload": endpoint({
    requestBodyType: "multipart/form-data",
    requestBody: z.object({
      file: z.instanceof(File),
      field: z.string()
    }),
    responses: {
      201: z.object({
        field: z.string()
      }),
      404: true
    },
    operationId: "echoUploadSimple",
    handler: async ({ body }) => {
      fs.writeFileSync(body.file.name, new Uint8Array(await body.file.slice().arrayBuffer()))
      return { field: body.field };
    }
  })
};

export default applyGroupConfig(endpoints, {
  tags: [ TAG.simple ],
  security: []
});
