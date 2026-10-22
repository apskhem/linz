import type * as http from "http";
import type { Readable } from "stream";

export class HttpResponse<T> {
  constructor(
    public readonly payload: {
      readonly headers?: http.OutgoingHttpHeaders;
      readonly status?: number;
      readonly body?: T | ReadableStream | Readable;
    }
  ) {}

  public static withoutBody(
    status: number,
    headers?: http.OutgoingHttpHeaders
  ): HttpResponse<void> {
    return headers ? new HttpResponse({ headers, status }) : new HttpResponse({ status });
  }
}
