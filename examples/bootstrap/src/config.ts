/**
 * Settings read from environment variables, with defaults for local development.
 */
export const config = {
  port: Number(process.env["PORT"] ?? 3000),
  /**
   * The token clients send as `Authorization: Bearer <token>`.
   * Always set your own outside local development.
   */
  apiToken: process.env["API_TOKEN"] ?? "dev-token",
  logLevel: process.env["LOG_LEVEL"] ?? "info",
};
