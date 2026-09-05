/**
 * Odesli (Songlink) API types, narrowed to what the worker reads.
 * Odesli answers a big payload; we only consume linksByPlatform and the
 * entities' metadata.
 */

export type OdesliPlatform =
  | 'spotify'
  | 'appleMusic'
  | 'youtube'
  | 'youtubeMusic'
  | 'amazonMusic'
  | 'deezer'
  | 'tidal'
  | 'soundcloud'
  | 'yandex'
  | 'pandora'
  | 'itunes';

export interface OdesliLink {
  url: string;
  nativeAppUriMobile?: string;
}

export interface OdesliLinksResponse {
  entityUniqueId: string;
  userCountry: string;
  pageUrl: string;
  linksByPlatform: Partial<Record<OdesliPlatform, OdesliLink>>;
  entitiesByUniqueId: Record<
    string,
    {
      id: string;
      type: 'song' | 'album';
      title?: string;
      artistName?: string;
      thumbnailUrl?: string;
      platforms: OdesliPlatform[];
    }
  >;
}
