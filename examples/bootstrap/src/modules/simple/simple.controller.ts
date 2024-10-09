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
    handler: async ({ body, params }) => {
      return { path: params.path };
    }
  })
};

export default applyGroupConfig(endpoints, {
  tags: [ TAG.simple ],
  security: []
});
