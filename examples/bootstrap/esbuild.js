const esbuild = require("esbuild");

esbuild.buildSync({
  entryPoints: [ "src/main.ts" ],
  bundle: true,
  sourcemap: true,
  minifyWhitespace: true,
  minifySyntax: true,
  platform: "node",
  packages: "external",
  outfile: "dist/main.js"
});
