import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    // Deduplicate zod so that the linked SDK and this package share the same instance.
    // Without this, the two separate node_modules/zod copies cause instanceof checks
    // across the boundary to fail (e.g. ZodObject checks in definePlugin).
    dedupe: ["zod"],
    alias: {
      zod: path.resolve(__dirname, "node_modules/zod"),
    },
  },
  test: {
    environment: "node",
    exclude: ["dist/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "dist/**", "**/*.test.ts", "**/*.spec.ts", "**/*.config.*"],
    },
  },
});
