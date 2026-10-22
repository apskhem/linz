import rapidocTemplate from "../templates/rapidoc.hbs";
import redocTemplate from "../templates/redoc.hbs";
import scalarTemplate from "../templates/scalar.hbs";
import spotlightElementsTemplate from "../templates/spotlight-elements.hbs";
import swaggerTemplate from "../templates/swagger.hbs";

// note: defaults live here rather than in the templates, as minifying folds `"{{js:theme}}" || "x"` away
export const DOCS_VIEWERS = {
  scalar: { template: scalarTemplate, defaultTheme: "purple" },
  swagger: { template: swaggerTemplate, defaultTheme: "classic" },
  redoc: { template: redocTemplate, defaultTheme: "" },
  rapidoc: { template: rapidocTemplate, defaultTheme: "" },
  "spotlight-elements": { template: spotlightElementsTemplate, defaultTheme: "" },
} as const;

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
export function renderDocsPage(viewer: DocsViewer, values: DocsValues): string {
  const { template, defaultTheme } = DOCS_VIEWERS[viewer];
  const resolvedValues: Record<string, string> = {
    ...values,
    theme: values.theme || defaultTheme,
  };

  return template.replace(/\{\{(js:)?(\w+)\}\}/g, (_, js: string | undefined, key: string) => {
    const value = resolvedValues[key] ?? "";

    return js ? escapeJsString(value) : escapeHtml(value);
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsString(value: string): string {
  // works within either quote style, and `<` cannot close the surrounding script tag
  return JSON.stringify(value).slice(1, -1).replace(/'/g, "\\u0027").replace(/</g, "\\u003c");
}
