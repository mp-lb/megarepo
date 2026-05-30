import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()] as any,
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
  resolve: {
    // The monorepo hosts more than one React version (other apps pin 19.2.x);
    // dedupe so the component and @testing-library/react share one React copy,
    // otherwise the hooks dispatcher is null ("Cannot read ... 'useState'").
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
