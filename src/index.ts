export * from "./adapter/engine-express";
export * from "./json-builder";
export * from "./utils";

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
  requestBody?: z.ZodFirstPartySchemaTypes;
  requestBodyType?: string;
  responses: {
    [status: number]: z.ZodFirstPartySchemaTypes | boolean;
    default?: z.ZodFirstPartySchemaTypes;
  };
  deprecated?: boolean;
  security?: Security<any>[];
  handler: (
    req: Readonly<HTTPRequest>,
    extensions: Extensions
  ) => Promise<HttpResponse<any> | HttpResponse<any>["body"]>;
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
  TQuery extends ZodObject<Record<string, ZodParameterTypes>>,
  THeader extends ZodObject<Record<string, ZodParameterTypes>>,
  TPath extends ZodObject<Record<string, ZodParameterTypes>>,
  TCookie extends ZodObject<Record<string, ZodParameterTypes>>,
  TBody extends z.ZodFirstPartySchemaTypes,
  TResponse extends {
    [status: number]: z.ZodFirstPartySchemaTypes | boolean;
    default?: z.ZodFirstPartySchemaTypes;
  }
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
  requestBodyType?: string;
  responses: TResponse;
  deprecated?: boolean;
  security?: Security<any>[];
  handler: (
    req: Readonly<{
      queries: z.infer<TQuery>
      headers: z.infer<THeader>
      params: z.infer<TPath>
      cookies: z.infer<TCookie>
      body: z.infer<TBody>;
    }>,
    extensions: TExt
  ) => Promise<MergedResponse<TResponse> | HttpResponse<MergedResponse<TResponse>>>;
}): LinzEndpoint {
  return endpoint as any;
}

export class HttpResponse<T> {
  public readonly headers?: Record<string, string>;
  public readonly status?: number;
  public readonly body?: T;
  public readonly stream?: boolean;

  constructor(payload: {
    headers?: HttpResponse<T>["headers"];
    status?: HttpResponse<T>["status"];
    body?: T;
    stream?: HttpResponse<T>["stream"];
  }) {
    this.headers = payload.headers;
    this.status = payload.status;
    this.body = payload.body;
    this.stream = payload.stream;
  }
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
