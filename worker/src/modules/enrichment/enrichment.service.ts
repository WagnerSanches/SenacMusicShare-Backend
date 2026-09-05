import type { OdesliClient } from './odesli.client.js';
import { OdesliNotFoundError } from './odesli.client.js';
import type { PostsRepository, PostRecord } from '../../db/posts.repository.js';

/**
 * Orchestrates post enrichment: receives the Spotify track data produced
 * by a new post, calls Odesli to resolve links for other streaming
 * platforms, and persists the enriched post. This module never knows
 * about Fastify — the controller adapts HTTP into these calls.
 */

export interface EnrichPostInput {
  spotifyTrackId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  spotifyTrackUrl: string;
}

export interface EnrichedPost {
  post: PostRecord;
  streamLinks: Record<string, string>;
}

export interface EnrichmentService {
  enrichPost(input: EnrichPostInput): Promise<EnrichedPost>;
}

interface EnrichmentServiceOptions {
  odesli: OdesliClient;
  posts: PostsRepository;
}

/**
 * Creates the enrichment service with its dependencies injected.
 *
 * Usage:
 *   const service = createEnrichmentService({ odesli, posts });
 *   const { post, streamLinks } = await service.enrichPost(input);
 */
export function createEnrichmentService(options: EnrichmentServiceOptions): EnrichmentService {
  async function enrichPost(input: EnrichPostInput): Promise<EnrichedPost> {
    assertInputIsValid(input);
    const created = await options.posts.insertPost({
      spotifyTrackId: input.spotifyTrackId,
      title: input.title,
      artist: input.artist,
      coverUrl: input.coverUrl,
    });
    const streamLinks = await resolveStreamLinks(input.spotifyTrackUrl);
    const post = await options.posts.saveStreamLinks(created.id, streamLinks);
    return { post, streamLinks };
  }

  function assertInputIsValid(input: EnrichPostInput): void {
    const requiredStrings = {
      spotifyTrackId: input.spotifyTrackId,
      title: input.title,
      artist: input.artist,
      spotifyTrackUrl: input.spotifyTrackUrl,
    } as const;
    for (const [field, value] of Object.entries(requiredStrings)) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(
          `[enrichment.service] Expected non-empty string for "${field}", got: ${JSON.stringify(value)}`,
        );
      }
    }
  }

  async function resolveStreamLinks(trackUrl: string): Promise<Record<string, string>> {
    try {
      const response = await options.odesli.fetchLinks(trackUrl);
      const links: Record<string, string> = {};
      for (const [platform, link] of Object.entries(response.linksByPlatform)) {
        if (link?.url) {
          links[platform] = link.url;
        }
      }
      return links;
    } catch (error) {
      // A track with no Odesli entity still gets saved — just without
      // extra links. Other Odesli/network failures bubble up as 502.
      if (error instanceof OdesliNotFoundError) {
        return {};
      }
      throw error;
    }
  }

  return { enrichPost };
}
