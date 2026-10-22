import type * as http from "http";
import type { CorsOptions } from "cors";
import type { OpenAPIV3_1 } from "openapi-types";
import type { RequestBodyConfig } from "./body-parser";
import type { DocsViewer } from "./docs";
import type { Logger } from "./logger";
export type CreateApiConfig = {
    /**
     * CORS configurations, `true` means permissive CORS.
     */
    cors: boolean | CorsOptions;
    /**
     * Configurations related to OpenAPI documents.
     */
    docs: {
        /**
         * The documents viewer.
         */
        viewer: DocsViewer;
        /**
         * The OpenAPI spec.
         */
        spec: OpenAPIV3_1.Document;
        /**
         * The path for users to view the docs.
         * The docs will render to the set `viewer`.
         */
        docsPath: string;
        /**
         * The path get the OpenAPI spec file in JSON.
         */
        specPath: string;
        /**
         * The theme configurations for the docs viewer.
         */
        theme?: string;
    };
    /**
     * Incoming requests configurations.
     * Applies to all endpoints.
     */
    request: RequestBodyConfig;
    logger: Logger;
    fallbackHandler: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
    /**
     * Registers the catch-all 404 handler (which runs `fallbackHandler` first) after the endpoints.
     * Disable it to mount more routes on the same router after `createApi`,
     * then mount `notFoundHandler(config)` last yourself.
     *
     * @default true
     */
    notFound: boolean;
};
