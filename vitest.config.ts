import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85
      },
      exclude: [
        "**/dist/**",
        "**/*.config.*",
        "**/vite-env.d.ts",
        "apps/web/src/main.tsx",
        "apps/web/src/App.tsx",
        "apps/web/src/components/**",
        "apps/web/src/lib/image.ts",
        "apps/web/src/test/**",
        "packages/shared/src/index.ts",
        "packages/shared/src/types.ts"
      ]
    }
  }
});
