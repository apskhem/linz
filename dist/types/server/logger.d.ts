export interface Logger {
    emergency?: (message: string, ...meta: any[]) => void;
    alert?: (message: string, ...meta: any[]) => void;
    critical?: (message: string, ...meta: any[]) => void;
    error?: (message: string, ...meta: any[]) => void;
    warning?: (message: string, ...meta: any[]) => void;
    notice?: (message: string, ...meta: any[]) => void;
    info?: (message: string, ...meta: any[]) => void;
    debug?: (message: string, ...meta: any[]) => void;
}
/**
 * Includes the stack trace in the message itself, since not every logger
 * (e.g. pino) keeps extra arguments that do not match a format placeholder.
 */
export declare function formatError(err: unknown): string;
