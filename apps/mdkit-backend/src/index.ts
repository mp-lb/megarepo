import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { isProd, isDev, env } from "./config";
import {
  t,
  createLogger,
  type AppContext,
  handleTrpcError,
} from "@mp-lb/mdkit-server";
import { createTrpcRouter, type AppRouter } from "@mp-lb/mdkit-trpc";

const port = env.BACKEND_PORT;
const appRouter = createTrpcRouter(t);

const baseLogger = createLogger({
  source: {
    service: "backend",
    env: env.APP_ENV,
  },
});

process.on("uncaughtException", (err) => {
  baseLogger.error(
    "process.uncaughtException",
    { stack: err.stack, name: err.name },
    { message: err.message },
  );

  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  baseLogger.error(
    "process.unhandledRejection",
    { stack: err.stack, name: err.name },
    { message: err.message },
  );
});

const app = Fastify({
  trustProxy: true,
  logger: isDev ? { transport: { target: "pino-pretty" } } : true,
});

app.setErrorHandler((err: unknown, request, reply) => {
  const error = err instanceof Error ? err : new Error(String(err));
  const errObj = err as Record<string, unknown>;

  const statusCode =
    typeof errObj?.statusCode === "number" ? errObj.statusCode : 500;

  const code = typeof errObj?.code === "string" ? errObj.code : undefined;
  baseLogger.error(
    "http.error",
    { stack: error.stack, name: error.name, code },
    {
      message: error.message,
      http: {
        method: request.method as "GET" | "POST" | "PUT" | "DELETE",
        route: request.url,
        status: statusCode,
      },
    },
  );

  reply.status(statusCode).send({ error: error.message });
});

await app.register(cors, {
  origin: isProd ? [env.FRONTEND_URL] : true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext: (): AppContext => ({
      logger: baseLogger,
    }),
    onError: ({
      path,
      error,
    }: Parameters<
      NonNullable<FastifyTRPCPluginOptions<AppRouter>["trpcOptions"]["onError"]>
    >[0]) => {
      handleTrpcError({ path, error }, baseLogger);
    },
  },
});

app.get("/health", (_, reply) => reply.status(200).send({ ok: true }));

try {
  await app.listen({
    port: port,
    host: isProd ? "0.0.0.0" : undefined,
  });

  baseLogger.info(
    "server.started",
    { port: port },
    { message: `Fastify running at http://localhost:${port}` },
  );
} catch (err) {
  const error = err instanceof Error ? err : new Error(String(err));

  baseLogger.error(
    "server.startFailed",
    { stack: error.stack },
    { message: error.message },
  );

  process.exit(1);
}
