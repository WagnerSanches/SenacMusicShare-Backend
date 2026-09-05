import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type {
  EnrichPostInput,
  EnrichedPost,
  EnrichmentService,
} from '../src/modules/enrichment/enrichment.service.js';
import type { PostRecord } from '../src/db/posts.repository.js';
import { OdesliError } from '../src/modules/enrichment/odesli.client.js';

/**
 * Named fake enrichment service (standards §4). Records every input so
 * controller tests can assert on what arrived, without a real Odesli call
 * or Postgres connection (F.I.R.S.T: fast, independent, repeatable).
 */
class FakeEnrichmentService implements EnrichmentService {
  readonly receivedInputs: EnrichPostInput[] = [];
  nextResult: EnrichedPost = buildEnrichedResult();
  nextError: Error | null = null;

  async enrichPost(input: EnrichPostInput): Promise<EnrichedPost> {
    this.receivedInputs.push(input);
    if (this.nextError) {
      throw this.nextError;
    }
    return this.nextResult;
  }
}

function buildEnrichedResult(): EnrichedPost {
  const post: PostRecord = {
    id: 'post-1',
    spotify_track_id: 'track-1',
    title: 'Song Title',
    artist: 'Artist Name',
    cover_url: 'https://example.com/cover.jpg',
    stream_links: { spotify: 'https://open.spotify.com/track/track-1' },
    created_at: new Date('2026-01-01T00:00:00Z'),
  };
  return { post, streamLinks: { spotify: 'https://open.spotify.com/track/track-1' } };
}

const VALID_BODY = {
  spotifyTrackId: 'track-1',
  title: 'Song Title',
  artist: 'Artist Name',
  coverUrl: 'https://example.com/cover.jpg',
  spotifyTrackUrl: 'https://open.spotify.com/track/track-1',
};

describe('POST /enrich', () => {
  it('enriches a valid post and returns 201 with post + links', async () => {
    const service = new FakeEnrichmentService();
    const app = buildApp({ enrichmentService: service });

    const response = await app.inject({ method: 'POST', url: '/enrich', payload: VALID_BODY });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({
      post: {
        id: 'post-1',
        spotify_track_id: 'track-1',
        title: 'Song Title',
        artist: 'Artist Name',
        cover_url: 'https://example.com/cover.jpg',
        stream_links: { spotify: 'https://open.spotify.com/track/track-1' },
        created_at: '2026-01-01T00:00:00.000Z',
      },
      streamLinks: { spotify: 'https://open.spotify.com/track/track-1' },
    });
    expect(service.receivedInputs).toEqual([VALID_BODY]);
    await app.close();
  });

  it('rejects a body missing required fields with 400 and the issues', async () => {
    const service = new FakeEnrichmentService();
    const app = buildApp({ enrichmentService: service });

    const response = await app.inject({
      method: 'POST',
      url: '/enrich',
      payload: { spotifyTrackId: '', title: 'Only Title' },
    });

    expect(response.statusCode).toBe(400);
    expect(service.receivedInputs).toEqual([]);
    expect(response.body).toContain('Invalid body');
    await app.close();
  });

  it('maps an OdesliError from the service to 502', async () => {
    const service = new FakeEnrichmentService();
    service.nextError = new OdesliError('[odesli.client] Odesli answered 503, expected 200');
    const app = buildApp({ enrichmentService: service });

    const response = await app.inject({ method: 'POST', url: '/enrich', payload: VALID_BODY });

    expect(response.statusCode).toBe(502);
    await app.close();
  });

  it('answers health probes without touching the enrichment service', async () => {
    const service = new FakeEnrichmentService();
    const app = buildApp({ enrichmentService: service });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).status).toBe('ok');
    await app.close();
  });
});
