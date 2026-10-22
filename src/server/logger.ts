export interface Logger {
  emergency?: (message: string, ...meta: any[]) => void; // Level 0
  alert?: (message: string, ...meta: any[]) => void; // Level 1
  critical?: (message: string, ...meta: any[]) => void; // Level 2
  error?: (message: string, ...meta: any[]) => void; // Level 3
  warning?: (message: string, ...meta: any[]) => void; // Level 4
  notice?: (message: string, ...meta: any[]) => void; // Level 5
  info?: (message: string, ...meta: any[]) => void; // Level 6
  debug?: (message: string, ...meta: any[]) => void; // Level 7
}

/**
 * Includes the stack trace in the message itself, since not every logger
 * (e.g. pino) keeps extra arguments that do not match a format placeholder.
 */
export function formatError(err: unknown): string {
  return err instanceof Error ? (err.stack ?? String(err)) : String(err);
}
