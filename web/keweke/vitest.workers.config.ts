import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./wrangler.test.jsonc",
      },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    // Workers/DO startup can be slower than Vitest's 5-second default in CI.
    testTimeout: 15_000,
  },
});
