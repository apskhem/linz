import type * as http from "http";
import { type JsonApiErrorItem } from "../errors";
import { type Logger } from "./logger";
export declare const INTERNAL_SERVER_ERROR = "Internal server error";
type ErrorResponse = {
    status: number;
    errors: JsonApiErrorItem[];
    headers?: http.OutgoingHttpHeaders;
};
export declare function sendErrors(res: http.ServerResponse, { status, errors, headers }: ErrorResponse): void;
/**
 * Responds to an error thrown while handling a request. Only `ApiError` and problems with
 * the request are shown to clients, anything else is logged and hidden behind a generic 500.
 */
export declare function sendErrorResponse(res: http.ServerResponse, err: unknown, logger?: Logger): void;
export {};
