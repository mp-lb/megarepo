import pino from "pino";

export type LogMeta = {
  id?: string;
  module?: string;
  message?: string;
  userId?: string;
  source?: {
    module?: string;
    platform?: string;
    env?: "development" | "staging" | "production";
    service?: string;
    os?: string;
    version?: string;
    user_agent?: string;
  };
  http?: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    route?: string;
    status?: number;
  };
  trace?: {
    traceId?: string;
    spanId?: string;
    parentEventId?: string;
  };
  actor?: {
    id?: string;
    type?: string;
    role?: string;
  };
};

export type Logger = ReturnType<typeof createLogger>;

export const createLogger = (baseMeta?: Partial<LogMeta>) => {
  const base = pino({
    level: process.env.LOG_LEVEL ?? "info",
    formatters: {
      level: (label) => ({ level: label }),
    },
  });

  const log = (
    level: pino.Level,
    eventType: string,
    details?: Record<string, unknown>,
    meta?: Partial<LogMeta>,
  ) => {
    const merged = { eventType, ...baseMeta, ...meta, details };
    const { message, ...rest } = merged;
    base[level](rest, message ?? eventType);
  };

  return {
    info: (
      eventType: string,
      details?: Record<string, unknown>,
      meta?: Partial<LogMeta>,
    ) => log("info", eventType, details, meta),
    warn: (
      eventType: string,
      details?: Record<string, unknown>,
      meta?: Partial<LogMeta>,
    ) => log("warn", eventType, details, meta),
    error: (
      eventType: string,
      details?: Record<string, unknown>,
      meta?: Partial<LogMeta>,
    ) => log("error", eventType, details, meta),
    debug: (
      eventType: string,
      details?: Record<string, unknown>,
      meta?: Partial<LogMeta>,
    ) => log("debug", eventType, details, meta),
    child: (childMeta: Partial<LogMeta>) =>
      createLogger({ ...baseMeta, ...childMeta }),
  };
};

export const logger = createLogger();
