import Fastify from 'fastify';

export function buildApp(options = {}) {
  const app = Fastify({
    logger: options.logger ?? {
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    ...options,
  });

  app.get('/', async (request, reply) => {
    return {
      name: 'SenacMusicShare API',
      version: '1.0.0',
      status: 'online',
    };
  });

  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
