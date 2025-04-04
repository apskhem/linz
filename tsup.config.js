import * as fs from "fs";
import { minify } from "html-minifier-terser";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  outDir: "dist",
  platform: "node",
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  esbuildPlugins: [
    {
      name: "copy-doc-templates",
      setup(build) {
        build.onEnd(async () => {
          const apiDocTemplate = fs.readFileSync("src/doc-template.hbs", "utf-8");
          fs.writeFileSync("dist/doc-template.hbs", await minify(apiDocTemplate, {
            minifyJS: true,
            collapseWhitespace: true
          }))
        });
      }
    }
  ]
});
