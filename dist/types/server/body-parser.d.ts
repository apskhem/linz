import * as http from "http";
/**
 * Configurations for incoming requests.
 */
export type RequestBodyConfig = {
    /**
     * Enables parsing multiple values for a query string.
     * If `false`, only the last value is used.
     *
     * @default false
     */
    multiValueQueryString?: boolean;
    /**
     * Enables parsing multiple values for `multipart/form-data`.
     * If `false`, only the last value is used.
     *
     * @default false
     */
    multiValueFormData?: boolean;
    /**
     * Enables parsing multiple values for `application/x-www-form-urlencoded`.
     * If `false`, only the last value is used.
     *
     * @default false
     */
    multiValueUrlEncoded?: boolean;
};
export declare class BodyParserError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string);
}
export declare function collectBody(req: http.IncomingMessage): Promise<Buffer>;
/**
 * Parses a request body. When `expectedType` is given, any other content type is rejected with 415.
 */
export declare function parseBody(body: Buffer, contentTypeHeader: string, config?: RequestBodyConfig, expectedType?: string): any | undefined;
