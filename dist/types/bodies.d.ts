import type * as http from "http";
import z from "zod";
import type { ZodMultiMapValues, ZodParameterTypes } from "./zod-types";
type EncodingItem = {
    contentType?: string[];
    headers?: z.ZodObject<Record<string, ZodParameterTypes>>;
    style?: string;
    explode?: string;
    allowReserved?: string;
};
type SerializeResult = {
    buffer: Buffer;
    headers: http.OutgoingHttpHeaders;
};
export declare abstract class SenderBody<B extends z.ZodType = any> {
    /** for both `RequestBodyObject` and `ResponseObject` */
    private _description;
    /** for `ResponseObject` only, documented as the response headers */
    private _headers;
    /** for both `RequestBodyObject` and `ResponseObject` */
    private _examples;
    abstract readonly body: B;
    abstract mimeType: string;
    abstract serialize<T extends z.infer<B>>(data: T): Promise<SerializeResult>;
    describe(description: SenderBody["_description"]): this;
    get description(): SenderBody["_description"];
    requireHeaders(headers: SenderBody["_headers"]): this;
    get requiredHeaders(): SenderBody["_headers"];
    setExamples(examples: SenderBody["_examples"]): this;
    getExamples(): SenderBody["_examples"];
    parse(payload: any): z.output<B>;
}
export declare class JsonBody<B extends z.ZodType = any> extends SenderBody<B> {
    readonly body: B;
    static readonly mimeType: string;
    constructor(body: B);
    serialize<T extends z.TypeOf<B>>(data: T): Promise<SerializeResult>;
    get mimeType(): string;
}
type FormDataValidator = ZodParameterTypes | z.ZodCustom<File, File>;
export declare class FormDataBody<B extends z.ZodObject<Record<string, ZodMultiMapValues<FormDataValidator>>> = any, K extends keyof z.infer<B> = any> extends SenderBody<B> {
    readonly body: B;
    readonly encoding?: Record<K, Readonly<EncodingItem>> | undefined;
    static readonly mimeType: string;
    constructor(body: B, encoding?: Record<K, Readonly<EncodingItem>> | undefined);
    serialize<T extends z.TypeOf<B>>(data: T): Promise<SerializeResult>;
    get mimeType(): string;
}
export declare class UrlEncodedBody<B extends z.ZodObject<Record<string, ZodMultiMapValues>> = any, K extends keyof z.infer<B> = any> extends SenderBody<B> {
    readonly body: B;
    readonly encoding?: Record<K, Readonly<EncodingItem>> | undefined;
    static readonly mimeType: string;
    constructor(body: B, encoding?: Record<K, Readonly<EncodingItem>> | undefined);
    serialize<T extends z.TypeOf<B> | URLSearchParams>(data: T): Promise<SerializeResult>;
    get mimeType(): string;
}
export declare class OctetStreamBody<B extends z.ZodCustom<Buffer, Buffer> = any> extends SenderBody<B> {
    readonly body: B;
    static readonly mimeType: string;
    constructor(body?: B);
    serialize<T extends z.output<B>>(data: T): Promise<SerializeResult>;
    get mimeType(): string;
}
export declare class TextBody<B extends z.ZodString = any> extends SenderBody<B> {
    readonly body: B;
    static readonly mimeType: string;
    constructor(body?: B);
    serialize<T extends z.TypeOf<B>>(data: T): Promise<SerializeResult>;
    get mimeType(): string;
}
export declare class HtmlBody<B extends z.ZodString = any> extends TextBody<B> {
    static readonly mimeType: string;
    get mimeType(): string;
}
export {};
