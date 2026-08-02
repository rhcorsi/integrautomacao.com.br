import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// CI/sandbox runs should not depend on a writable user-level Wrangler log dir.
process.env.WRANGLER_WRITE_LOGS ??= "false";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
  },
});
