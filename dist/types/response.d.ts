import type * as http from "http";
import type { Readable } from "stream";
export declare class HttpResponse<T> {
    readonly payload: {
        readonly headers?: http.OutgoingHttpHeaders;
        readonly status?: number;
        readonly body?: T | ReadableStream | Readable;
    };
    constructor(payload: {
        readonly headers?: http.OutgoingHttpHeaders;
        readonly status?: number;
        readonly body?: T | ReadableStream | Readable;
    });
    static withoutBody(status: number, headers?: http.OutgoingHttpHeaders): HttpResponse<void>;
}
