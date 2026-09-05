import type {
  SpotifyRawSearchResponse,
  SpotifyRawTrack,
  SpotifySearchTracksResponse,
  SpotifyTrack,
} from './spotify.types.js';
import { SpotifyRateLimitError, SpotifySearchError } from './spotify.errors.js';
import type { SpotifyTokenProvider } from './spotify.auth.js';

/**
 * Calls the Spotify Search API. This module only knows how to *call* the
 * API — it never decides what to do with results, never validates route
 * input, and never imports Fastify.
 */

export interface SpotifySearchTracksOptions {
  query: string;
  limit?: number;
}

export interface SpotifyClient {
  searchTracks(options: SpotifySearchTracksOptions): Promise<SpotifySearchTracksResponse>;
}

interface SpotifyClientOptions {
  /** Injected so tests can use a fake token provider without module mocks. */
  tokenProvider: SpotifyTokenProvider;
  fetchImpl?: typeof fetch;
}

const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * Creates a Spotify client bound to a token provider.
 *
 * Usage:
 *   const client = createSpotifyClient({ tokenProvider: auth });
 *   const { tracks } = await client.searchTracks({ query: 'never gonna' });
 */
export function createSpotifyClient(options: SpotifyClientOptions): SpotifyClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function searchTracks(
    searchOptions: SpotifySearchTracksOptions,
  ): Promise<SpotifySearchTracksResponse> {
    assertQueryIsValid(searchOptions.query);
    const url = buildSearchUrl(searchOptions);
    const response = await executeSearchRequest(url);
    const raw = (await response.json()) as SpotifyRawSearchResponse;
    return mapSearchResponse(raw);
  }

  function assertQueryIsValid(query: unknown): void {
    if (typeof query !== 'string' || query.trim().length === 0) {
      throw new SpotifySearchError(
        `[spotify.client] Expected non-empty string for "query", got: ${JSON.stringify(query)}`,
      );
    }
  }

  function buildSearchUrl(searchOptions: SpotifySearchTracksOptions): string {
    const limit = Math.min(searchOptions.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const params = new URLSearchParams({
      q: searchOptions.query,
      type: 'track',
      limit: String(limit),
    });
    return `${SPOTIFY_SEARCH_URL}?${params.toString()}`;
  }

  async function executeSearchRequest(url: string): Promise<Response> {
    const accessToken = await options.tokenProvider.getAccessToken();
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (cause) {
      throw new SpotifySearchError(
        `[spotify.client] Network error calling ${SPOTIFY_SEARCH_URL}: ${String(cause)}`,
      );
    }
    assertSearchResponseStatus(response);
    return response;
  }

  function assertSearchResponseStatus(response: Response): void {
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After') ?? '1');
      throw new SpotifyRateLimitError(
        '[spotify.client] Spotify rate limit reached (429)',
        retryAfter,
      );
    }
    if (!response.ok) {
      throw new SpotifySearchError(
        `[spotify.client] Spotify search answered ${response.status}, expected 200`,
      );
    }
  }

  function mapSearchResponse(raw: SpotifyRawSearchResponse): SpotifySearchTracksResponse {
    return {
      tracks: {
        total: raw.tracks?.total ?? 0,
        items: (raw.tracks?.items ?? []).map(mapTrack),
      },
    };
  }

  function mapTrack(raw: SpotifyRawTrack): SpotifyTrack {
    return {
      id: raw.id,
      name: raw.name,
      uri: raw.uri,
      externalUrls: { spotify: raw.external_urls.spotify },
      artists: raw.artists.map((artist) => ({ id: artist.id, name: artist.name })),
      album: {
        name: raw.album.name,
        releaseDate: raw.album.release_date,
        images: raw.album.images,
      },
    };
  }

  return { searchTracks };
}
