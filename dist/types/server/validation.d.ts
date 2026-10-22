import type { HTTPMessage, LinzEndpoint } from "../endpoint";
export declare class PayloadValidationError extends Error {
    errors: {
        in: keyof HTTPMessage;
        result: any;
    }[];
    constructor();
    addIssue(issue: PayloadValidationError["errors"][number]): void;
    hasIssue(): boolean;
}
export declare function formatIncomingRequest(message: Record<keyof HTTPMessage, any>, validator: LinzEndpoint): Readonly<HTTPMessage>;
