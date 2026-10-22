import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  type BuilderConfig,
  buildJson,
  endpoint,
  FormDataBody,
  JsonBody,
  type LinzEndpoint,
  Security,
} from "../../src";

const build = (
  paths: BuilderConfig["paths"],
  additionalSchemas?: BuilderConfig["additionalSchemas"]
) =>
  buildJson({
    openapi: "3.1.0",
    info: { title: "Test", version: "1.0.0" },
    paths,
    ...(additionalSchemas && { additionalSchemas }),
  });

const ping = (operationId: string, extra: Partial<LinzEndpoint> = {}): LinzEndpoint => ({
  ...endpoint({
    operationId,
    responses: { 200: z.object({ ok: z.boolean() }) },
    handler: async () => ({ ok: true }),
  }),
  ...extra,
});

describe(buildJson.name, () => {
  const spec = buildJson({
    openapi: "3.1.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {
      "get:/users/:id": endpoint({
        operationId: "getUser",
        parameters: {
          path: z.object({ id: z.string().optional() }),
        },
        responses: {
          200: z.object({ name: z.string() }),
          404: z.object({ reason: z.string() }),
          299: z.object({ custom: z.string() }),
          default: z.object({ fallback: z.boolean() }),
        },
        handler: async () => ({ name: "linz" }),
      }),
      "post:/users": endpoint({
        operationId: "createUser",
        requestBody: z.object({ name: z.string() }),
        responses: { 201: z.object({ id: z.string() }) },
        handler: async () => ({ id: "1" }),
      }),
    },
  });

  it("should create a distinct response component per status, named after the status", () => {
    const schemas = spec.components?.schemas ?? {};

    expect(schemas["GetUserOkResponse"]).toMatchObject({ properties: { name: {} } });
    expect(schemas["GetUserNotFoundResponse"]).toMatchObject({ properties: { reason: {} } });
    expect(schemas["GetUserDefaultResponse"]).toMatchObject({ properties: { fallback: {} } });
  });

  it("should fall back to the status code for a non-standard status", () => {
    expect(spec.components?.schemas?.["GetUser299Response"]).toMatchObject({
      properties: { custom: {} },
    });
  });

  it("should reference the matching component from each response", () => {
    const responses = (spec.paths?.["/users/{id}"]?.get?.responses ?? {}) as Record<string, any>;
    const refOf = (status: string) => responses[status].content["application/json"].schema.$ref;

    expect(refOf("200")).toBe("#/components/schemas/GetUserOkResponse");
    expect(refOf("404")).toBe("#/components/schemas/GetUserNotFoundResponse");
    expect(refOf("299")).toBe("#/components/schemas/GetUser299Response");
    expect(refOf("default")).toBe("#/components/schemas/GetUserDefaultResponse");
  });

  it("should always mark path parameters as required", () => {
    const parameters = spec.paths?.["/users/{id}"]?.get?.parameters as Record<string, any>[];

    expect(parameters).toEqual([
      expect.objectContaining({ name: "id", in: "path", required: true }),
    ]);
  });

  it("should document 415 only for endpoints with a request body", () => {
    expect(spec.paths?.["/users"]?.post?.responses).toHaveProperty("415");
    expect(spec.paths?.["/users/{id}"]?.get?.responses).not.toHaveProperty("415");
  });
});

describe("schema io", () => {
  const spec = build({
    "post:/items": endpoint({
      operationId: "createItem",
      parameters: {
        query: z.object({ page: z.string().default("1"), size: z.string().transform(Number) }),
      },
      requestBody: z.object({ name: z.string(), status: z.string().default("draft") }),
      responses: { 201: z.object({ status: z.string().default("draft") }) },
      handler: async () => ({}),
    }),
  });
  const operation = spec.paths?.["/items"]?.post as Record<string, any>;
  const schemas = spec.components?.schemas as Record<string, any>;

  it("should document parameters as clients send them", () => {
    expect(operation["parameters"]).toEqual([
      { name: "page", in: "query", schema: { type: "string", default: "1" } },
      { name: "size", in: "query", required: true, schema: { type: "string" } },
    ]);
  });

  it("should document request bodies as clients send them", () => {
    expect(schemas["CreateItemRequestBody"].required).toEqual(["name"]);
  });

  it("should document responses as the server sends them", () => {
    expect(schemas["CreateItemCreatedResponse"].required).toEqual(["status"]);
  });
});

