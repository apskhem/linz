import { DOCS_VIEWERS, type DocsViewer, renderDocsPage } from "../src/internal/docs";

const viewers = Object.keys(DOCS_VIEWERS) as DocsViewer[];

describe(renderDocsPage.name, () => {
  it.each(viewers)("should fill every placeholder of %s", (viewer) => {
    const html = renderDocsPage(viewer, { title: "API", specUrl: "/openapi.json" });

    expect(html).not.toMatch(/\{\{.*?\}\}/);
    expect(html).toContain("<title>API</title>");
    expect(html).toContain("/openapi.json");
  });

  it.each(viewers)("should load pinned assets with integrity checks for %s", (viewer) => {
    const html = renderDocsPage(viewer, { title: "API", specUrl: "/openapi.json" });
    const assetTags = html.match(/<(script|link)\b[^>]*\b(src|href)="https?:[^>]*>/g) ?? [];

    expect(assetTags.length).toBeGreaterThan(0);
    for (const tag of assetTags) {
      expect(tag).toMatch(/@\d+\.\d+\.\d+\//);
      expect(tag).toMatch(/integrity="sha384-[\w+/=]+"/);
      expect(tag).toContain('crossorigin="anonymous"');
    }
  });

  it("should escape the title for HTML", () => {
    const html = renderDocsPage("scalar", {
      title: `</title><script>alert("x")</script>`,
      specUrl: "/openapi.json",
    });

    expect(html).toContain(
      "<title>&lt;/title&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</title>"
    );
  });

  it("should escape values used inside JavaScript strings", () => {
    const html = renderDocsPage("swagger", {
      title: "API",
      specUrl: `/spec.json?a=1&b="2"</script>'`,
    });

    expect(html).toContain('url: "/spec.json?a=1&b=\\"2\\"\\u003c/script>\\u0027"');
    expect(html).not.toContain("</script>'");
  });

  it("should apply the viewer default theme unless one is given", () => {
    expect(renderDocsPage("scalar", { title: "API", specUrl: "/s" })).toContain('theme: "purple"');
    expect(renderDocsPage("swagger", { title: "API", specUrl: "/s" })).toContain(
      'theme: "classic"'
    );
    expect(renderDocsPage("scalar", { title: "API", specUrl: "/s", theme: "moon" })).toContain(
      'theme: "moon"'
    );
  });
});
