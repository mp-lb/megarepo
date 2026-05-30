import { z } from "zod";

const envSchema = z
  .object({
    VITE_APP_ENV: z
      .enum(["development", "staging", "production"])
      .default("production"),
    VITE_API_BASE_URL: z.string(),
  })
  .transform((e) => ({
    APP_ENV: e.VITE_APP_ENV,
    API_BASE_URL: e.VITE_API_BASE_URL,
  }));

export const env = envSchema.parse(import.meta.env);
export const isProd = env.APP_ENV === "production";
