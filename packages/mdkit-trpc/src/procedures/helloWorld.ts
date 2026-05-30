import { message } from "@mp-lb/mdkit-core";
import type { TRPCInstance } from "@mp-lb/mdkit-server";
import { z } from "zod";

export const helloWorld = (t: TRPCInstance) =>
  t.procedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(() => {
      return { message };
    });
