import type { SpotifyTokenPayload } from './spotify.types.js';
import { SpotifyAuthError } from './spotify.errors.js';

/**
 * Obtains and holds the Spotify bearer token in memory using the
 * client_credentials flow. The token is refreshed lazily ~60s before it
 * expires — there is no persistent store by design (the architecture keeps
 * this state in memory).
 */

interface CachedToken {
  accessToken: string;
  /** Unix ms after which the token must not be used anymore. */
  expiresAtMs: number;
}

export interface SpotifyTokenProvider {
  getAccessToken(): Promise<string>;
}

interface SpotifyAuthOptions {
  clientId: string | undefined;
  clientSecret: string | undefined;
  /** Injectable for tests (FakeFetch); defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable clock for tests; defaults to Date.now(). */
  now?: () => number;
  /** Refresh this many seconds before real expiry. */
  expiryBufferSeconds?: number;
}

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const DEFAULT_EXPIRY_BUFFER_SECONDS = 60;

/**
 * Creates the token provider. Credentials come from env; when they are
 * missing the failure is deferred to the first token request so the app
 * still boots in local dev without Spotify access.
 *
 * Usage:
 *   const auth = createSpotifyAuth({ clientId, clientSecret });
 *   const token = await auth.getAccessToken();
 */
export function createSpotifyAuth(options: SpotifyAuthOptions): SpotifyTokenProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const bufferSeconds = options.expiryBufferSeconds ?? DEFAULT_EXPIRY_BUFFER_SECONDS;
  let cachedToken: CachedToken | null = null;

  async function getAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAtMs > now()) {
      return cachedToken.accessToken;
    }
    cachedToken = await fetchNewToken();
    return cachedToken.accessToken;
  }

  async function fetchNewToken(): Promise<CachedToken> {
    assertCredentialsPresent();
    // Spotify Accounts API requires application/x-www-form-urlencoded,
    // not JSON — sending a JSON body yields an opaque 400.
    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    const credentials = Buffer.from(`${options.clientId}:${options.clientSecret}`).toString(
      'base64',
    );

    const response = await postTokenRequest(body, credentials);
    const payload = (await response.json()) as SpotifyTokenPayload;
    if (!payload.access_token) {
      throw new SpotifyAuthError(
        `[spotify.auth] Token response missing "access_token", got: ${JSON.stringify(payload)}`,
      );
    }
    return {
      accessToken: payload.access_token,
      expiresAtMs: now() + (payload.expires_in - bufferSeconds) * 1000,
    };
  }

  async function postTokenRequest(body: URLSearchParams, credentials: string): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
    } catch (cause) {
      throw new SpotifyAuthError(
        `[spotify.auth] Network error calling ${SPOTIFY_TOKEN_URL}: ${String(cause)}`,
      );
    }
    if (!response.ok) {
      const text = await response.text();
      throw new SpotifyAuthError(
        `[spotify.auth] Spotify token endpoint answered ${response.status}, expected 200; body: ${text}`,
      );
    }
    return response;
  }

  function assertCredentialsPresent(): void {
    if (!options.clientId || !options.clientSecret) {
      throw new SpotifyAuthError(
        `[spotify.auth] Missing SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET, got clientId=${JSON.stringify(
          options.clientId,
        )}, clientSecret=${options.clientSecret ? '<set>' : '<unset>'}`,
      );
    }
  }

  return { getAccessToken };
}
