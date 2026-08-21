import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// CI/sandbox runs should not depend on a writable user-level Wrangler log dir.
process.env.WRANGLER_WRITE_LOGS ??= "false";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        d1Databases: ["NEWSLETTER_DB"],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(
            path.join(configDirectory, "migrations"),
          ),
        },
      },
    })),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/node/**/*.test.ts", "tests/ui/**/*.test.ts"],
    restoreMocks: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
