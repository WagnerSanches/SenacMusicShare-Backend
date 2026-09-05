import { HttpError, upstreamError } from './http-error.js';
import {
  SpotifyAuthError,
  SpotifyRateLimitError,
  SpotifySearchError,
} from '../modules/spotify/spotify.errors.js';

/**
 * Maps Spotify module errors to HTTP responses. Shared by every route that
 * calls the Spotify client, so the status-code mapping stays in one place
 * instead of being copy-pasted per route.
 *
 * Usage:
 *   try {
 *     await spotify.searchTracks(options);
 *   } catch (error) {
 *     mapSpotifyErrorToHttp(error, 'search-music.route');
 *   }
 */
export function mapSpotifyErrorToHttp(error: unknown, routeName: string): never {
  if (error instanceof SpotifyRateLimitError) {
    throw new HttpError(429, `[${routeName}] Upstream rate limit: ${error.message}`);
  }
  if (error instanceof SpotifyAuthError) {
    // Missing/bad credentials means the service can't search at all —
    // 503 tells clients this is a server-side configuration problem.
    throw new HttpError(503, `[${routeName}] Spotify auth failed: ${error.message}`);
  }
  if (error instanceof SpotifySearchError) {
    throw upstreamError(`[${routeName}] Spotify search failed: ${error.message}`);
  }
  throw error;
}
