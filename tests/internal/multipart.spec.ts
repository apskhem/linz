import { encode, generateBoundary, parse } from "../../src/internal/multipart";

describe("multipart", () => {
  it("should terminate every boundary line with CRLF when encoding", async () => {
    const boundary = generateBoundary();
    const raw = (await encode({ a: ["1"], b: ["2"] }, boundary)).toString();

    expect(raw.startsWith(`--${boundary}\r\nContent-Disposition`)).toBe(true);
    expect(raw.split(`--${boundary}\r\n`)).toHaveLength(3);
    expect(raw.endsWith(`--${boundary}--\r\n`)).toBe(true);
  });

  it("should round-trip fields and files through encode and parse", async () => {
    const boundary = generateBoundary();
    const file = new File(["hello\r\nworld"], "a.txt", { type: "text/plain" });
    const parts = parse(await encode({ name: ["linz"], doc: [file] }, boundary), boundary);

    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ name: "name" });
    expect(Buffer.from(parts[0]!.data).toString()).toBe("linz");
    expect(parts[1]).toMatchObject({ name: "doc", filename: "a.txt", type: "text/plain" });
    expect(Buffer.from(parts[1]!.data).toString()).toBe("hello\r\nworld");
  });

  it("should produce a body that a standard multipart parser accepts", async () => {
    const boundary = generateBoundary();
    const body = await encode({ name: ["linz"], doc: [new File(["x"], "a.txt")] }, boundary);
    const form = await new Response(new Uint8Array(body), {
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    }).formData();

    expect(form.get("name")).toBe("linz");
    expect((form.get("doc") as File).name).toBe("a.txt");
  });
});
