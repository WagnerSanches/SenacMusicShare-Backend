import { z } from 'zod';

/**
 * Reads and validates the environment variables the API depends on.
 * Fails fast at startup with a message that names the missing/invalid
 * variable and the value it received, instead of crashing mid-request.
 *
 * Usage:
 *   import { env } from './config/env.js';
 *   console.log(env.SPOTIFY_CLIENT_ID);
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Spotify credentials are optional so the app boots in dev without them;
  // spotify.auth.ts fails lazily (with context) when a token is requested.
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  WORKER_ENRICH_URL: z.string().url().default('http://localhost:3001/enrich'),
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
