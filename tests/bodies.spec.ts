import { z } from "zod";

import { FormDataBody, UrlEncodedBody } from "../src";
import { parseBody } from "../src/server/body-parser";

const schema = z.object({
  tag: z.array(z.string()),
  at: z.date(),
  optional: z.string().optional(),
});
const data = { tag: ["a", "b"], at: new Date("2026-01-02T03:04:05.000Z") };
const multiValue = { multiValueFormData: true, multiValueUrlEncoded: true };

describe(UrlEncodedBody.name, () => {
  it("should repeat array fields and leave out empty ones", async () => {
    const { buffer } = await new UrlEncodedBody(schema).serialize({ ...data, optional: undefined });

    expect(buffer.toString()).toBe("tag=a&tag=b&at=2026-01-02T03%3A04%3A05.000Z");
  });

  it("should serialize what the parser reads back", async () => {
    const { buffer } = await new UrlEncodedBody(schema).serialize(data);

    expect(parseBody(buffer, UrlEncodedBody.mimeType, multiValue)).toEqual({
      tag: ["a", "b"],
      at: ["2026-01-02T03:04:05.000Z"],
    });
  });
});

describe(FormDataBody.name, () => {
  it("should serialize what the parser reads back", async () => {
    const file = new File(["content"], "a.txt", { type: "text/plain" });
    const { buffer, headers } = await new FormDataBody(
      schema.extend({ file: z.instanceof(File) })
    ).serialize({ ...data, optional: undefined, file });

    const parsed = parseBody(buffer, String(headers["content-type"]), multiValue);

    expect(Object.keys(parsed)).toEqual(["tag", "at", "file"]);
    expect(parsed.tag).toEqual(["a", "b"]);
    expect(parsed.at).toEqual(["2026-01-02T03:04:05.000Z"]);
    expect(await parsed.file[0].text()).toBe("content");
  });
});
