/**
 * Errors specific to the Spotify module. Consumers (routes, jobs) match on
 * the class — never on message text — to decide retry vs. HTTP response.
 */
export class SpotifyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpotifyAuthError';
  }
}

export class SpotifySearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpotifySearchError';
  }
}

/**
 * Thrown when Spotify answers 429. Carries the number of seconds the API
 * asked us to wait so callers can back off instead of retrying blindly.
 */
export class SpotifyRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'SpotifyRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
