import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Package scripts run vitest from packages/<name>, the root from here: match both.
    include: [
      "tests/**/*.test.ts",
      "packages/*/tests/**/*.test.ts",
    ],
    passWithNoTests: true,
  },
});
