import { z } from "zod";

import { buildJson, endpoint } from "../src";

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