describe("body metadata", () => {
  const spec = build({
    "post:/files": endpoint({
      operationId: "upload",
      requestBody: new FormDataBody(z.object({ file: z.instanceof(File) }), {
        file: { headers: z.object({ "x-checksum": z.string().describe("SHA-256") }) },
      }).setExamples({ minimal: { summary: "Minimal upload", value: {} } }),
      responses: {
        201: new JsonBody(z.object({ id: z.string() }))
          .describe("The uploaded file")
          .requireHeaders(
            z.object({
              "x-rate-limit": z.string().describe("Remaining requests"),
              "x-trace": z.string().optional(),
            })
          )
          .setExamples({ created: { value: { id: "f_1" } } }),
        299: new JsonBody(z.object({ id: z.string() })),
      },
      handler: async () => ({ id: "f_1" }),
    }),
  });
  const operation = spec.paths?.["/files"]?.post as Record<string, any>;

  it("should use the described response description", () => {
    expect(operation["responses"]["201"].description).toBe("The uploaded file");
    expect(operation["responses"]["299"].description).toBe("No description");
  });

  it("should document required headers as response headers", () => {
    expect(operation["responses"]["201"].headers).toEqual({
      "x-rate-limit": {
        description: "Remaining requests",
        required: true,
        schema: { type: "string" },
      },
      "x-trace": { schema: { type: "string" } },
    });
  });

  it("should document examples of request and response bodies", () => {
    expect(operation["requestBody"].content["multipart/form-data"].examples).toEqual({
      minimal: { summary: "Minimal upload", value: {} },
    });
    expect(operation["responses"]["201"].content["application/json"].examples).toEqual({
      created: { value: { id: "f_1" } },
    });
  });

  it("should document encoding headers as header objects", () => {
    expect(operation["requestBody"].content["multipart/form-data"].encoding.file.headers).toEqual({
      "x-checksum": { description: "SHA-256", required: true, schema: { type: "string" } },
    });
  });
});

describe("conflicts", () => {
  const auth = new Security({
    name: "bearer",
    schema: { type: "http", scheme: "bearer" },
    handler: async () => {},
  });

  it("should reject duplicate operation IDs", () => {
    expect(() => build({ "get:/a": ping("getA"), "get:/b": ping("getA") })).toThrow(
      'Duplicate operation ID "getA"'
    );
  });

  it("should reject operation IDs that generate the same component name", () => {
    expect(() => build({ "get:/a": ping("getA"), "get:/b": ping("get-a") })).toThrow(
      'Schema component "GetAOkResponse" is defined by both operation "getA" and operation "get-a"'
    );
  });

  it("should reject additional schemas overwriting other components", () => {
    expect(() => build({ "get:/a": ping("getA") }, { jsonApiError: z.string() })).toThrow(
      'Schema component "JsonApiError" is defined by both the built-in error schema'
    );
    expect(() => build({ "get:/a": ping("getA") }, { getAOkResponse: z.string() })).toThrow(
      'Schema component "GetAOkResponse" is defined by both operation "getA"'
    );
  });

  it("should allow reusing one security scheme", () => {
    const spec = build({
      "get:/a": ping("getA", { security: [auth.apply([])] }),
      "get:/b": ping("getB", { security: [auth.apply(["read"])] }),
    });

    expect(Object.keys(spec.components?.securitySchemes ?? {})).toEqual(["bearer"]);
  });

  it("should reject different security schemes sharing a name", () => {
    const other = new Security({ ...auth, schema: { type: "apiKey", in: "header", name: "x" } });

    expect(() =>
      build({
        "get:/a": ping("getA", { security: [auth.apply([])] }),
        "get:/b": ping("getB", { security: [other.apply([])] }),
      })
    ).toThrow('Security scheme name "bearer" is used by different Security objects');
  });

  it("should merge equal tags by name", () => {
    const spec = build({
      "get:/a": ping("getA", { tags: [{ name: "users", description: "Users" }] }),
      "get:/b": ping("getB", { tags: [{ name: "users", description: "Users" }] }),
    });

    expect(spec.tags).toEqual([{ name: "users", description: "Users" }]);
  });

  it("should reject tags sharing a name with different properties", () => {
    expect(() =>
      build({
        "get:/a": ping("getA", { tags: [{ name: "users", description: "Users" }] }),
        "get:/b": ping("getB", { tags: [{ name: "users", description: "People" }] }),
      })
    ).toThrow('Tag "users" is defined more than once with different properties');
  });
});
