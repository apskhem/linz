import type * as http from "http";
import type { HttpMethod, LinzEndpoint } from "../endpoint";
import type { CreateApiConfig } from "./config";
/**
 * Creates the request handler of one endpoint: authenticates, reads and validates the
 * request, runs the endpoint handler, then validates and sends its result.
 */
export declare function createEndpointHandler(method: HttpMethod, operation: LinzEndpoint, config?: Partial<CreateApiConfig>): (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
