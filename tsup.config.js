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
          fs.mkdirSync("dist/templates", { recursive: true });

          for (const templateName of fs.readdirSync("src/templates")) {
            const apiDocTemplate = fs.readFileSync(`src/templates/${templateName}`, "utf-8");
            fs.writeFileSync(`dist/templates/${templateName}`, await minify(apiDocTemplate, {
              minifyJS: true,
              minifyCSS: true,
              collapseWhitespace: true
            }));
          }
        });
      }
    }
  ]
});
