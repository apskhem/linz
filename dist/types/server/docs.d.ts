export declare const DOCS_VIEWERS: {
    readonly scalar: {
        readonly template: string;
        readonly defaultTheme: "purple";
    };
    readonly swagger: {
        readonly template: string;
        readonly defaultTheme: "classic";
    };
    readonly redoc: {
        readonly template: string;
        readonly defaultTheme: "";
    };
    readonly rapidoc: {
        readonly template: string;
        readonly defaultTheme: "";
    };
    readonly "spotlight-elements": {
        readonly template: string;
        readonly defaultTheme: "";
    };
};
export type DocsViewer = keyof typeof DOCS_VIEWERS;
type DocsValues = {
    title: string;
    specUrl: string;
    theme?: string | undefined;
};
/**
 * Renders a docs page. `{{name}}` is escaped for HTML, and `{{js:name}}` is escaped
 * for use inside a quoted JavaScript string literal.
 */
export declare function renderDocsPage(viewer: DocsViewer, values: DocsValues): string;
export {};
