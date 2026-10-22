import type * as http from "http";
import { z } from "zod";
export type JsonApiErrorItem = {
    id?: string;
    links?: {
        about?: string;
    };
    status?: string;
    code?: string;
    title?: string;
    detail?: string;
    source?: {
        pointer?: string;
        parameter?: string;
        header?: string;
    };
    meta?: Record<string, any>;
};
export type JsonApiErrorResponse = {
    errors: JsonApiErrorItem[];
};
export declare class ApiError extends Error {
    readonly status: number;
    readonly errors: JsonApiErrorItem | JsonApiErrorItem[];
    readonly headers?: http.OutgoingHttpHeaders | undefined;
    constructor(status: number, errors: JsonApiErrorItem | JsonApiErrorItem[], headers?: http.OutgoingHttpHeaders | undefined);
}
export declare const jsonApiErrorResponseSchema: z.ZodObject<{
    errors: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        links: z.ZodOptional<z.ZodObject<{
            about: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        status: z.ZodOptional<z.ZodString>;
        code: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        detail: z.ZodOptional<z.ZodString>;
        source: z.ZodOptional<z.ZodObject<{
            pointer: z.ZodOptional<z.ZodString>;
            parameter: z.ZodOptional<z.ZodString>;
            header: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
