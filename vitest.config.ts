import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 120_000,  // E2E hits real API; some endpoints are slow
    hookTimeout: 60_000,
    pool: "forks",         // isolates env-var mutations between tests
  },
});
