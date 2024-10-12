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
  requestBody?: RequestBody;
  responses: {
    [status: number]: z.ZodFirstPartySchemaTypes | boolean | string;
    default?: z.ZodFirstPartySchemaTypes;
  };
  deprecated?: boolean;
  security?: Security<any>[];
  handler: (
    req: Readonly<HTTPRequest>,
    extensions: Extensions
  ) => Promise<HttpResponse<any> | HttpResponse<any>["payload"]["body"]>;
};

type MergeNonBooleanValues<T> = {
  [K in keyof T]: T[K] extends ZodType ? z.infer<T[K]> : never
}[keyof T];
type MergedResponse<T extends LinzEndpoint["responses"]> = MergeNonBooleanValues<T> extends infer R ? R : never;

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
  TResponse extends LinzEndpoint["responses"]
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
      body: z.infer<TBody extends RequestBody ? TBody["body"] : TBody>
    }>,
    extensions: TExt
  ) => Promise<MergedResponse<TResponse> | HttpResponse<MergedResponse<TResponse>>>;
}): LinzEndpoint {
  return {
    ...endpoint,
    ...(endpoint.requestBody && !(endpoint.requestBody instanceof RequestBody) && {
      requestBody: new JsonBody(endpoint.requestBody)
    })
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

abstract class RequestBody<B extends z.ZodType = any> {
  private _desc: string | null = null;

  abstract readonly body: B;
  abstract mimeType: string;

  describe(description: string): this {
    this._desc = description;
    return this;
  }

  get description(): string | null {
    return this._desc;
  }
}

export class JsonBody<B extends z.ZodFirstPartySchemaTypes = any> extends RequestBody<B> {
  static readonly mimeType = "application/json";

  constructor(
    public readonly body: B
  ) {
    super();
  }

  override get mimeType(): string {
    return JsonBody.mimeType;
  }
}

export class FormDataBody<
  B extends ZodObject<Record<string, z.ZodString | z.ZodType<File, z.ZodTypeDef, File>>> = any,
  K extends keyof z.infer<B> = any
> extends RequestBody<B> {
  static readonly mimeType = "multipart/form-data";

  constructor(
    public readonly body: B,
    public readonly encoding?: Record<K, Readonly<EncodingItem>>
  ) {
    super();
  }

  override get mimeType(): string {
    return FormDataBody.mimeType;
  }
}

export class UrlEncodedBody<
  B extends ZodObject<Record<string, ZodParameterTypes>> = any,
  K extends keyof z.infer<B> = any
> extends RequestBody<B> {
  static readonly mimeType = "application/x-www-form-urlencoded";

  constructor(
    public readonly body: B,
    public readonly encoding?: Record<K, Readonly<EncodingItem>>
  ) {
    super();
  }

  override get mimeType(): string {
    return UrlEncodedBody.mimeType;
  }
}

export class OctetStreamBody<B extends z.ZodType<Buffer, z.ZodTypeDef, Buffer> = any> extends RequestBody<B> {
  static readonly mimeType = "application/octet-stream";

  constructor(
    public readonly body: B
  ) {
    super();
  }

  override get mimeType(): string {
    return OctetStreamBody.mimeType;
  }
}
