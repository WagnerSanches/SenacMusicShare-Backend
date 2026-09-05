# Backend Architecture — Music Share

This document defines the folder structure that must be followed across the
entire backend of the project. It applies to both services in the monorepo
(`api` and `worker`). Any new code — written by a human or by an agent —
must follow this before being merged.

For code-level rules (naming, functions, tests, DI, etc.), see
`CODE_STANDARDS.md`.

---

## 1. Monorepo overview

The project is split into two independent services, each with its own
process, deploy, and `package.json`:

- **`api`** — handles HTTP requests: post feed, post creation, music search
  on Spotify. Keeps state in memory (Spotify token, rate limiter, search
  buckets).
- **`worker`** — receives internal HTTP calls from the API, enriches a post
  with links to other streaming platforms (via Odesli), and writes to the
  database.

```
/music-share
  /api
  /worker
  docker-compose.yml
  README.md
  ARCHITECTURE.md
  CODE_STANDARDS.md
```

Each service is independent enough to run, build, and (in the future) be
tested on its own. Neither service imports code from the other directly —
if something needs to be shared (payload types, for example), it becomes
its own package (`/packages/shared`) once that need actually shows up. Do
not create that folder ahead of time without a real use case.

---

## 2. Folder structure — `/api`

```
/api
  /src
    /modules
      /spotify
        spotify.auth.ts        # obtains and holds the bearer token in memory
        spotify.client.ts      # calls the Spotify Search API
        spotify.types.ts       # Spotify domain types (request/response)
        spotify.errors.ts      # errors specific to this module
      /posts                    # (future phase) post creation/listing
      /rate-limit                # (future phase) in-memory fingerprint + IP
    /routes
      track-search.route.ts     # GET /track-search
    /jobs                        # (future phase) crons: token refresh, rate-limit sync
    /config
      env.ts                    # reads and validates environment variables
    /lib
      http-error.ts             # HTTP error class shared across modules
      logger.ts                 # single structured logger instance
    app.ts                       # builds the Fastify instance (does not call .listen())
    server.ts                    # imports app.ts and starts the port
  /test
    /modules
      /spotify
        spotify.client.test.ts
        spotify.auth.test.ts
  Dockerfile
  .dockerignore
  .env.example
  package.json
  tsconfig.json
  vitest.config.ts
```

### Golden rule of the structure

Folders are organized **by domain** (`spotify`, `posts`, `rate-limit`), never
by technical type (`/controllers`, `/services`, `/models` sitting loose at
the root). When a new domain is added, it gets its own folder under
`/modules` with the same file suffixes (`.client`, `.auth`, `.types`,
`.errors`) — this keeps the project predictable: to find anything about
Spotify, you just look at `/modules/spotify`.

A module never imports internal files from another module directly (e.g.,
`posts` does not import `spotify.auth.ts`). If `posts` needs Spotify data,
it imports the public function exported by `spotify.client.ts` — whatever is
internal to the module (helpers, private types) does not leak outward.

---

## 3. Folder structure — `/worker`

```
/worker
  /src
    /modules
      /enrichment
        enrichment.controller.ts   # receives POST /enrich
        enrichment.service.ts      # orchestrates: calls Odesli, updates the post
        odesli.client.ts           # HTTP call to the Odesli API
        odesli.types.ts
    /config
      env.ts
    /lib
      http-error.ts
      logger.ts
    /db
      client.ts                    # Postgres connection
      posts.repository.ts          # post-related queries
    app.ts
    server.ts
  /test
  Dockerfile
  .dockerignore
  .env.example
  package.json
  tsconfig.json
  vitest.config.ts
```

Same naming logic as `api`: organized by domain, with consistent suffixes
(`.controller`, `.service`, `.client`, `.repository`).

---

## 4. Predictable directory structure

- Follows the convention defined in sections 2 and 3 — do not create new
  folders at the root of `/src` unless they represent a real new domain or
  layer.
- A file's path should be guessable from the feature name: "where's the
  logic for searching music on Spotify?" →
  `/api/src/modules/spotify/spotify.client.ts`, no need to browse around.