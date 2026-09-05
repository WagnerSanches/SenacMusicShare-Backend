import { pino } from 'pino';
import type { FastifyBaseLogger } from 'fastify';
import { env } from '../config/env.js';

/**
 * Single structured logger instance for the worker service (pino → JSON).
 * Dev gets pino-pretty output; production stays plain JSON for log shippers.
 *
 * Usage:
 *   import { logger } from './lib/logger.js';
 *   logger.info({ module: 'enrichment', postId }, 'post enriched');
 */
export const logger: FastifyBaseLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
        }
      : undefined,
});
