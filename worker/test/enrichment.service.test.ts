import { describe, expect, it } from 'vitest';
import { createEnrichmentService } from '../src/modules/enrichment/enrichment.service.js';
import {
  OdesliError,
  OdesliNotFoundError,
  type OdesliClient,
} from '../src/modules/enrichment/odesli.client.js';
import type { OdesliLinksResponse } from '../src/modules/enrichment/odesli.types.js';
import type { NewPost, PostRecord, PostsRepository } from '../src/db/posts.repository.js';

/** Named fake Odesli client (standards §4). */
class FakeOdesliClient implements OdesliClient {
  readonly requestedUrls: string[] = [];
  response: OdesliLinksResponse = {
    entityUniqueId: 'entity-1',
    userCountry: 'BR',
    pageUrl: 'https://song.link/entity-1',
    linksByPlatform: {
      spotify: { url: 'https://open.spotify.com/track/track-1' },
      appleMusic: { url: 'https://music.apple.com/track/track-1' },
      youtube: { url: 'https://youtube.com/watch?v=abc' },
    },
    entitiesByUniqueId: {},
  };
  error: Error | null = null;

  async fetchLinks(trackUrl: string): Promise<OdesliLinksResponse> {
    this.requestedUrls.push(trackUrl);
    if (this.error) {
      throw this.error;
    }
    return this.response;
  }
}

/** Named fake posts repository (standards §4) — in-memory rows. */
class FakePostsRepository implements PostsRepository {
  readonly inserted: NewPost[] = [];
  readonly savedLinks: Array<{ postId: string; links: Record<string, string> }> = [];

  async insertPost(post: NewPost): Promise<PostRecord> {
    this.inserted.push(post);
    return {
      id: 'post-1',
      spotify_track_id: post.spotifyTrackId,
      title: post.title,
      artist: post.artist,
      cover_url: post.coverUrl,
      stream_links: {},
      created_at: new Date(),
    };
  }

  async saveStreamLinks(postId: string, links: Record<string, string>): Promise<PostRecord> {
    this.savedLinks.push({ postId, links });
    return {
      id: postId,
      spotify_track_id: 'track-1',
      title: 'Song Title',
      artist: 'Artist Name',
      cover_url: null,
      stream_links: links,
      created_at: new Date(),
    };
  }

  async findPostById(): Promise<PostRecord | null> {
    return null;
  }
}

const VALID_INPUT = {
  spotifyTrackId: 'track-1',
  title: 'Song Title',
  artist: 'Artist Name',
  coverUrl: null,
  spotifyTrackUrl: 'https://open.spotify.com/track/track-1',
};

describe('createEnrichmentService.enrichPost', () => {
  it('inserts the post, resolves links via Odesli, and saves them', async () => {
    const odesli = new FakeOdesliClient();
    const posts = new FakePostsRepository();
    const service = createEnrichmentService({ odesli, posts });

    const result = await service.enrichPost(VALID_INPUT);

    expect(posts.inserted).toEqual([
      { spotifyTrackId: 'track-1', title: 'Song Title', artist: 'Artist Name', coverUrl: null },
    ]);
    expect(odesli.requestedUrls).toEqual(['https://open.spotify.com/track/track-1']);
    expect(posts.savedLinks[0]!.links).toEqual(result.streamLinks);
    expect(result.streamLinks).toHaveProperty('appleMusic');
  });

  it('saves the post with no links when Odesli finds no entity', async () => {
    const odesli = new FakeOdesliClient();
    odesli.error = new OdesliNotFoundError('no entity');
    const posts = new FakePostsRepository();
    const service = createEnrichmentService({ odesli, posts });

    const result = await service.enrichPost(VALID_INPUT);

    expect(result.streamLinks).toEqual({});
    expect(posts.savedLinks[0]!.links).toEqual({});
  });

  it('rethrows non-404 Odesli errors so the controller answers 502', async () => {
    const odesli = new FakeOdesliClient();
    odesli.error = new OdesliError('Odesli answered 503, expected 200');
    const service = createEnrichmentService({ odesli, posts: new FakePostsRepository() });

    await expect(service.enrichPost(VALID_INPUT)).rejects.toThrow(OdesliError);
  });

  it('rejects an empty title naming the field and received value', async () => {
    const service = createEnrichmentService({
      odesli: new FakeOdesliClient(),
      posts: new FakePostsRepository(),
    });

    await expect(service.enrichPost({ ...VALID_INPUT, title: '   ' })).rejects.toThrow(
      /"title".*" {3}"/,
    );
  });
});
