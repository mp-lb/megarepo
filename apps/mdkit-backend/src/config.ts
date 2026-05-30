import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("production"),
  BACKEND_PORT: z.string().transform(Number),
  FRONTEND_URL: z.string(),
});

export const env = envSchema.parse(process.env);
export const isProd = env.APP_ENV === "production";
export const isDev = env.APP_ENV === "development";
