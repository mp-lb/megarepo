import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@mp-lb/zog-core": new URL("../zog-core/src/index.ts", import.meta.url)
        .pathname,
    },
  },
});
