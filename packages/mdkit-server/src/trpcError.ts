import type { TRPCError } from "@trpc/server";
import type { Logger } from "./logger";

type TrpcOnErrorInput = {
  path?: string;
  error: TRPCError;
};

export const handleTrpcError = (
  { path, error }: TrpcOnErrorInput,
  logger: Logger,
) => {
  try {
    logger.error(
      "trpc.error",
      { stack: error.stack, code: error.code, path },
      { message: error.message },
    );
  } catch (logError) {
    const safeError =
      logError instanceof Error ? logError : new Error(String(logError));

    // Never let error logging bubble and terminate the request lifecycle.
    console.error("trpc.onError.loggerFailure", safeError);
  }
};
