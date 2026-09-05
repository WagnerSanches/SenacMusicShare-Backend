import { describe, expect, it } from 'vitest';
import { createSpotifyAuth } from '../../../src/modules/spotify/spotify.auth.js';
import { SpotifyAuthError } from '../../../src/modules/spotify/spotify.errors.js';

/**
 * Named fake for the token endpoint (standards §4: fake classes, not
 * inline stubs). Records every request it receives so tests can assert on
 * headers/body instead of trusting the implementation.
 */
class FakeTokenServer {
  readonly requests: Array<{ url: string; init: RequestInit }> = [];
  status = 200;
  responseBody = JSON.stringify({
    access_token: 'fake-token-1',
    token_type: 'Bearer',
    expires_in: 3600,
  });

  asFetch(): typeof fetch {
    return (async (input: string | URL, init?: RequestInit) => {
      this.requests.push({ url: String(input), init: init ?? {} });
      return new Response(this.responseBody, { status: this.status });
    }) as typeof fetch;
  }
}

describe('createSpotifyAuth', () => {
  it('returns a bearer token on first call', async () => {
    const server = new FakeTokenServer();
    const auth = createSpotifyAuth({
      clientId: 'id',
      clientSecret: 'secret',
      fetchImpl: server.asFetch(),
    });

    const token = await auth.getAccessToken();

    expect(token).toBe('fake-token-1');
    expect(server.requests).toHaveLength(1);
  });

  it('sends form-urlencoded body and Basic auth header', async () => {
    const server = new FakeTokenServer();
    const auth = createSpotifyAuth({
      clientId: 'id',
      clientSecret: 'secret',
      fetchImpl: server.asFetch(),
    });

    await auth.getAccessToken();

    const request = server.requests[0]!;
    const headers = request.init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('id:secret').toString('base64')}`);
    expect(String(request.init.body)).toBe('grant_type=client_credentials');
  });

  it('caches the token until it nears expiry, then re-fetches', async () => {
    const server = new FakeTokenServer();
    let nowMs = 0;
    const auth = createSpotifyAuth({
      clientId: 'id',
      clientSecret: 'secret',
      fetchImpl: server.asFetch(),
      now: () => nowMs,
    });

    await auth.getAccessToken();
    nowMs += 3000 * 1000; // still inside (3600 - 60 buffer) seconds
    const cached = await auth.getAccessToken();
    nowMs += 700 * 1000; // past expiry minus buffer
    const refreshed = await auth.getAccessToken();

    expect(cached).toBe('fake-token-1');
    expect(server.requests).toHaveLength(2);
    expect(refreshed).toBe('fake-token-1');
  });

  it('throws SpotifyAuthError when credentials are missing', async () => {
    const auth = createSpotifyAuth({ clientId: undefined, clientSecret: undefined });

    await expect(auth.getAccessToken()).rejects.toThrow(SpotifyAuthError);
  });

  it('throws SpotifyAuthError naming the status when Spotify rejects', async () => {
    const server = new FakeTokenServer();
    server.status = 401;
    server.responseBody = '{"error":"invalid_client"}';
    const auth = createSpotifyAuth({
      clientId: 'bad',
      clientSecret: 'creds',
      fetchImpl: server.asFetch(),
    });

    await expect(auth.getAccessToken()).rejects.toThrow(/401/);
  });

  it('throws SpotifyAuthError when the response lacks access_token', async () => {
    const server = new FakeTokenServer();
    server.responseBody = JSON.stringify({ token_type: 'Bearer', expires_in: 3600 });
    const auth = createSpotifyAuth({
      clientId: 'id',
      clientSecret: 'secret',
      fetchImpl: server.asFetch(),
    });

    await expect(auth.getAccessToken()).rejects.toThrow(/access_token/);
  });
});
