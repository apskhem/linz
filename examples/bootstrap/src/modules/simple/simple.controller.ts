import { endpoint, LinzEndpointGroup } from "@apskhem/linz";
import { applyGroupConfig } from "@apskhem/linz";
import { z } from "zod";

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
  "post:/echo/e/body": endpoint({
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
  "post:/echo/e/void": endpoint({
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
  })
};

export default applyGroupConfig(endpoints, {
  tags: [ TAG.simple ],
  security: []
});
