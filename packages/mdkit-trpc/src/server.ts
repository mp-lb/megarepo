import type { TRPCInstance } from "@mp-lb/mdkit-server";
import { helloWorld } from "./procedures/helloWorld";

export const createTrpcRouter = (t: TRPCInstance) =>
  t.router({
    helloWorld: helloWorld(t),
  });

export type AppRouter = ReturnType<typeof createTrpcRouter>;
