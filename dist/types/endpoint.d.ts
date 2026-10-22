import type * as http from "http";
import type { OpenAPIV3_1 as OpenAPIType } from "openapi-types";
import z from "zod";
import { JsonBody, SenderBody } from "./bodies";
import type { HttpResponse } from "./response";
import type { AppliedSecurity, Extensions } from "./security";
import type { ZodMultiMapValues, ZodParameterTypes } from "./zod-types";
type Tag = OpenAPIType.TagObject;
export type LinzEndpoint = {
    tags?: Tag[];
    summary?: string;
    description?: string;
    operationId: string;
    /** Hides the endpoint from showing on the spec, but can still access. */
    hidden?: boolean;
    parameters?: {
        query?: z.ZodObject<Record<string, ZodMultiMapValues>>;
        header?: z.ZodObject<Record<string, ZodParameterTypes>>;
        path?: z.ZodObject<Record<string, ZodParameterTypes>>;
        cookie?: z.ZodObject<Record<string, ZodParameterTypes>>;
    };
    requestBody?: SenderBody;
    responses: {
        [status: number]: SenderBody | boolean | string;
        default?: SenderBody;
    };
    deprecated?: boolean;
    security?: AppliedSecurity[];
    handler: (message: Readonly<HTTPMessage>, ctx: {
        security?: AppliedSecurity[];
        extensions: Extensions;
        req: http.IncomingMessage;
        res: http.ServerResponse;
    }) => Promise<HttpResponse<any> | HttpResponse<any>["payload"]["body"]>;
};
type MergeRecordType<T, U> = {
    [K in keyof T]: T[K] | U;
};
type MergeZodResponseValues<T> = {
    [K in keyof T]: T[K] extends z.ZodType ? z.input<T[K]> : T[K] extends SenderBody ? z.input<T[K]["body"]> : never;
}[keyof T];
type MergedResponse<T extends MergeRecordType<LinzEndpoint["responses"], ConstructorParameters<typeof JsonBody>[0]>> = MergeZodResponseValues<T> extends infer R ? R : never;
export declare const METHODS: readonly ["get", "post", "put", "patch", "delete"];
export type HttpMethod = (typeof METHODS)[number];
export type LinzEndpointGroup = {
    [methodPath: `${(typeof METHODS)[number]}:${string}`]: LinzEndpoint;
};
export type HTTPMessage = {
    /**
     * A parsed and transformed payload from an HTTP payload body passing the defined validator.
     */
    body: any;
    queries: Record<string, string[] | string>;
    params: Record<string, string>;
    headers: Record<string, string>;
    cookies: Record<string, string>;
};
export declare function endpoint<TExt extends Extensions, TQuery extends NonNullable<Required<LinzEndpoint>["parameters"]["query"]>, THeader extends NonNullable<Required<LinzEndpoint>["parameters"]["header"]>, TPath extends NonNullable<Required<LinzEndpoint>["parameters"]["path"]>, TCookie extends NonNullable<Required<LinzEndpoint>["parameters"]["cookie"]>, TBody extends NonNullable<LinzEndpoint["requestBody"]> | ConstructorParameters<typeof JsonBody>[0], TResponse extends MergeRecordType<LinzEndpoint["responses"], ConstructorParameters<typeof JsonBody>[0]>>(endpoint: {
    tags?: Tag[];
    summary?: string;
    description?: string;
    operationId: string;
    hidden?: boolean;
    parameters?: {
        query?: TQuery;
        header?: THeader;
        path?: TPath;
        cookie?: TCookie;
    };
    requestBody?: TBody;
    responses: TResponse;
    deprecated?: boolean;
    security?: AppliedSecurity[];
    handler: (message: Readonly<{
        queries: z.output<TQuery>;
        headers: z.output<THeader>;
        params: z.output<TPath>;
        cookies: z.output<TCookie>;
        body: z.output<TBody extends SenderBody ? TBody["body"] : TBody>;
    }>, ctx: {
        security?: AppliedSecurity[];
        extensions: TExt;
        req: http.IncomingMessage;
        res: http.ServerResponse;
    }) => Promise<MergedResponse<TResponse> | HttpResponse<MergedResponse<TResponse>>>;
}): LinzEndpoint;
export {};
