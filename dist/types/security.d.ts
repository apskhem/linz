import type * as http from "http";
import type { OpenAPIV3_1 as OpenAPIType } from "openapi-types";
export type Extensions<T extends Record<string, any> = Record<string, any>> = T;
interface SecurityConfig {
    name: string;
    schema: OpenAPIType.SecuritySchemeObject;
    handler: (req: Readonly<http.IncomingMessage>, scopes: string[], extensions: Extensions) => Promise<void>;
}
export declare class Security implements SecurityConfig {
    readonly name: string;
    readonly schema: OpenAPIType.SecuritySchemeObject;
    readonly handler: (req: Readonly<http.IncomingMessage>, scopes: string[], extensions: Extensions) => Promise<void>;
    constructor(config: SecurityConfig);
    apply(scopes: string[]): AppliedSecurity;
}
export declare class AppliedSecurity {
    readonly scopes: string[];
    readonly security: Security;
    constructor(usedSecurity: Security, scopes: string[]);
    authenticate(req: Readonly<http.IncomingMessage>, extensions: Extensions): Promise<void>;
}
/**
 * Follows OpenAPI semantics where the listed security requirements are alternatives.
 * Each attempt gets its own extensions object so a failed attempt cannot leak partial state.
 * Throws the first failure when none of them passes.
 */
export declare function authenticateAny(securities: AppliedSecurity[], req: http.IncomingMessage, extensions: Record<string, any>): Promise<void>;
export {};
