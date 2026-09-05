import Fastify, { type FastifyInstance } from 'fastify';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { HttpError } from './lib/http-error.js';
import { getPool } from './db/client.js';
import { createPostsRepository } from './db/posts.repository.js';
import { createOdesliClient } from './modules/enrichment/odesli.client.js';
import {
  createEnrichmentService,
  type EnrichmentService,
} from './modules/enrichment/enrichment.service.js';
import { registerEnrichmentController } from './modules/enrichment/enrichment.controller.js';

/**
 * Builds the Fastify instance without calling .listen() — so tests can
 * inject requests via app.inject() without binding a port. Tests inject a
 * fake EnrichmentService (DI standard); without it, the real service is
 * assembled from env-driven clients.
 */
export function buildApp(
  options: { loggerInstance?: typeof logger; enrichmentService?: EnrichmentService } = {},
): FastifyInstance {
  const app = Fastify({ loggerInstance: options.loggerInstance ?? logger });
  registerErrorHandler(app);

  const enrichmentService = options.enrichmentService ?? buildDefaultEnrichmentService();
  registerEnrichmentController(app, enrichmentService);
  registerHealthRoutes(app);
  return app;
}

function buildDefaultEnrichmentService(): EnrichmentService {
  const odesli = createOdesliClient({ baseUrl: env.ODESLI_API_URL });
  // getPool() throws with context when DATABASE_URL is missing, so a
  // misconfigured deploy fails at startup instead of mid-request.
  const posts = createPostsRepository(getPool());
  return createEnrichmentService({ odesli, posts });
}

function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error, module: 'worker' }, 'request failed');
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    return reply.code(500).send({ error: 'Internal server error' });
  });
}

function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/', async () => ({
    name: 'SenacMusicShare Worker',
    version: '1.0.0',
    status: 'online',
  }));

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));
}
