import type { OdesliLinksResponse } from './odesli.types.js';

/**
 * Calls the Odesli (Songlink) API to resolve streaming-platform links for
 * a track URL. Wraps fetch behind this project-owned interface so the rest
 * of the code never touches a generic HTTP client directly.
 */

export class OdesliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OdesliError';
  }
}

export class OdesliNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OdesliNotFoundError';
  }
}

export interface OdesliClient {
  fetchLinks(trackUrl: string): Promise<OdesliLinksResponse>;
}

interface OdesliClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/**
 * Creates an Odesli client bound to a base URL (from env).
 *
 * Usage:
 *   const odesli = createOdesliClient({ baseUrl: env.ODESLI_API_URL });
 *   const links = await odesli.fetchLinks('https://open.spotify.com/track/...');
 */
export function createOdesliClient(options: OdesliClientOptions): OdesliClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function fetchLinks(trackUrl: string): Promise<OdesliLinksResponse> {
    assertTrackUrlIsValid(trackUrl);
    const url = buildLinksUrl(trackUrl);
    const response = await executeLinksRequest(url);
    return (await response.json()) as OdesliLinksResponse;
  }

  function assertTrackUrlIsValid(trackUrl: unknown): void {
    if (typeof trackUrl !== 'string' || trackUrl.trim().length === 0) {
      throw new OdesliError(
        `[odesli.client] Expected non-empty string for "trackUrl", got: ${JSON.stringify(trackUrl)}`,
      );
    }
  }

  function buildLinksUrl(trackUrl: string): string {
    const params = new URLSearchParams({ url: trackUrl, userCountry: 'BR' });
    return `${options.baseUrl}?${params.toString()}`;
  }

  async function executeLinksRequest(url: string): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(url);
    } catch (cause) {
      throw new OdesliError(
        `[odesli.client] Network error calling ${options.baseUrl}: ${String(cause)}`,
      );
    }
    assertLinksResponseStatus(response);
    return response;
  }

  function assertLinksResponseStatus(response: Response): void {
    if (response.status === 404) {
      throw new OdesliNotFoundError(
        '[odesli.client] Odesli found no entity for the given track URL (404)',
      );
    }
    if (!response.ok) {
      throw new OdesliError(`[odesli.client] Odesli answered ${response.status}, expected 200`);
    }
  }

  return { fetchLinks };
}
