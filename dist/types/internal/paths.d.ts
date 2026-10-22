import type { HttpMethod } from "../endpoint";
/**
 * Splits an endpoint key such as `get:/users/:id` into its method and path.
 */
export declare function parseMethodPath(methodPath: string): {
    method: HttpMethod;
    path: string;
};
export declare function convertPathParams(path: string): {
    path: string;
    params: string[];
};
export declare function cleanPath(path: string): string;
