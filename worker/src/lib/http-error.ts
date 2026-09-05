/**
 * HTTP error carrying a status code so routes can map module failures
 * to proper responses without parsing message strings. Thrown errors are
 * always wrapped with context (received value, expected shape, module).
 */
export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}

export function notFound(message: string): HttpError {
  return new HttpError(404, message);
}

export function upstreamError(message: string): HttpError {
  return new HttpError(502, message);
}
