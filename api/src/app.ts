import Fastify, { type FastifyInstance } from 'fastify';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { HttpError } from './lib/http-error.js';
import { createSpotifyAuth } from './modules/spotify/spotify.auth.js';
import { createSpotifyClient } from './modules/spotify/spotify.client.js';
import { registerTrackSearchRoute } from './routes/track-search.route.js';

/**
 * Builds the Fastify instance without calling .listen() — so tests can
 * inject requests via app.inject() without binding a port.
 */
export function buildApp(options: { loggerInstance?: typeof logger } = {}): FastifyInstance {
  const app = Fastify({ loggerInstance: options.loggerInstance ?? logger });
  registerErrorHandler(app);

  const spotifyAuth = createSpotifyAuth({
    clientId: env.SPOTIFY_CLIENT_ID,
    clientSecret: env.SPOTIFY_CLIENT_SECRET,
  });
  const spotifyClient = createSpotifyClient({ tokenProvider: spotifyAuth });

  registerTrackSearchRoute(app, spotifyClient);
  registerHealthRoutes(app);
  return app;
}

function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error, module: 'api' }, 'request failed');
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    return reply.code(500).send({ error: 'Internal server error' });
  });
}

function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/', async () => ({
    name: 'SenacMusicShare API',
    version: '1.0.0',
    status: 'online',
  }));

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));
}
