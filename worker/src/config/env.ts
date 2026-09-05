import { z } from 'zod';

/**
 * Reads and validates the environment variables the worker depends on.
 * Fails fast at startup naming the missing/invalid variable.
 *
 * Usage:
 *   import { env } from './config/env.js';
 *   console.log(env.DATABASE_URL);
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Optional in dev/test so the worker boots without a live Postgres;
  // db/client.ts fails lazily with context when a connection is requested.
  DATABASE_URL: z.string().optional(),
  ODESLI_API_URL: z.string().url().default('https://api.song.link/v1-alpha.1/links'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
