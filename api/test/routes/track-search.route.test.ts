import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerTrackSearchRoute } from '../../src/routes/track-search.route.js';
import type {
  SpotifyClient,
  SpotifySearchTracksOptions,
} from '../../src/modules/spotify/spotify.client.js';
import type { SpotifySearchTracksResponse } from '../../src/modules/spotify/spotify.types.js';
import {
  SpotifyAuthError,
  SpotifyRateLimitError,
  SpotifySearchError,
} from '../../src/modules/spotify/spotify.errors.js';
import { HttpError } from '../../src/lib/http-error.js';

/** Named fake Spotify client (standards §4). */
class FakeSpotifyClient implements SpotifyClient {
  readonly receivedOptions: SpotifySearchTracksOptions[] = [];
  response: SpotifySearchTracksResponse = {
    tracks: {
      total: 1,
      items: [
        {
          id: 'track-1',
          name: 'Song Title',
          uri: 'spotify:track:track-1',
          externalUrls: { spotify: 'https://open.spotify.com/track/track-1' },
          artists: [{ id: 'artist-1', name: 'Artist Name' }],
          album: { name: 'Album', releaseDate: '2020-01-01', images: [] },
        },
      ],
    },
  };
  error: Error | null = null;

  async searchTracks(options: SpotifySearchTracksOptions): Promise<SpotifySearchTracksResponse> {
    this.receivedOptions.push(options);
    if (this.error) {
      throw this.error;
    }
    return this.response;
  }
}

async function buildTestApp(spotify: SpotifyClient) {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    return reply.code(500).send({ error: 'Internal server error' });
  });
  registerTrackSearchRoute(app, spotify);
  return app;
}

describe('GET /track-search', () => {
  it('returns matching tracks for a valid query', async () => {
    const spotify = new FakeSpotifyClient();
    const app = await buildTestApp(spotify);

    const response = await app.inject({ method: 'GET', url: '/track-search?q=song+title' });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      query: 'song title',
      total: 1,
      tracks: spotify.response.tracks.items,
    });
    expect(spotify.receivedOptions).toEqual([{ query: 'song title', limit: undefined }]);
    await app.close();
  });

  it('passes the limit through to the spotify module', async () => {
    const spotify = new FakeSpotifyClient();
    const app = await buildTestApp(spotify);

    await app.inject({ method: 'GET', url: '/track-search?q=x&limit=3' });

    expect(spotify.receivedOptions).toEqual([{ query: 'x', limit: 3 }]);
    await app.close();
  });

  it('answers 400 naming the field when q is missing', async () => {
    const app = await buildTestApp(new FakeSpotifyClient());

    const response = await app.inject({ method: 'GET', url: '/track-search' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('for \\"q\\"');
    await app.close();
  });

  it('answers 429 when the spotify module reports a rate limit', async () => {
    const spotify = new FakeSpotifyClient();
    spotify.error = new SpotifyRateLimitError('rate limited', 5);
    const app = await buildTestApp(spotify);

    const response = await app.inject({ method: 'GET', url: '/track-search?q=x' });

    expect(response.statusCode).toBe(429);
    await app.close();
  });

  it('answers 503 when spotify auth fails', async () => {
    const spotify = new FakeSpotifyClient();
    spotify.error = new SpotifyAuthError('missing credentials');
    const app = await buildTestApp(spotify);

    const response = await app.inject({ method: 'GET', url: '/track-search?q=x' });

    expect(response.statusCode).toBe(503);
    await app.close();
  });

  it('answers 502 on a generic spotify search failure', async () => {
    const spotify = new FakeSpotifyClient();
    spotify.error = new SpotifySearchError('Spotify search answered 500, expected 200');
    const app = await buildTestApp(spotify);

    const response = await app.inject({ method: 'GET', url: '/track-search?q=x' });

    expect(response.statusCode).toBe(502);
    await app.close();
  });
});
