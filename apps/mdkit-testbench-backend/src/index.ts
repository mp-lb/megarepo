import { createTestbenchApp } from "./app.js";

const port = Number(process.env.TESTBENCH_API_PORT ?? 4312);
const host = "127.0.0.1";

const { app } = await createTestbenchApp({
  logger: true,
});

const shutdown = async () => {
  await app.close();
};

process.once("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.once("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

await app.listen({
  host,
  port,
});
