import * as fs from "fs";
import { minify } from "html-minifier-terser";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  outDir: "dist",
  platform: "node",
  // declarations are emitted by `tsc`, see `tsconfig.build.json`
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  esbuildPlugins: [
    {
      // inlines doc templates as strings, so the bundle does not depend on `__dirname` (absent in ESM)
      name: "inline-doc-templates",
      setup(build) {
        build.onLoad({ filter: /\.hbs$/ }, async (args) => ({
          contents: await minify(await fs.promises.readFile(args.path, "utf-8"), {
            minifyJS: true,
            minifyCSS: true,
            collapseWhitespace: true
          }),
          loader: "text"
        }));
      }
    }
  ]
});
