import * as http from "node:http";

import pino from "pino";

import { createApp } from "./app";
import { config } from "./config";

const logger = pino({ level: config.logLevel });
const server = http.createServer(createApp(logger).handler());

server.listen(config.port, () => {
  const url = `http://localhost:${config.port}`;
  logger.info(`Listening on ${url}, docs at ${url}/docs`);
});

// let in-flight requests finish before exiting, e.g. when a container is stopped
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  });
}
