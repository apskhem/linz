import { z } from "zod";

import { applyGroupConfig, endpoint, type LinzEndpointGroup, Security } from "../src";

const auth = new Security({
  name: "bearer",
  schema: { type: "http", scheme: "bearer" },
  handler: async () => {},
});

function createGroup(): LinzEndpointGroup {
  return {
    "get:/a": endpoint({
      operationId: "getA",
      tags: [{ name: "own" }],
      hidden: false,
      responses: { 200: z.object({}) },
      handler: async () => ({}),
    }),
  };
}

describe(applyGroupConfig.name, () => {
  it("should not mutate the given group", () => {
    const group = createGroup();
    const original = group["get:/a"]!;

    applyGroupConfig(group, { tags: [{ name: "shared" }], security: [auth.apply([])] });

    expect(group["get:/a"]).toBe(original);
    expect(original.tags).toEqual([{ name: "own" }]);
    expect(original.security).toBeUndefined();
  });

  it("should not duplicate tags or securities when applied more than once", () => {
    const tag = { name: "shared" };
    const security = auth.apply([]);
    const config = { tags: [tag], security: [security] };

    const result = applyGroupConfig(applyGroupConfig(createGroup(), config), config)["get:/a"]!;

    expect(result.tags).toEqual([{ name: "own" }, tag]);
    expect(result.security).toEqual([security]);
  });

  it("should keep explicitly set endpoint flags", () => {
    const result = applyGroupConfig(createGroup(), { hidden: true, deprecated: true })["get:/a"]!;

    expect(result.hidden).toBe(false);
    expect(result.deprecated).toBe(true);
  });
});
