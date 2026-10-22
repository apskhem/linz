import type { OpenAPIV3_1 } from "openapi-types";
import { isEqual } from "radash";

import type { LinzEndpoint } from "../endpoint";
import type { Security } from "../security";

/**
 * Collects what operations share in an OpenAPI document. Each name has a single owner,
 * so a conflicting definition throws instead of silently replacing another one.
 */
export class SpecRegistry {
  private readonly operationIds = new Set<string>();
  private readonly schemaOwners = new Map<string, string>();
  private readonly schemas: Record<string, OpenAPIV3_1.SchemaObject> = {};
  private readonly securitySchemes = new Map<string, Security>();
  private readonly tags = new Map<string, OpenAPIV3_1.TagObject>();

  /**
   * Registers the operation ID, security schemes and tags of an operation.
   */
  addOperation(operation: LinzEndpoint, path: string): void {
    if (this.operationIds.has(operation.operationId)) {
      throw new Error(`Duplicate operation ID "${operation.operationId}" for path ${path}`);
    }
    this.operationIds.add(operation.operationId);

    for (const { security } of operation.security ?? []) {
      const existing = this.securitySchemes.get(security.name);
      if (existing && existing !== security) {
        throw new Error(
          `Security scheme name "${security.name}" is used by different Security objects`
        );
      }
      this.securitySchemes.set(security.name, security);
    }

    for (const tag of operation.tags ?? []) {
      const existing = this.tags.get(tag.name);
      if (existing && !isEqual(existing, tag)) {
        throw new Error(`Tag "${tag.name}" is defined more than once with different properties`);
      }
      this.tags.set(tag.name, existing ?? tag);
    }
  }

  addSchema(name: string, schema: OpenAPIV3_1.SchemaObject, owner: string): void {
    const existingOwner = this.schemaOwners.get(name);
    if (existingOwner) {
      throw new Error(
        `Schema component "${name}" is defined by both ${existingOwner} and ${owner}`
      );
    }
    this.schemaOwners.set(name, owner);
    this.schemas[name] = schema;
  }

  toComponents(): OpenAPIV3_1.ComponentsObject {
    return {
      schemas: this.schemas,
      ...(this.securitySchemes.size && {
        securitySchemes: Object.fromEntries(
          [...this.securitySchemes.values()].map((sec) => [sec.name, sec.schema])
        ),
      }),
    };
  }

  getTags(): OpenAPIV3_1.TagObject[] {
    return [...this.tags.values()];
  }
}
