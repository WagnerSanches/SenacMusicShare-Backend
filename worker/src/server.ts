import { buildApp } from './app.js';
import { env } from './config/env.js';

/**
 * Entry point: imports app.ts and starts the port. Kept separate so the
 * app builder stays importable from tests without side effects.
 */
async function start(): Promise<void> {
  const app = buildApp();
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (error) {
    app.log.error({ err: error }, 'failed to start server');
    process.exit(1);
  }
}

await start();
