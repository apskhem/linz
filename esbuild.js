const esbuild = require("esbuild");
const { execSync } = require('child_process');

console.log('Generating .d.ts files...');
execSync('npx tsc --emitDeclarationOnly');

esbuild.build({
  entryPoints: [ "src/index.ts" ],
  bundle: true,
  sourcemap: true,
  minify: false,
  platform: "node",
  packages: "external",
  outfile: "dist/index.js"
}).catch(() => process.exit(1));
