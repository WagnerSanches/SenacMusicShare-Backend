import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SpotifyClient } from '../modules/spotify/spotify.client.js';
import type { SpotifyTrack } from '../modules/spotify/spotify.types.js';
import { badRequest } from '../lib/http-error.js';
import { mapSpotifyErrorToHttp } from '../lib/spotify-error-mapper.js';

/**
 * GET /search-music?q=<text>
 * Frontend-facing autocomplete endpoint (called after the user's input
 * debounces, per the product spec). Always returns the top 5 matches with
 * only the fields the UI needs — never the full Spotify track payload.
 *
 * Rate limiting (token bucket, per client) is a future phase — see
 * ARCHITECTURE.md's rate-limit module.
 */

interface SearchMusicQuery {
  q: string;
}

interface TrackSummary {
  image: string | null;
  name: string;
  album: string;
  composers: string[];
}

const TOP_TRACKS_LIMIT = 5;

const searchMusicQuerySchema = z.object({
  q: z
    .string({ message: 'Expected non-empty string for "q"' })
    .trim()
    .min(1, { message: 'Expected non-empty string for "q"' }),
});

export function registerSearchMusicRoute(app: FastifyInstance, spotify: SpotifyClient): void {
  app.get<{ Querystring: SearchMusicQuery }>('/search-music', async (request, reply) => {
    const { q } = parseQuery(request.query);
    const result = await searchTopTracks(spotify, q);
    return reply.code(200).send({ query: q, tracks: result.map(toTrackSummary) });
  });
}

function parseQuery(query: unknown): SearchMusicQuery {
  const parsed = searchMusicQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw badRequest(
      `[search-music.route] Invalid query string, got: ${JSON.stringify(query)}; issues: ${parsed.error.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }
  return parsed.data;
}

async function searchTopTracks(
  spotify: SpotifyClient,
  query: string,
): Promise<ReadonlyArray<SpotifyTrack>> {
  try {
    const result = await spotify.searchTracks({ query, limit: TOP_TRACKS_LIMIT });
    return result.tracks.items;
  } catch (error) {
    mapSpotifyErrorToHttp(error, 'search-music.route');
  }
}

function toTrackSummary(track: SpotifyTrack): TrackSummary {
  return {
    image: track.album.images[0]?.url ?? null,
    name: track.name,
    album: track.album.name,
    composers: track.artists.map((artist) => artist.name),
  };
}
