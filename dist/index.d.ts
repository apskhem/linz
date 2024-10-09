import { CorsOptions } from 'cors';
import { Express } from 'express';
import { OpenAPIV3 } from 'openapi-types';
import z, { ZodObject, ZodType } from 'zod';

type InitExpressConfig = {
    cors: boolean | CorsOptions;
    docs: {
        vendor: "scalar";
        path: string;
        specUrl: string;
    };
};
declare function initExpress(app: Express, endpoints: LinzEndpointGroup, config?: Partial<InitExpressConfig>): void;

type BuilderConfig = {
    openapi: "3.0.3";
    info: OpenAPIV3.Document["info"];
    servers?: OpenAPIV3.Document["servers"];
    tags?: Record<string, OpenAPIV3.TagObject>;
    paths: LinzEndpointGroup;
    security?: Security<any>[];
};
declare function buildJson(config: BuilderConfig): OpenAPIV3.Document;

declare function mergeEndpointGroups(prefix: string, groups: LinzEndpointGroup[]): LinzEndpointGroup;
declare function applyGroupConfig(group: LinzEndpointGroup, config: {
    tags?: LinzEndpoint["tags"];
    security?: LinzEndpoint["security"];
}): LinzEndpointGroup;

type ZodParameterTypes = z.ZodString | z.ZodNumber | z.ZodNaN | z.ZodBigInt | z.ZodBoolean | z.ZodDate | z.ZodUndefined | z.ZodEnum<[string, ...string[]]> | z.ZodOptional<ZodParameterTypes> | z.ZodNullable<ZodParameterTypes>;
type Extensions = Record<string, any>;
type Tag = OpenAPIV3.TagObject;
type LinzEndpoint = {
    tags?: Tag[];
    summary?: string;
    description?: string;
    operationId: string;
    parameters?: {
        query?: ZodObject<Record<string, ZodParameterTypes>>;
        header?: ZodObject<Record<string, ZodParameterTypes>>;
        path?: ZodObject<Record<string, ZodParameterTypes>>;
        cookie?: ZodObject<Record<string, ZodParameterTypes>>;
    };
    requestBody?: z.ZodFirstPartySchemaTypes;
    requestBodyType?: string;
    responses: {
        [status: number]: z.ZodFirstPartySchemaTypes | boolean;
        default?: z.ZodFirstPartySchemaTypes;
    };
    deprecated?: boolean;
    security?: Security<any>[];
    handler: (req: Readonly<HTTPRequest>, extensions: Extensions) => Promise<HttpResponse<any> | HttpResponse<any>["body"]>;
};
type MergeNonBooleanValues<T> = {
    [K in keyof T]: T[K] extends ZodType ? z.infer<T[K]> : never;
}[keyof T];
type MergedResponse<T extends LinzEndpoint["responses"]> = MergeNonBooleanValues<T> extends infer R ? R : never;
declare const METHODS: readonly ["get", "post", "put", "patch", "delete"];
type HttpMethod = (typeof METHODS)[number];
type LinzEndpointGroup = {
    [methodPath: `${(typeof METHODS)[number]}:${string}`]: LinzEndpoint;
};
type HTTPRequest = {
    body: any | null;
    queries: Record<string, string>;
    params: Record<string, string>;
    headers: Record<string, string>;
    cookies: Record<string, string>;
};
declare function endpoint<TExt extends Extensions, TQuery extends ZodObject<Record<string, ZodParameterTypes>>, THeader extends ZodObject<Record<string, ZodParameterTypes>>, TPath extends ZodObject<Record<string, ZodParameterTypes>>, TCookie extends ZodObject<Record<string, ZodParameterTypes>>, TBody extends z.ZodFirstPartySchemaTypes, TResponse extends {
    [status: number]: z.ZodFirstPartySchemaTypes | boolean;
    default?: z.ZodFirstPartySchemaTypes;
}>(endpoint: {
    tags?: Tag[];
    summary?: string;
    description?: string;
    operationId: string;
    parameters?: {
        query?: TQuery;
        header?: THeader;
        path?: TPath;
        cookie?: TCookie;
    };
    requestBody?: TBody;
    requestBodyType?: string;
    responses: TResponse;
    deprecated?: boolean;
    security?: Security<any>[];
    handler: (req: Readonly<{
        queries: z.infer<TQuery>;
        headers: z.infer<THeader>;
        params: z.infer<TPath>;
        cookies: z.infer<TCookie>;
        body: z.infer<TBody>;
    }>, extensions: TExt) => Promise<MergedResponse<TResponse> | HttpResponse<MergedResponse<TResponse>>>;
}): LinzEndpoint;
declare class HttpResponse<T> {
    readonly headers?: Record<string, string>;
    readonly status?: number;
    readonly body?: T | ReadableStream;
    constructor(payload: {
        headers?: HttpResponse<T>["headers"];
        status?: HttpResponse<T>["status"];
        body?: T;
    });
}
type SecurityConfig = OpenAPIV3.SecuritySchemeObject & {
    name: string;
    handler: (req: Readonly<HTTPRequest>, extensions: Extensions) => Promise<void>;
};
declare class Security<T> {
    readonly inner: SecurityConfig;
    constructor(config: SecurityConfig);
    use(flow: string, scopes: string[]): this;
}
declare class ApiError extends Error {
    readonly status: number;
    readonly msg: string;
    constructor(status: number, msg: string);
}
declare class ValidationError extends Error {
    readonly msg: Record<string, any>;
    constructor(msg: Record<string, any>);
}

export { ApiError, type BuilderConfig, type HTTPRequest, type HttpMethod, HttpResponse, type LinzEndpoint, type LinzEndpointGroup, METHODS, Security, ValidationError, applyGroupConfig, buildJson, endpoint, initExpress, mergeEndpointGroups };
