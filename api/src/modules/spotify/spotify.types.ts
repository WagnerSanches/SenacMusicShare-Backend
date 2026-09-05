/**
 * Spotify domain types for the endpoints this project uses (search only,
 * for now). These mirror the Web API response shapes, narrowed to the
 * fields we actually read — never type the full Spotify payload blindly.
 */

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  externalUrls: { spotify: string };
  artists: ReadonlyArray<{ id: string; name: string }>;
  album: {
    name: string;
    releaseDate: string;
    images: ReadonlyArray<{ url: string; width: number | null; height: number | null }>;
  };
}

export interface SpotifySearchTracksResponse {
  tracks: {
    total: number;
    items: ReadonlyArray<SpotifyTrack>;
  };
}

/** Raw token endpoint payload as Spotify returns it (snake_case). */
export interface SpotifyTokenPayload {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** Track shape as Spotify returns it (snake_case), pre-mapping. */
export interface SpotifyRawTrack {
  id: string;
  name: string;
  uri: string;
  external_urls: { spotify: string };
  artists: ReadonlyArray<{ id: string; name: string }>;
  album: {
    name: string;
    release_date: string;
    images: ReadonlyArray<{ url: string; width: number | null; height: number | null }>;
  };
}

export interface SpotifyRawSearchResponse {
  tracks: {
    total: number;
    items: ReadonlyArray<SpotifyRawTrack>;
  };
}
