import type * as http from "http";

import type { OpenAPIV3_1 as OpenAPIType } from "openapi-types";
import z from "zod";

import { encode, generateBoundary } from "./internal/multipart";
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

export abstract class SenderBody<B extends z.ZodType = any> {
  /** for both `RequestBodyObject` and `ResponseObject` */
  private _description: string | null = null;
  /** for `ResponseObject` only, documented as the response headers */
  private _headers: z.ZodObject<Record<string, ZodParameterTypes>> | null = null;
  /** for both `RequestBodyObject` and `ResponseObject` */
  private _examples: Record<string, OpenAPIType.ExampleObject> | null = null;

  abstract readonly body: B;
  abstract mimeType: string;

  abstract serialize<T extends z.infer<B>>(data: T): Promise<SerializeResult>;

  describe(description: SenderBody["_description"]): this {
    this._description = description;
    return this;
  }

  get description(): SenderBody["_description"] {
    return this._description;
  }

  requireHeaders(headers: SenderBody["_headers"]): this {
    this._headers = headers;
    return this;
  }

  get requiredHeaders(): SenderBody["_headers"] {
    return this._headers;
  }

  setExamples(examples: SenderBody["_examples"]): this {
    this._examples = examples;
    return this;
  }

  getExamples(): SenderBody["_examples"] {
    return this._examples;
  }

  parse(payload: any): z.output<B> {
    return this.body.parse(payload);
  }
}

/**
 * Flattens form fields the way the body parsers read them back:
 * an array becomes one entry per item, and `undefined` or `null` fields are left out.
 */
function toFormFields(data: Record<string, unknown>): [string, string | File][] {
  return Object.entries(data).flatMap(([key, value]) =>
    (Array.isArray(value) ? value : [value])
      .filter((item) => item !== undefined && item !== null)
      .map((item): [string, string | File] => [
        key,
        item instanceof File ? item : item instanceof Date ? item.toISOString() : String(item),
      ])
  );
}

function groupFormFields(fields: [string, string | File][]): Record<string, (string | File)[]> {
  const grouped: Record<string, (string | File)[]> = {};
  for (const [key, value] of fields) {
    (grouped[key] ??= []).push(value);
  }
  return grouped;
}

export class JsonBody<B extends z.ZodType = any> extends SenderBody<B> {
  static readonly mimeType: string = "application/json";

  constructor(public readonly body: B) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<SerializeResult> {
    return {
      buffer: Buffer.from(JSON.stringify(data)),
      headers: {},
    };
  }

  override get mimeType(): string {
    return JsonBody.mimeType;
  }
}

type FormDataValidator = ZodParameterTypes | z.ZodCustom<File, File>;

export class FormDataBody<
  B extends z.ZodObject<Record<string, ZodMultiMapValues<FormDataValidator>>> = any,
  K extends keyof z.infer<B> = any,
> extends SenderBody<B> {
  static readonly mimeType: string = "multipart/form-data";

  constructor(
    public readonly body: B,
    public readonly encoding?: Record<K, Readonly<EncodingItem>>
  ) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<SerializeResult> {
    const boundary = generateBoundary();

    return {
      buffer: await encode(groupFormFields(toFormFields(data)), boundary),
      headers: {
        "content-type": `${FormDataBody.mimeType}; boundary=${boundary}`,
      },
    };
  }

  override get mimeType(): string {
    return FormDataBody.mimeType;
  }
}

export class UrlEncodedBody<
  B extends z.ZodObject<Record<string, ZodMultiMapValues>> = any,
  K extends keyof z.infer<B> = any,
> extends SenderBody<B> {
  static readonly mimeType: string = "application/x-www-form-urlencoded";

  constructor(
    public readonly body: B,
    public readonly encoding?: Record<K, Readonly<EncodingItem>>
  ) {
    super();
  }

  override async serialize<T extends z.TypeOf<B> | URLSearchParams>(
    data: T
  ): Promise<SerializeResult> {
    return {
      buffer: Buffer.from(
        new URLSearchParams(
          data instanceof URLSearchParams
            ? data
            : toFormFields(data).map(([key, value]) => [key, String(value)])
        ).toString()
      ),
      headers: {},
    };
  }

  override get mimeType(): string {
    return UrlEncodedBody.mimeType;
  }
}

export class OctetStreamBody<B extends z.ZodCustom<Buffer, Buffer> = any> extends SenderBody<B> {
  static readonly mimeType: string = "application/octet-stream";

  constructor(public readonly body: B = z.instanceof(Buffer) as B) {
    super();
  }

  override async serialize<T extends z.output<B>>(data: T): Promise<SerializeResult> {
    return {
      buffer: data,
      headers: {},
    };
  }

  override get mimeType(): string {
    return OctetStreamBody.mimeType;
  }
}

export class TextBody<B extends z.ZodString = any> extends SenderBody<B> {
  static readonly mimeType: string = "text/plain";

  constructor(public readonly body: B = z.string() as B) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<SerializeResult> {
    return {
      buffer: Buffer.from(data),
      headers: {},
    };
  }

  override get mimeType(): string {
    return TextBody.mimeType;
  }
}

export class HtmlBody<B extends z.ZodString = any> extends TextBody<B> {
  static override readonly mimeType: string = "text/html";

  override get mimeType(): string {
    return HtmlBody.mimeType;
  }
}
