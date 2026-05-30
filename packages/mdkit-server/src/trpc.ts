import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { AppContext } from "./context";

export const t = initTRPC.context<AppContext>().create({
  transformer: superjson,
});

export type TRPCInstance = typeof t;
