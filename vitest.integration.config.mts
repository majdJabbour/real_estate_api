import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.ts"],
    globalSetup: ["tests/integration/setup.ts"],
  },
});
