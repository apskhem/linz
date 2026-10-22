import { encode, generateBoundary } from "../src/internal/multipart";
import { BodyParserError, parseBody, parseCookies } from "../src/internal/middlewares";

function expectParserError(fn: () => unknown, statusCode: number) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(BodyParserError);
    expect((err as BodyParserError).statusCode).toBe(statusCode);
    return;
  }
  throw new Error("Expected a BodyParserError to be thrown");
}

describe(parseCookies.name, () => {
  it("should decode cookie values", () => {
    expect(parseCookies("a=1; b=hello%20world")).toEqual({ a: "1", b: "hello world" });
  });

  it("should keep the raw value of a malformed cookie instead of throwing", () => {
    expect(parseCookies("bad=%E0%A4%A; good=ok")).toEqual({ bad: "%E0%A4%A", good: "ok" });
  });
});

describe(parseBody.name, () => {
  const urlEncoded = Buffer.from("tag=a&tag=b&single=x");

  it("should keep only the last url-encoded value by default", () => {
    expect(parseBody(urlEncoded, "application/x-www-form-urlencoded")).toEqual({
      tag: "b",
      single: "x",
    });
  });

  it("should keep all url-encoded values when multiValueUrlEncoded is enabled", () => {
    expect(
      parseBody(urlEncoded, "application/x-www-form-urlencoded", { multiValueUrlEncoded: true })
    ).toEqual({ tag: ["a", "b"], single: ["x"] });
  });

  it("should keep all form-data values when multiValueFormData is enabled", async () => {
    const boundary = generateBoundary();
    const body = await encode({ tag: ["a", "b"] }, boundary);

    expect(
      parseBody(body, `multipart/form-data; boundary=${boundary}`, { multiValueFormData: true })
    ).toEqual({ tag: ["a", "b"] });
  });

  it("should reject a form-data part with an invalid content type as 400", () => {
    const boundary = "xyz";
    const body = Buffer.from(
      [
        `--${boundary}`,
        'Content-Disposition: form-data; name="a"',
        "Content-Type: not a content type",
        "",
        "value",
        `--${boundary}--`,
        "",
      ].join("\r\n")
    );

    expectParserError(() => parseBody(body, `multipart/form-data; boundary=${boundary}`), 400);
  });

  it("should decode text bodies with their charset", () => {
    expect(parseBody(Buffer.from("héllo"), "text/plain")).toBe("héllo");
    expect(parseBody(Buffer.from("héllo", "latin1"), "text/html; charset=latin1")).toBe("héllo");
  });

  it("should reject a content type other than the expected one as 415", () => {
    expectParserError(
      () =>
        parseBody(Buffer.from("a=1"), "application/x-www-form-urlencoded", {}, "application/json"),
      415
    );
  });

  it("should accept the expected content type regardless of its parameters", () => {
    expect(
      parseBody(Buffer.from('{"a":1}'), "application/json; charset=utf-8", {}, "application/json")
    ).toEqual({ a: 1 });
  });

  it("should reject an unsupported charset as 415", () => {
    expectParserError(
      () => parseBody(Buffer.from("{}"), "application/json; charset=x-unknown"),
      415
    );
  });
});
