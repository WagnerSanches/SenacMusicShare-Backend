import { describe, expect, it } from 'vitest';
import { createSpotifyClient } from '../../../src/modules/spotify/spotify.client.js';
import type { SpotifyTokenProvider } from '../../../src/modules/spotify/spotify.auth.js';
import { SpotifyRateLimitError } from '../../../src/modules/spotify/spotify.errors.js';

/** Named fake token provider (standards §4) — no module mocking. */
class FakeTokenProvider implements SpotifyTokenProvider {
  callCount = 0;

  async getAccessToken(): Promise<string> {
    this.callCount += 1;
    return 'fake-bearer';
  }
}

/** Named fake for the Spotify Search API endpoint. */
class FakeSearchServer {
  readonly requests: Array<{ url: string; init?: RequestInit }> = [];
  status = 200;
  headers = new Headers({ 'Content-Type': 'application/json' });
  responseBody = JSON.stringify({
    tracks: {
      total: 1,
      items: [
        {
          id: 'track-1',
          name: 'Song Title',
          uri: 'spotify:track:track-1',
          external_urls: { spotify: 'https://open.spotify.com/track/track-1' },
          artists: [{ id: 'artist-1', name: 'Artist Name' }],
          album: { name: 'Album', release_date: '2020-01-01', images: [] },
        },
      ],
    },
  });

  asFetch(): typeof fetch {
    return (async (input: string | URL, init?: RequestInit) => {
      this.requests.push({ url: String(input), init });
      return new Response(this.responseBody, { status: this.status, headers: this.headers });
    }) as typeof fetch;
  }
}

describe('createSpotifyClient.searchTracks', () => {
  it('maps the snake_case Spotify payload to domain types', async () => {
    const server = new FakeSearchServer();
    const client = createSpotifyClient({
      tokenProvider: new FakeTokenProvider(),
      fetchImpl: server.asFetch(),
    });

    const result = await client.searchTracks({ query: 'song title' });

    expect(result.tracks.total).toBe(1);
    const track = result.tracks.items[0]!;
    expect(track.externalUrls.spotify).toBe('https://open.spotify.com/track/track-1');
    expect(track.album.releaseDate).toBe('2020-01-01');
    expect(track.artists[0]!.name).toBe('Artist Name');
  });

  it('sends the bearer token, query, type and limit', async () => {
    const server = new FakeSearchServer();
    const tokenProvider = new FakeTokenProvider();
    const client = createSpotifyClient({ tokenProvider, fetchImpl: server.asFetch() });

    await client.searchTracks({ query: 'never gonna', limit: 5 });

    const request = server.requests[0]!;
    const url = new URL(request.url);
    const headers = request.init?.headers as Record<string, string>;
    expect(url.searchParams.get('q')).toBe('never gonna');
    expect(url.searchParams.get('type')).toBe('track');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(headers.Authorization).toBe('Bearer fake-bearer');
    expect(tokenProvider.callCount).toBe(1);
  });

  it('rejects an empty query with the received value in the message', async () => {
    const client = createSpotifyClient({ tokenProvider: new FakeTokenProvider() });

    await expect(client.searchTracks({ query: '   ' })).rejects.toThrow(/non-empty string/);
  });

  it('clamps limit to the Spotify maximum of 50', async () => {
    const server = new FakeSearchServer();
    const client = createSpotifyClient({
      tokenProvider: new FakeTokenProvider(),
      fetchImpl: server.asFetch(),
    });

    await client.searchTracks({ query: 'x', limit: 500 });

    const url = new URL(server.requests[0]!.url);
    expect(url.searchParams.get('limit')).toBe('50');
  });

  it('throws SpotifyRateLimitError carrying Retry-After on 429', async () => {
    const server = new FakeSearchServer();
    server.status = 429;
    server.headers.set('Retry-After', '7');
    const client = createSpotifyClient({
      tokenProvider: new FakeTokenProvider(),
      fetchImpl: server.asFetch(),
    });

    const attempt = client.searchTracks({ query: 'x' });

    await expect(attempt).rejects.toBeInstanceOf(SpotifyRateLimitError);
    await expect(attempt).rejects.toMatchObject({ retryAfterSeconds: 7 });
  });

  it('throws SpotifySearchError naming the status on non-429 failures', async () => {
    const server = new FakeSearchServer();
    server.status = 500;
    const client = createSpotifyClient({
      tokenProvider: new FakeTokenProvider(),
      fetchImpl: server.asFetch(),
    });

    await expect(client.searchTracks({ query: 'x' })).rejects.toThrow(
      /Spotify search answered 500/,
    );
  });

  it('returns an empty result when Spotify finds nothing', async () => {
    const server = new FakeSearchServer();
    server.responseBody = JSON.stringify({ tracks: { total: 0, items: [] } });
    const client = createSpotifyClient({
      tokenProvider: new FakeTokenProvider(),
      fetchImpl: server.asFetch(),
    });

    const result = await client.searchTracks({ query: 'zzzz-no-match' });

    expect(result.tracks.total).toBe(0);
    expect(result.tracks.items).toEqual([]);
  });
});
