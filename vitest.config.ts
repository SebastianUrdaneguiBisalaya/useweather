import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Test workspace packages against their sources, not a stale dist build.
    alias: {
      "@useweather/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    // Package scripts run vitest from packages/<name>, the root from here: match both.
    include: [
      "tests/**/*.test.{ts,tsx}",
      "packages/*/tests/**/*.test.{ts,tsx}",
    ],
    passWithNoTests: true,
  },
});
