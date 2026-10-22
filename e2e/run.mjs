// Starts the e2e server on a free port, runs every Hurl file against it, and exits with Hurl's status.
// Extra arguments are passed on to Hurl, e.g. `npm run test:e2e -- --very-verbose`.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { startServer } from "./server.mjs";

const testsDir = join(dirname(fileURLToPath(import.meta.url)), "tests");
const files = readdirSync(testsDir)
  .filter((file) => file.endsWith(".hurl"))
  .sort()
  .map((file) => join(testsDir, file));

const server = await startServer(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const hurl = spawn(
  "hurl",
  [
    "--test",
    "--variable",
    `base_url=${baseUrl}`,
    // uploaded files are read from (and only from) the fixtures directory
    "--file-root",
    join(testsDir, "fixtures"),
    ...process.argv.slice(2),
    ...files,
  ],
  { stdio: "inherit", shell: process.platform === "win32" }
);

const exitCode = await new Promise((resolve) => {
  hurl.on("error", (err) => {
    console.error(`Could not run hurl (${err.message}), install dependencies with \`npm install\``);
    resolve(1);
  });
  hurl.on("close", (code) => resolve(code ?? 1));
});

server.close();
process.exit(exitCode);
