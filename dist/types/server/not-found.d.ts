import type * as http from "http";
import type { CreateApiConfig } from "./config";
/**
 * Creates the catch-all handler, responding 404 unless `fallbackHandler` has responded.
 * Mount it after every route.
 */
export declare function notFoundHandler(config?: Partial<Pick<CreateApiConfig, "fallbackHandler" | "logger">>): (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
