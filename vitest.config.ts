import { readFileSync } from "node:fs";

import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      // mirrors the build, which inlines doc templates as strings
      name: "hbs-as-text",
      load(id) {
        if (id.endsWith(".hbs")) {
          return `export default ${JSON.stringify(readFileSync(id, "utf-8"))};`;
        }
        return null;
      },
    },
  ],
  test: {
    include: ["tests/**/*.spec.ts"],
    environment: "node",
    coverage: {
      include: ["src/**/*.ts"],
    },
  },
});
