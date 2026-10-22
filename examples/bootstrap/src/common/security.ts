import { ApiError, Security } from "@apskhem/linz";

import { config } from "../config";

/**
 * Requires `Authorization: Bearer <API_TOKEN>`. Protect an endpoint with
 * `security: [bearerAuth.apply([])]`. A real app would verify a JWT or a session here.
 */
export const bearerAuth = new Security({
  name: "bearerAuth",
  schema: { type: "http", scheme: "bearer" },
  handler: async (req, _scopes, extensions) => {
    if (req.headers.authorization !== `Bearer ${config.apiToken}`) {
      throw new ApiError(401, { status: "401", detail: "Missing or invalid bearer token" });
    }

    // anything set here reaches the endpoint handlers as `ctx.extensions`
    extensions.user = "demo-user";
  },
});
