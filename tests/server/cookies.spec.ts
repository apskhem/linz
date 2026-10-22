import { parseCookies } from "../../src/server/cookies";

describe(parseCookies.name, () => {
  it("should decode cookie values", () => {
    expect(parseCookies("a=1; b=hello%20world")).toEqual({ a: "1", b: "hello world" });
  });

  it("should keep the raw value of a malformed cookie instead of throwing", () => {
    expect(parseCookies("bad=%E0%A4%A; good=ok")).toEqual({ bad: "%E0%A4%A", good: "ok" });
  });
});
