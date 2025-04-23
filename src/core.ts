import * as http from "http";

import type { OpenAPIV3_1 as OpenAPIType } from "openapi-types";
import { mapValues } from "radash";
import z from "zod";

import { encode, generateBoundary } from "./internal/multipart";

type ZodParameterTypes =
  | z.ZodString
  | z.ZodNumber
  | z.ZodNaN
  | z.ZodBigInt
  | z.ZodBoolean
  | z.ZodDate
  | z.ZodUndefined
  | z.ZodEnum<[string, ...string[]]>
  | z.ZodOptional<ZodParameterTypes>
  | z.ZodNullable<ZodParameterTypes>;

type Extensions<T extends Record<string, any> = Record<string, any>> = T;
type Tag = OpenAPIType.TagObject;
type EncodingItem = {
  contentType?: string[];
  headers?: z.ZodObject<Record<string, ZodParameterTypes>>;
  style?: string;
  explode?: string;
  allowReserved?: string;
};

export type LinzEndpoint = {
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
  // note: short-hand applicable
  requestBody?: SenderBody;
  // note: short-hand applicable
  responses: {
    [status: number]: SenderBody | boolean | string;
    default?: SenderBody;
  };
  deprecated?: boolean;
  security?: AppliedSecurity[];
  handler: (
    message: Readonly<HTTPRequest>,
    ctx: {
      security?: AppliedSecurity[];
      extensions: Extensions;
      req: http.IncomingMessage;
      res: http.ServerResponse;
    }
  ) => Promise<HttpResponse<any> | HttpResponse<any>["payload"]["body"]>;
};

type MergeRecordType<T, U> = {
  [K in keyof T]: T[K] | U;
};
type MergeZodValues<T> = {
  [K in keyof T]: T[K] extends z.ZodType
    ? z.infer<T[K]>
    : T[K] extends SenderBody
      ? z.infer<T[K]["body"]>
      : never;
}[keyof T];
type MergedResponse<
  T extends MergeRecordType<LinzEndpoint["responses"], ConstructorParameters<typeof JsonBody>[0]>,
> = MergeZodValues<T> extends infer R ? R : never;

export const METHODS = ["get", "post", "put", "patch", "delete"] as const;

export type HttpMethod = (typeof METHODS)[number];

export type LinzEndpointGroup = {
  [methodPath: `${(typeof METHODS)[number]}:${string}`]: LinzEndpoint;
};

export type HTTPRequest = {
  body: any | null;
  queries: Record<string, string>;
  params: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
};

export function endpoint<
  TExt extends Extensions,
  TQuery extends NonNullable<Required<LinzEndpoint>["parameters"]["query"]>,
  THeader extends NonNullable<Required<LinzEndpoint>["parameters"]["header"]>,
  TPath extends NonNullable<Required<LinzEndpoint>["parameters"]["path"]>,
  TCookie extends NonNullable<Required<LinzEndpoint>["parameters"]["cookie"]>,
  TBody extends
    | NonNullable<LinzEndpoint["requestBody"]>
    | ConstructorParameters<typeof JsonBody>[0],
  TResponse extends MergeRecordType<
    LinzEndpoint["responses"],
    ConstructorParameters<typeof JsonBody>[0]
  >,
>(endpoint: {
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
  security?: AppliedSecurity[];
  handler: (
    message: Readonly<{
      queries: z.infer<TQuery>;
      headers: z.infer<THeader>;
      params: z.infer<TPath>;
      cookies: z.infer<TCookie>;
      body: z.infer<TBody extends SenderBody ? TBody["body"] : TBody>;
    }>,
    ctx: {
      security?: AppliedSecurity[];
      extensions: TExt;
      req: http.IncomingMessage;
      res: http.ServerResponse;
    }
  ) => Promise<MergedResponse<TResponse> | HttpResponse<MergedResponse<TResponse>>>;
}): LinzEndpoint {
  return {
    ...endpoint,
    ...(endpoint.requestBody &&
      !(endpoint.requestBody instanceof SenderBody) && {
        requestBody: new JsonBody(endpoint.requestBody),
      }),
    responses: Object.fromEntries(
      Object.entries(endpoint.responses).map(([k, v]) => [
        k,
        v instanceof z.ZodType ? new JsonBody(v) : v,
      ])
    ),
  } as LinzEndpoint;
}

export class HttpResponse<T> {
  constructor(
    public readonly payload: {
      readonly headers?: Record<string, string>;
      readonly status?: number;
      readonly body?: T | ReadableStream;
    }
  ) {}

