import type { OpenAPIV3_1 } from "openapi-types";
import type { LinzEndpoint } from "../endpoint";
/**
 * Collects what operations share in an OpenAPI document. Each name has a single owner,
 * so a conflicting definition throws instead of silently replacing another one.
 */
export declare class SpecRegistry {
    private readonly operationIds;
    private readonly schemaOwners;
    private readonly schemas;
    private readonly securitySchemes;
    private readonly tags;
    /**
     * Registers the operation ID, security schemes and tags of an operation.
     */
    addOperation(operation: LinzEndpoint, path: string): void;
    addSchema(name: string, schema: OpenAPIV3_1.SchemaObject, owner: string): void;
    toComponents(): OpenAPIV3_1.ComponentsObject;
    getTags(): OpenAPIV3_1.TagObject[];
}
