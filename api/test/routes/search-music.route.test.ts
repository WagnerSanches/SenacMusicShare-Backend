import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerSearchMusicRoute } from '../../src/routes/search-music.route.js';
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
          artists: [
            { id: 'artist-1', name: 'Artist One' },
            { id: 'artist-2', name: 'Artist Two' },
          ],
          album: {
            name: 'Album',
            releaseDate: '2020-01-01',
            images: [{ url: 'https://img/large.jpg', width: 640, height: 640 }],
          },
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
  registerSearchMusicRoute(app, spotify);
  return app;
}

describe('GET /search-music', () => {
  it('returns only image, name, album and composers for each match', async () => {
    const spotify = new FakeSpotifyClient();
    const app = await buildTestApp(spotify);

    const response = await app.inject({ method: 'GET', url: '/search-music?q=song+title' });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      query: 'song title',
      tracks: [
        {
          image: 'https://img/large.jpg',
          name: 'Song Title',
          album: 'Album',
          composers: ['Artist One', 'Artist Two'],
        },
      ],
    });
    await app.close();
  });

  it('always requests exactly 5 results, ignoring any client-supplied limit', async () => {
    const spotify = new FakeSpotifyClient();
    const app = await buildTestApp(spotify);

    await app.inject({ method: 'GET', url: '/search-music?q=x&limit=50' });

    expect(spotify.receivedOptions).toEqual([{ query: 'x', limit: 5 }]);
    await app.close();
  });

  it('returns null image when the album has no artwork', async () => {
    const spotify = new FakeSpotifyClient();
    spotify.response.tracks.items[0]!.album.images = [];
    const app = await buildTestApp(spotify);

    const response = await app.inject({ method: 'GET', url: '/search-music?q=x' });

    expect(JSON.parse(response.body).tracks[0].image).toBeNull();
    await app.close();
  });

  it('answers 400 naming the field when q is missing', async () => {
    const app = await buildTestApp(new FakeSpotifyClient());

    const response = await app.inject({ method: 'GET', url: '/search-music' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('for \\"q\\"');
    await app.close();
  });

  it('answers 429 when the spotify module reports a rate limit', async () => {
    const spotify = new FakeSpotifyClient();
    spotify.error = new SpotifyRateLimitError('rate limited', 5);
    const app = await buildTestApp(spotify);

    const response = await app.inject({ method: 'GET', url: '/search-music?q=x' });

    expect(response.statusCode).toBe(429);
    await app.close();
  });

  it('answers 503 when spotify auth fails', async () => {
    const spotify = new FakeSpotifyClient();
    spotify.error = new SpotifyAuthError('missing credentials');
    const app = await buildTestApp(spotify);

    const response = await app.inject({ method: 'GET', url: '/search-music?q=x' });

    expect(response.statusCode).toBe(503);
    await app.close();
  });

  it('answers 502 on a generic spotify search failure', async () => {
    const spotify = new FakeSpotifyClient();
    spotify.error = new SpotifySearchError('Spotify search answered 500, expected 200');
    const app = await buildTestApp(spotify);

    const response = await app.inject({ method: 'GET', url: '/search-music?q=x' });

    expect(response.statusCode).toBe(502);
    await app.close();
  });
});
