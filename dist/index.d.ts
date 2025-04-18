import { Router } from '@routejs/router';
export * from '@routejs/router';
import { OpenAPIV3 } from 'openapi-types';
import z, { z as z$1 } from 'zod';
import { CorsOptions } from 'cors';

type ZodParameterTypes = z.ZodString | z.ZodNumber | z.ZodNaN | z.ZodBigInt | z.ZodBoolean | z.ZodDate | z.ZodUndefined | z.ZodEnum<[string, ...string[]]> | z.ZodOptional<ZodParameterTypes> | z.ZodNullable<ZodParameterTypes>;
type Extensions = Record<string, any>;
type Tag = OpenAPIV3.TagObject;
type EncodingItem = {
    contentType?: string[];
    headers?: z.ZodObject<Record<string, ZodParameterTypes>>;
    style?: string;
    explode?: string;
    allowReserved?: string;
};
type LinzEndpoint = {
    tags?: Tag[];
    summary?: string;
    description?: string;
    operationId: string;
    parameters?: {
        query?: z.ZodObject<Record<string, ZodParameterTypes>>;
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
    security?: Security<any>[];
    handler: (req: Readonly<HTTPRequest>, extensions: Extensions) => Promise<HttpResponse<any> | HttpResponse<any>["payload"]["body"]>;
};
type MergeRecordType<T, U> = {
    [K in keyof T]: T[K] | U;
};
type MergeZodValues<T> = {
    [K in keyof T]: T[K] extends z.ZodType ? z.infer<T[K]> : (T[K] extends SenderBody ? z.infer<T[K]["body"]> : never);
}[keyof T];
type MergedResponse<T extends MergeRecordType<LinzEndpoint["responses"], ConstructorParameters<typeof JsonBody>[0]>> = MergeZodValues<T> extends infer R ? R : never;
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
declare function endpoint<TExt extends Extensions, TQuery extends NonNullable<Required<LinzEndpoint>["parameters"]["query"]>, THeader extends NonNullable<Required<LinzEndpoint>["parameters"]["header"]>, TPath extends NonNullable<Required<LinzEndpoint>["parameters"]["path"]>, TCookie extends NonNullable<Required<LinzEndpoint>["parameters"]["cookie"]>, TBody extends NonNullable<LinzEndpoint["requestBody"]> | ConstructorParameters<typeof JsonBody>[0], TResponse extends MergeRecordType<LinzEndpoint["responses"], ConstructorParameters<typeof JsonBody>[0]>>(endpoint: {
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
    responses: TResponse;
    deprecated?: boolean;
    security?: Security<any>[];
    handler: (req: Readonly<{
        queries: z.infer<TQuery>;
        headers: z.infer<THeader>;
        params: z.infer<TPath>;
        cookies: z.infer<TCookie>;
        body: z.infer<TBody extends SenderBody ? TBody["body"] : TBody>;
    }>, extensions: TExt) => Promise<MergedResponse<TResponse> | HttpResponse<MergedResponse<TResponse>>>;
}): LinzEndpoint;
declare class HttpResponse<T> {
    readonly payload: {
        readonly headers?: Record<string, string>;
        readonly status?: number;
        readonly body?: T | ReadableStream;
    };
    constructor(payload: {
        readonly headers?: Record<string, string>;
        readonly status?: number;
        readonly body?: T | ReadableStream;
    });
    static withoutBody(status: number, headers?: Record<string, string>): HttpResponse<void>;
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
declare abstract class SenderBody<B extends z.ZodType = any> {
    private _description;
    private _headers;
    private _examples;
    abstract readonly body: B;
    abstract mimeType: string;
    abstract serialize<T extends z.infer<B>>(data: T): Promise<Buffer>;
    describe(description: SenderBody["_description"]): this;
    get description(): SenderBody["_description"];
    requireHeaders(headers: SenderBody["_headers"]): this;
    get requiredHeaders(): SenderBody["_headers"];
    setExamples(examples: SenderBody["_examples"]): this;
    getExamples(): SenderBody["_examples"];
}
declare class JsonBody<B extends z.ZodFirstPartySchemaTypes = any> extends SenderBody<B> {
    readonly body: B;
    static readonly mimeType: string;
    constructor(body: B);
    serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer>;
    get mimeType(): string;
}
type FormDataValidator = ZodParameterTypes | z.ZodType<File, z.ZodTypeDef, File>;
declare class FormDataBody<B extends z.ZodObject<Record<string, FormDataValidator>> = any, K extends keyof z.infer<B> = any> extends SenderBody<B> {
    readonly body: B;
    readonly encoding?: Record<K, Readonly<EncodingItem>> | undefined;
    static readonly mimeType: string;
    constructor(body: B, encoding?: Record<K, Readonly<EncodingItem>> | undefined);
    serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer>;
    serializeWithContentType<T extends z.TypeOf<B>>(data: T): Promise<[string, Buffer]>;
    get mimeType(): string;
}
declare class UrlEncodedBody<B extends z.ZodObject<Record<string, ZodParameterTypes>> = any, K extends keyof z.infer<B> = any> extends SenderBody<B> {
    readonly body: B;
    readonly encoding?: Record<K, Readonly<EncodingItem>> | undefined;
    static readonly mimeType: string;
    constructor(body: B, encoding?: Record<K, Readonly<EncodingItem>> | undefined);
    serialize<T extends z.TypeOf<B> | URLSearchParams>(data: T): Promise<Buffer>;
    get mimeType(): string;
}
declare class OctetStreamBody<B extends z.ZodType<Buffer, z.ZodTypeDef, Buffer> = any> extends SenderBody<B> {
    readonly body: B;
    static readonly mimeType: string;
    constructor(body?: B);
    serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer>;
    get mimeType(): string;
}
declare class TextBody<B extends z.ZodString = any> extends SenderBody<B> {
    readonly body: B;
    static readonly mimeType: string;
    constructor(body?: B);
    serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer>;
    get mimeType(): string;
}
declare class HtmlBody<B extends z.ZodString = any> extends TextBody<B> {
    static readonly mimeType: string;
    get mimeType(): string;
}

type CreateApiConfig = {
    cors: boolean | CorsOptions;
    docs: {
        viewer: "scalar" | "swagger" | "redoc" | "rapidoc" | "spotlight-elements";
        spec: OpenAPIV3.Document;
        docsPath: string;
        specPath: string;
        theme?: string;
    };
};
declare function createApi(app: Router, endpoints: LinzEndpointGroup, config?: Partial<CreateApiConfig>): void;

type BuilderConfig = {
    openapi: "3.0.3";
    info: OpenAPIV3.Document["info"];
    servers?: OpenAPIV3.Document["servers"];
    tags?: Record<string, OpenAPIV3.TagObject>;
    paths: LinzEndpointGroup;
    security?: Security<any>[];
    additionalSchemas?: Record<string, z$1.ZodType>;
};
declare function buildJson(config: BuilderConfig): OpenAPIV3.Document;

declare function mergeEndpointGroups(prefix: string, groups: LinzEndpointGroup[]): LinzEndpointGroup;
declare function applyGroupConfig(group: LinzEndpointGroup, config: {
    tags?: LinzEndpoint["tags"];
    security?: LinzEndpoint["security"];
}): LinzEndpointGroup;

export { ApiError, type BuilderConfig, FormDataBody, type HTTPRequest, HtmlBody, type HttpMethod, HttpResponse, JsonBody, type LinzEndpoint, type LinzEndpointGroup, METHODS, OctetStreamBody, Security, TextBody, UrlEncodedBody, ValidationError, applyGroupConfig, buildJson, createApi, endpoint, mergeEndpointGroups };
