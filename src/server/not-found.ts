import type * as http from "http";

import type { CreateApiConfig } from "./config";
import { INTERNAL_SERVER_ERROR, sendErrors } from "./error-response";
import { formatError } from "./logger";

/**
 * Creates the catch-all handler, responding 404 unless `fallbackHandler` has responded.
 * Mount it after every route.
 */
export function notFoundHandler(
  config?: Partial<Pick<CreateApiConfig, "fallbackHandler" | "logger">>
) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      await config?.fallbackHandler?.(req, res);

      if (res.headersSent) {
        return;
      }

      const pathname = (req.url ?? "/").split("?")[0];

      sendErrors(res, {
        status: 404,
        errors: [{ detail: `Cannot find ${req.method} ${pathname}` }],
      });
    } catch (err) {
      config?.logger?.error?.(formatError(err));

      if (!res.headersSent) {
        sendErrors(res, { status: 500, errors: [{ detail: INTERNAL_SERVER_ERROR }] });
      }
    }
  };
}
