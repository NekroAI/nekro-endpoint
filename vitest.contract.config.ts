import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

// Freezes the externally consumed behaviour of /api/* and /e/* (docs/REDESIGN.md §1).
// Each test runs the real Worker entry against a migrated, isolated D1 database.
export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "drizzle"));

  return {
    test: {
      include: ["test/contract/**/*.contract.test.ts"],
      setupFiles: ["./test/contract/setup.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          isolatedStorage: true,
          main: "./src/index.ts",
          wrangler: { configPath: "./wrangler.jsonc" },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              NODE_ENV: "test",
              APP_BASE_URL: "https://ep.test",
              GITHUB_CLIENT_ID: "test-client-id",
              GITHUB_CLIENT_SECRET: "test-client-secret",
            },
          },
        },
      },
    },
  };
});
