import { defineConfig, configDefaults } from "vitest/config";

// Unit tests run in Node. API contract tests run against the real Worker and
// D1 in workerd; see vitest.contract.config.ts.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "dist/**", "test/contract/**"],
  },
});