  public static withoutBody(status: number, headers?: Record<string, string>): HttpResponse<void> {
    return headers ? new HttpResponse({ headers, status }) : new HttpResponse({ status });
  }
}

interface SecurityConfig {
  name: string;
  schema: OpenAPIType.SecuritySchemeObject;
  handler: (
    req: Readonly<http.IncomingMessage>,
    scopes: string[],
    extensions: Extensions
  ) => Promise<void>;
}

export class Security implements SecurityConfig {
  public readonly name: string;
  public readonly schema: OpenAPIType.SecuritySchemeObject;
  public readonly handler: (
    req: Readonly<http.IncomingMessage>,
    scopes: string[],
    extensions: Extensions
  ) => Promise<void>;

  constructor(config: SecurityConfig) {
    this.name = config.name;
    this.schema = config.schema;
    this.handler = config.handler;
  }

  apply(scopes: string[]): AppliedSecurity {
    return new AppliedSecurity(this, scopes);
  }
}

export class AppliedSecurity {
  public readonly scopes: string[];
  public readonly security: Security;

  constructor(usedSecurity: Security, scopes: string[]) {
    this.scopes = scopes;
    this.security = usedSecurity;
  }

  async authenticate(req: Readonly<http.IncomingMessage>, extensions: Extensions) {
    await this.security.handler(req, this.scopes, extensions);
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly msg: string
  ) {
    super(msg);
  }
}

abstract class SenderBody<B extends z.ZodType = any> {
  /** for both `RequestBodyObject` and `ResponseObject` */
  private _description: string | null = null;
  /** for `ResponseObject` */
  private _headers: z.ZodObject<Record<string, ZodParameterTypes>> | null = null;
  /** for both `RequestBodyObject` and `ResponseObject` */
  private _examples: Record<string, OpenAPIType.ExampleObject> | null = null;

  abstract readonly body: B;
  abstract mimeType: string;

  abstract serialize<T extends z.infer<B>>(data: T): Promise<Buffer>;

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
}

export class JsonBody<B extends z.ZodFirstPartySchemaTypes = any> extends SenderBody<B> {
  static readonly mimeType: string = "application/json";

  constructor(public readonly body: B) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer> {
    return Buffer.from(JSON.stringify(data));
  }

  override get mimeType(): string {
    return JsonBody.mimeType;
  }
}

type FormDataValidator = ZodParameterTypes | z.ZodType<File, z.ZodTypeDef, File>;

export class FormDataBody<
  B extends z.ZodObject<Record<string, FormDataValidator>> = any,
  K extends keyof z.infer<B> = any,
> extends SenderBody<B> {
  static readonly mimeType: string = "multipart/form-data";

  constructor(
    public readonly body: B,
    public readonly encoding?: Record<K, Readonly<EncodingItem>>
  ) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer> {
    return (await this.serializeWithContentType(data))[1];
  }

  async serializeWithContentType<T extends z.TypeOf<B>>(data: T): Promise<[string, Buffer]> {
    const boundary = generateBoundary();

    return [
      `${FormDataBody.mimeType}; boundary=${boundary}`,
      await encode(
        mapValues(data, (vx) => [vx instanceof File ? vx : String(vx)]),
        boundary
      ),
    ];
  }

  override get mimeType(): string {
    return FormDataBody.mimeType;
  }
}

export class UrlEncodedBody<
  B extends z.ZodObject<
    Record<string, ZodParameterTypes>
    // FIXME: should also accept `URLSearchParams`?
  > = any,
  K extends keyof z.infer<B> = any,
> extends SenderBody<B> {
  static readonly mimeType: string = "application/x-www-form-urlencoded";

  constructor(
    public readonly body: B,
    public readonly encoding?: Record<K, Readonly<EncodingItem>>
  ) {
    super();
  }

  override async serialize<T extends z.TypeOf<B> | URLSearchParams>(data: T): Promise<Buffer> {
    return Buffer.from(
      new URLSearchParams(
        data instanceof URLSearchParams
          ? data
          : Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
      ).toString()
    );
  }

  override get mimeType(): string {
    return UrlEncodedBody.mimeType;
  }
}

export class OctetStreamBody<
  B extends z.ZodType<Buffer, z.ZodTypeDef, Buffer> = any,
> extends SenderBody<B> {
  static readonly mimeType: string = "application/octet-stream";

  constructor(public readonly body: B = z.instanceof(Buffer) as B) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer> {
    return data;
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

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer> {
    return Buffer.from(data);
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
