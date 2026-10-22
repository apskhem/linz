import { writeFileSync } from "node:fs";

import { openApiDocument } from "../src/openapi";

// Writes the OpenAPI document to `openapi.json`, to generate API clients from it
// or to review API changes in pull requests.
const file = new URL("../openapi.json", import.meta.url);
writeFileSync(file, `${JSON.stringify(openApiDocument, null, 2)}\n`);

console.log(`Wrote ${file.pathname}`);
