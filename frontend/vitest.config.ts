import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/router.tsx",
        "src/routeTree.gen.ts",
        "src/routes/**",
        "src/components/**",
        "src/styles.css",
        "src/lib/mock-data.ts",
        "src/lib/error-capture.ts",
        "src/lib/error-page.ts",
      ],
    },
  },
});
