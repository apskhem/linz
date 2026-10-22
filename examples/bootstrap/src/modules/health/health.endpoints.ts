import { endpoint, type LinzEndpointGroup } from "@apskhem/linz";
import { z } from "zod";

import { TAGS } from "../../common/tags";

export const healthEndpoints: LinzEndpointGroup = {
  "get:/health": endpoint({
    operationId: "getHealth",
    summary: "Check that the service is up",
    tags: [TAGS.health],
    responses: {
      200: z.object({ status: z.literal("ok"), uptime: z.number().describe("Seconds since start") }),
    },
    handler: async () => ({ status: "ok" as const, uptime: process.uptime() }),
  }),
};
