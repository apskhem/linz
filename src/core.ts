import { FormDataEncoder } from "form-data-encoder";
import { FormData, File as FormDataFile } from "formdata-node";
import { mapValues } from "lodash";
import type { OpenAPIV3 } from "openapi-types";
import z, { type ZodObject, type ZodType } from "zod";

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

type Extensions = Record<string, any>;
type Tag = OpenAPIV3.TagObject;
type EncodingItem = {
  contentType?: string[],
  headers?: ZodObject<Record<string, ZodParameterTypes>>,
  style?: string,
  explode?: string,
  allowReserved?: string,
};

export type LinzEndpoint = {
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
  // note: short-hand applicable
  requestBody?: SenderBody;
  // note: short-hand applicable
  responses: {
    [status: number]: SenderBody | boolean | string;
    default?: SenderBody;
  };
  deprecated?: boolean;
  security?: Security<any>[];
  handler: (
    req: Readonly<HTTPRequest>,
    extensions: Extensions
  ) => Promise<HttpResponse<any> | HttpResponse<any>["payload"]["body"]>;
};

type MergeRecordType<T, U> = {
  [K in keyof T]: T[K] | U;
};
type MergeZodValues<T> = {
  [K in keyof T]: T[K] extends ZodType
    ? z.infer<T[K]>
    : (T[K] extends SenderBody ? z.infer<T[K]["body"]> : never)
}[keyof T];
type MergedResponse<T extends MergeRecordType<LinzEndpoint["responses"], ConstructorParameters<typeof JsonBody>[0]>>
  = MergeZodValues<T> extends infer R ? R : never;

export const METHODS = [ "get", "post", "put", "patch", "delete" ] as const;

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
  TBody extends NonNullable<LinzEndpoint["requestBody"]> | ConstructorParameters<typeof JsonBody>[0],
  TResponse extends MergeRecordType<LinzEndpoint["responses"], ConstructorParameters<typeof JsonBody>[0]>
>(endpoint: {
  tags?: Tag[];
  summary?: string;
  description?: string;
  operationId: string;
  parameters?: {
    query?: TQuery;
    header?: THeader;
    path?: TPath;
    cookie?: TCookie
  };
  requestBody?: TBody;
  responses: TResponse;
  deprecated?: boolean;
  security?: Security<any>[];
  handler: (
    req: Readonly<{
      queries: z.infer<TQuery>
      headers: z.infer<THeader>
      params: z.infer<TPath>
      cookies: z.infer<TCookie>
      body: z.infer<TBody extends SenderBody ? TBody["body"] : TBody>
    }>,
    extensions: TExt
  ) => Promise<MergedResponse<TResponse> | HttpResponse<MergedResponse<TResponse>>>;
}): LinzEndpoint {
  return {
    ...endpoint,
    ...(endpoint.requestBody && !(endpoint.requestBody instanceof SenderBody) && {
      requestBody: new JsonBody(endpoint.requestBody)
    }),
    responses: mapValues(endpoint.responses, (v) => (
      v instanceof z.ZodType ? new JsonBody(v) : v
    ))
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
}

type SecurityConfig = OpenAPIV3.SecuritySchemeObject & {
  name: string;
  handler: (req: Readonly<HTTPRequest>, extensions: Extensions) => Promise<void>;
};

export class Security<T> {
  public readonly inner: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.inner = config;
  }

  use(flow: string, scopes: string[]): this {
    return this;
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

export class ValidationError extends Error {
  constructor(public readonly msg: Record<string, any>) {
    super(JSON.stringify(msg));
  }
}

abstract class SenderBody<B extends z.ZodType = any> {
  /** for both `RequestBodyObject` and `ResponseObject` */
  private _description: string | null = null;
  /** for `ResponseObject` */
  private _headers: ZodObject<Record<string, ZodParameterTypes>> | null = null;
  /** for both `RequestBodyObject` and `ResponseObject` */
  private _examples: Record<string, OpenAPIV3.ExampleObject> | null = null;

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
  static readonly mimeType = "application/json";

  constructor(
    public readonly body: B
  ) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer> {
    return Buffer.from(JSON.stringify(data));
  }

  override get mimeType(): string {
    return JsonBody.mimeType;
  }
}

export class FormDataBody<
  B extends ZodObject<Record<string, ZodParameterTypes | z.ZodType<File, z.ZodTypeDef, File>>> = any,
  K extends keyof z.infer<B> = any
> extends SenderBody<B> {
  static readonly mimeType = "multipart/form-data";

  constructor(
    public readonly body: B,
    public readonly encoding?: Record<K, Readonly<EncodingItem>>
  ) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer> {
    const form = new FormData();
    
    for (const [ k, v ] of Object.entries(data)) {
      if (v instanceof File) {
        form.set(k, new FormDataFile([ v.slice() ], v.name, { type: v.type }), v.name);
      } else {
        form.set(k, String(v));
      }
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of new FormDataEncoder(form).encode()) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  override get mimeType(): string {
    return FormDataBody.mimeType;
  }
}

export class UrlEncodedBody<
  B extends ZodObject<Record<string, ZodParameterTypes>> | z.ZodType<URLSearchParams, z.ZodTypeDef, URLSearchParams> = any,
  K extends keyof z.infer<B> = any
> extends SenderBody<B> {
  static readonly mimeType = "application/x-www-form-urlencoded";

  constructor(
    public readonly body: B,
    public readonly encoding?: Record<K, Readonly<EncodingItem>>
  ) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer> {
    return Buffer.from(
      new URLSearchParams(data instanceof URLSearchParams ? data : mapValues(data, (v) => String(v))).toString()
    );
  }

  override get mimeType(): string {
    return UrlEncodedBody.mimeType;
  }
}

export class OctetStreamBody<B extends z.ZodType<Buffer, z.ZodTypeDef, Buffer> = any> extends SenderBody<B> {
  static readonly mimeType = "application/octet-stream";

  constructor(
    public readonly body: B = z.instanceof(Buffer) as B
  ) {
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
  static readonly mimeType = "text/plain";

  constructor(
    public readonly body: B = z.string() as B
  ) {
    super();
  }

  override async serialize<T extends z.TypeOf<B>>(data: T): Promise<Buffer> {
    return Buffer.from(data);
  }

  override get mimeType(): string {
    return TextBody.mimeType;
  }
}
