// Measures HTTP throughput of each scenario against Linz and against the bare router, then prints
// a comparison. Each server runs in its own process so it does not share a CPU with the load.
// Options: `--duration <seconds>` (default 10), `--connections <n>` (default 100),
// `--only <scenario>` to run a single scenario, e.g. `npm run bench -- --only hello`.
import { fork } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import autocannon from "autocannon";

const { values: options } = parseArgs({
  options: {
    duration: { type: "string", default: "10" },
    connections: { type: "string", default: "100" },
    only: { type: "string" },
  },
});

const scenarios = [
  { name: "hello", description: "GET, no input", method: "GET", path: "/hello" },
  {
    name: "params",
    description: "GET, path and query parameters",
    method: "GET",
    path: "/users/42?fields=name,email",
  },
  {
    name: "json-body",
    description: "POST, JSON body",
    method: "POST",
    path: "/notes",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Groceries", tags: ["home", "weekly"] }),
  },
].filter((scenario) => !options.only || scenario.name === options.only);

if (!scenarios.length) {
  console.error(`Unknown scenario "${options.only}"`);
  process.exit(1);
}

const serverPath = join(dirname(fileURLToPath(import.meta.url)), "server.mjs");

async function startServer(name) {
  const child = fork(serverPath, [name], { stdio: ["ignore", "inherit", "inherit", "ipc"] });
  const { port } = await new Promise((resolve, reject) => {
    child.once("message", resolve);
    child.once("exit", (code) => reject(new Error(`Server "${name}" exited with code ${code}`)));
  });
  return { child, url: `http://127.0.0.1:${port}` };
}

async function measure(url, scenario, duration = Number(options.duration)) {
  const result = await autocannon({
    url: url + scenario.path,
    method: scenario.method,
    headers: scenario.headers,
    body: scenario.body,
    duration,
    connections: Number(options.connections),
  });

  const failures = result.errors + result.timeouts + result.non2xx;
  if (failures) {
    throw new Error(`${scenario.name}: ${failures} of ${result.requests.total} requests failed`);
  }

  return {
    rps: result.requests.average,
    avg: result.latency.average,
    p50: result.latency.p50,
    p99: result.latency.p99,
  };
}

const results = [];
for (const name of ["router", "linz"]) {
  // oxlint-disable-next-line no-await-in-loop -- runs one at a time, concurrent runs would compete for the CPU
  const server = await startServer(name);
  try {
    for (const scenario of scenarios) {
      // warms up the JIT so the measured run is steady
      // oxlint-disable-next-line no-await-in-loop -- runs one at a time, concurrent runs would compete for the CPU
      await measure(server.url, scenario, 1);
      console.error(`${name} / ${scenario.name}...`);
      // oxlint-disable-next-line no-await-in-loop -- runs one at a time, concurrent runs would compete for the CPU
      const stats = await measure(server.url, scenario);
      results.push({ server: name, scenario: scenario.name, ...stats });
    }
  } finally {
    server.child.disconnect();
  }
}

const format = (n) => Math.round(n).toLocaleString("en-US");

console.log(
  `\nNode ${process.version}, ${options.connections} connections, ${options.duration}s per run\n`
);
console.table(
  scenarios.map((scenario) => {
    const [router, linz] = ["router", "linz"].map((name) =>
      results.find((r) => r.server === name && r.scenario === scenario.name)
    );
    return {
      scenario: `${scenario.name} (${scenario.description})`,
      "router req/s": format(router.rps),
      "linz req/s": format(linz.rps),
      "linz/router": `${((linz.rps / router.rps) * 100).toFixed(0)}%`,
      "router avg ms": router.avg.toFixed(2),
      "linz avg ms": linz.avg.toFixed(2),
      "linz p50/p99 ms": `${linz.p50} / ${linz.p99}`,
    };
  })
);
