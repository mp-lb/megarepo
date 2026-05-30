import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../.."), "");
  const testbenchPort = env.TESTBENCH_PORT || "4311";

  return {
    define: {
      "import.meta.env.VITE_DOCS_URL": JSON.stringify(
        env.VITE_DOCS_URL || "http://localhost:4314",
      ),
      "import.meta.env.VITE_TESTBENCH_API_URL": JSON.stringify(
        env.VITE_TESTBENCH_API_URL || "http://localhost:4312",
      ),
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: parseInt(testbenchPort, 10),
    },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src"),
        },
        {
          find: "@mp-lb/mdkit/styles.css",
          replacement: path.resolve(
            __dirname,
            "../../packages/mdkit/src/styles.css",
          ),
        },
        {
          find: "@mp-lb/mdkit/trpc/client",
          replacement: path.resolve(
            __dirname,
            "../../packages/mdkit/src/trpc/client.ts",
          ),
        },
        {
          find: "@mp-lb/mdkit/trpc",
          replacement: path.resolve(
            __dirname,
            "../../packages/mdkit/src/trpc.ts",
          ),
        },
        {
          find: "@mp-lb/mdkit/yjs",
          replacement: path.resolve(
            __dirname,
            "../../packages/mdkit/src/yjs/index.ts",
          ),
        },
        {
          find: "@mp-lb/mdkit",
          replacement: path.resolve(
            __dirname,
            "../../packages/mdkit/src/index.ts",
          ),
        },
      ],
    },
  };
});
