import type * as http from "http";

import type { OpenAPIV3_1 as OpenAPIType } from "openapi-types";

export type Extensions<T extends Record<string, any> = Record<string, any>> = T;

interface SecurityConfig {
  name: string;
  schema: OpenAPIType.SecuritySchemeObject;
  handler: (
    req: Readonly<http.IncomingMessage>,
    scopes: string[],
    extensions: Extensions
  ) => Promise<void>;
}

export class Security implements SecurityConfig {
  public readonly name: string;
  public readonly schema: OpenAPIType.SecuritySchemeObject;
  public readonly handler: (
    req: Readonly<http.IncomingMessage>,
    scopes: string[],
    extensions: Extensions
  ) => Promise<void>;

  constructor(config: SecurityConfig) {
    this.name = config.name;
    this.schema = config.schema;
    this.handler = config.handler;
  }

  apply(scopes: string[]): AppliedSecurity {
    return new AppliedSecurity(this, scopes);
  }
}

export class AppliedSecurity {
  public readonly scopes: string[];
  public readonly security: Security;

  constructor(usedSecurity: Security, scopes: string[]) {
    this.scopes = scopes;
    this.security = usedSecurity;
  }

  async authenticate(req: Readonly<http.IncomingMessage>, extensions: Extensions) {
    await this.security.handler(req, this.scopes, extensions);
  }
}

/**
 * Follows OpenAPI semantics where the listed security requirements are alternatives.
 * Each attempt gets its own extensions object so a failed attempt cannot leak partial state.
 * Throws the first failure when none of them passes.
 */
export async function authenticateAny(
  securities: AppliedSecurity[],
  req: http.IncomingMessage,
  extensions: Record<string, any>
): Promise<void> {
  let firstError: unknown;

  for (const secOp of securities) {
    const attemptExtensions = {};
    try {
      // oxlint-disable-next-line no-await-in-loop -- tried in order, stopping at the first that passes
      await secOp.authenticate(req, attemptExtensions);
      Object.assign(extensions, attemptExtensions);
      return;
    } catch (err) {
      firstError ??= err;
    }
  }

  throw firstError;
}
