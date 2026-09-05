import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SpotifyClient } from '../modules/spotify/spotify.client.js';
import {
  SpotifyAuthError,
  SpotifyRateLimitError,
  SpotifySearchError,
} from '../modules/spotify/spotify.errors.js';
import { HttpError, badRequest, upstreamError } from '../lib/http-error.js';

/**
 * GET /track-search?q=<text>[&limit=<n>]
 * Thin adapter between Fastify and the spotify module: parses input,
 * delegates to the client, maps module errors to HTTP responses.
 */

interface TrackSearchQuery {
  q: string;
  limit?: number;
}

const trackSearchQuerySchema = z.object({
  q: z
    .string({ message: 'Expected non-empty string for "q"' })
    .trim()
    .min(1, { message: 'Expected non-empty string for "q"' }),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export function registerTrackSearchRoute(app: FastifyInstance, spotify: SpotifyClient): void {
  app.get<{ Querystring: TrackSearchQuery }>('/track-search', async (request, reply) => {
    const parsed = trackSearchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw badRequest(
        `[track-search.route] Invalid query string, got: ${JSON.stringify(request.query)}; issues: ${parsed.error.issues
          .map((issue) => issue.message)
          .join('; ')}`,
      );
    }
    const { q, limit } = parsed.data;
    const result = await searchAndMapErrors(spotify, { query: q, limit });
    return reply.code(200).send({
      query: q,
      total: result.tracks.total,
      tracks: result.tracks.items,
    });
  });
}

async function searchAndMapErrors(
  spotify: SpotifyClient,
  options: { query: string; limit?: number },
) {
  try {
    return await spotify.searchTracks(options);
  } catch (error) {
    if (error instanceof SpotifyRateLimitError) {
      throw new HttpError(429, `[track-search.route] Upstream rate limit: ${error.message}`);
    }
    if (error instanceof SpotifyAuthError) {
      // Missing/bad credentials means the service can't search at all —
      // 503 tells clients this is a server-side configuration problem.
      throw new HttpError(503, `[track-search.route] Spotify auth failed: ${error.message}`);
    }
    if (error instanceof SpotifySearchError) {
      throw upstreamError(`[track-search.route] Spotify search failed: ${error.message}`);
    }
    throw error;
  }
}
