import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { EnrichmentService } from './enrichment.service.js';
import { OdesliError } from './odesli.client.js';
import { HttpError, badRequest, upstreamError } from '../../lib/http-error.js';

/**
 * POST /enrich — receives the internal call from the API service carrying
 * the Spotify track payload for a new post. Thin adapter: validates input,
 * delegates to the enrichment service, maps errors to HTTP responses.
 */

const enrichBodySchema = z.object({
  spotifyTrackId: z.string().min(1, { message: 'Expected non-empty string for "spotifyTrackId"' }),
  title: z.string().min(1, { message: 'Expected non-empty string for "title"' }),
  artist: z.string().min(1, { message: 'Expected non-empty string for "artist"' }),
  coverUrl: z.string().url().nullable(),
  spotifyTrackUrl: z.string().url({ message: 'Expected a URL for "spotifyTrackUrl"' }),
});

type EnrichBody = z.infer<typeof enrichBodySchema>;

export function registerEnrichmentController(
  app: FastifyInstance,
  service: EnrichmentService,
): void {
  app.post<{ Body: EnrichBody }>('/enrich', async (request, reply) => {
    const parsed = enrichBodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw badRequest(
        `[enrichment.controller] Invalid body, got: ${JSON.stringify(request.body)}; issues: ${parsed.error.issues
          .map((issue) => issue.message)
          .join('; ')}`,
      );
    }
    const { post, streamLinks } = await enrichAndMapErrors(service, parsed.data);
    return reply.code(201).send({ post, streamLinks });
  });
}

async function enrichAndMapErrors(service: EnrichmentService, body: EnrichBody) {
  try {
    return await service.enrichPost(body);
  } catch (error) {
    if (error instanceof OdesliError) {
      throw upstreamError(`[enrichment.controller] Odesli failed: ${error.message}`);
    }
    if (error instanceof Error && error.message.includes('[enrichment.service]')) {
      throw badRequest(error.message);
    }
    throw new HttpError(
      500,
      `[enrichment.controller] Unexpected error enriching post: ${String(error)}`,
    );
  }
}
