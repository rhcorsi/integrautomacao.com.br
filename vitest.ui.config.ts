import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/ui/**/*.test.ts"],
    restoreMocks: true,
  },
});
