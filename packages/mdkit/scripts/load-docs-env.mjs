import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(packageRoot, "../..");

dotenvExpand.expand(
  dotenv.config({
    path: resolve(repoRoot, ".env.local"),
  }),
);

const command = process.argv[2] ?? "dev";
const port = process.env.DOCS_PORT || "4314";

const vitepressCli = JSON.parse(
  readFileSync(
    resolve(packageRoot, "node_modules/vitepress/package.json"),
    "utf8",
  ),
).bin.vitepress;

const child = spawn(
  process.execPath,
  [
    resolve(packageRoot, "node_modules/vitepress", vitepressCli),
    command,
    "docs",
    "--host",
    "127.0.0.1",
    "--port",
    port,
  ],
  {
    cwd: packageRoot,
    env: process.env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
