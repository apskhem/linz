// `tsc` emits CommonJS-style declarations into `dist/types`. ES module importers resolve this
// `.d.mts` file instead, so TypeScript treats the `import` entry point as an ES module too.
import { writeFileSync } from "node:fs";

writeFileSync(
  new URL("../dist/index.d.mts", import.meta.url),
  'export * from "./types/index.js";\n'
);
