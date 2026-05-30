import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@mp-lb/mdkit-trpc";
import { env } from "./config";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.API_BASE_URL}/trpc`,
      transformer: superjson,
    }),
  ],
});
