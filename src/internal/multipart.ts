// Modified from https://github.com/nachomazzara/parse-multipart-data

/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */

/**
 * Multipart Parser (Finite State Machine)
 * usage:
 * const multipart = require('./multipart.js');
 * const body = multipart.DemoData(); 							   // raw body
 * const body = Buffer.from(event['body-json'].toString(),'base64'); // AWS case
 * const boundary = multipart.getBoundary(event.params.header['content-type']);
 * const parts = multipart.Parse(body,boundary);
 * each part is:
 * { filename: 'A.txt', type: 'text/plain', data: <Buffer 41 41 41 41 42 42 42 42> }
 *  or { name: 'key', data: <Buffer 41 41 41 41 42 42 42 42> }
 */

import { randomBytes } from "crypto";

type Part = {
  headers: Record<string, string>;
  part: number[];
};

type Input = {
  headers: Record<string, string>;
  filename?: string;
  name?: string;
  type?: string;
  data: Buffer;
};

enum ParsingState {
  INIT,
  READING_HEADERS,
  READING_DATA,
  READING_PART_SEPARATOR,
}

export function parse(multipartBodyBuffer: Buffer, boundary: string): Input[] {
  let lastline = "";
  let state: ParsingState = ParsingState.INIT;
  let buffer: number[] = [];
  const allParts: Input[] = [];

  let currentPartHeaders: string[] = [];
  let formattedCurrentHeaders: Record<string, string> = {};

  for (let i = 0; i < multipartBodyBuffer.length; i++) {
    const oneByte: number = multipartBodyBuffer[i] ?? NaN;
    const prevByte: number | null = i > 0 ? (multipartBodyBuffer[i - 1] ?? null) : null;
    // 0x0a => \n
    // 0x0d => \r
    const newLineDetected: boolean = oneByte === 0x0a && prevByte === 0x0d;
    const newLineChar: boolean = oneByte === 0x0a || oneByte === 0x0d;

    if (!newLineChar) {
      lastline += String.fromCharCode(oneByte);
    }
    if (ParsingState.INIT === state && newLineDetected) {
      // searching for boundary
      if (`--${boundary}` === lastline) {
        state = ParsingState.READING_HEADERS; // found boundary. start reading headers
      }
      lastline = "";
    } else if (ParsingState.READING_HEADERS === state && newLineDetected) {
      // parsing headers. Headers are separated by an empty line from the content. Stop reading headers when the line is empty
      if (lastline.length) {
        currentPartHeaders.push(lastline);
      } else {
        // found empty line. search for the headers we want and set the values
        formattedCurrentHeaders = Object.fromEntries(
          currentPartHeaders.flatMap((h) => {
            const [header, content = ""] = h.split(":");

            return header?.trim() ? [[header.trim().toLowerCase(), content?.trim()]] : [];
          })
        );
        state = ParsingState.READING_DATA;
        buffer = [];
      }
      lastline = "";
    } else if (ParsingState.READING_DATA === state) {
      // parsing data
      if (lastline.length > boundary.length + 4) {
        lastline = ""; // mem save
      }
      if (`--${boundary}` === lastline) {
        const j = buffer.length - lastline.length;
        const part = buffer.slice(0, j - 1);

        allParts.push(process({ headers: formattedCurrentHeaders, part }));
        buffer = [];
        currentPartHeaders = [];
        formattedCurrentHeaders = {};
        lastline = "";
        state = ParsingState.READING_PART_SEPARATOR;
      } else {
        buffer.push(oneByte);
      }
      if (newLineDetected) {
        lastline = "";
      }
    } else if (ParsingState.READING_PART_SEPARATOR === state) {
      if (newLineDetected) {
        state = ParsingState.READING_HEADERS;
      }
    }
  }
  return allParts;
}

function process(part: Part): Input {
  // will transform this object:
  // { header: 'Content-Disposition: form-data; name="uploads[]"; filename="A.txt"',
  // info: 'Content-Type: text/plain',
  // part: 'AAAABBBB' }
  // into this one:
  // { filename: 'A.txt', type: 'text/plain', data: <Buffer 41 41 41 41 42 42 42 42> }
  const contentDisposition = parseContentDisposition(part.headers["content-disposition"] ?? "");

  const result = {
    headers: part.headers,
    name: contentDisposition["name"],
    data: Buffer.from(part.part),
    ...(contentDisposition["filename"] && {
      filename: contentDisposition["filename"],
      type: part.headers["content-type"]?.trim(),
    }),
  };

  return result as Input;
}

function parseContentDisposition(contentDisposition: string): Record<string, string | null> {
  const result: Record<string, string | null> = {
    type: null,
    name: null,
    filename: null,
  };

  // Split the header into parts
  const parts = contentDisposition.split(";").map((part) => part.trim());

  // The first part is the type
  if (parts[0]) {
    result["type"] = parts[0].toLowerCase();
  }

  // Process remaining parts for key-value pairs
  for (const part of parts.slice(1)) {
    const [key, value] = part.split("=").map((item) => item.trim());
    if (key && value) {
      // Remove quotes around value if present
      result[key.toLowerCase()] = value.replace(/^"|"$/g, "");
    }
  }

  return result;
}

export function generateBoundary(prefix = "----------------------"): string {
  return `--${prefix}${randomBytes(12).toString("hex")}`;
}

export async function encode(
  data: Record<string, (string | File)[]>,
  boundary = generateBoundary()
): Promise<Buffer> {
  const multipartFragments: Buffer[] = [];

  for (const [key, values] of Object.entries(data)) {
    for (const value of values) {
      multipartFragments.push(Buffer.from(`--${boundary}`));

      if (typeof value === "string") {
        multipartFragments.push(
          Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`),
          Buffer.from(value),
          Buffer.from("\r\n")
        );
      } else if (value instanceof File) {
        multipartFragments.push(
          Buffer.from(
            `Content-Disposition: form-data; name="${key}"; filename="${value.name}"\r\n`
          ),
          Buffer.from(`Content-Type: ${value.type || "application/octet-stream"}\r\n\r\n`),
          Buffer.from(await value.arrayBuffer()),
          Buffer.from("\r\n")
        );
      }
    }
  }

  multipartFragments.push(Buffer.from(`--${boundary}--\r\n`));

  return Buffer.concat(multipartFragments);
}
