# SenacMusicShare Backend

Created to judge other people's musical taste.

## About

Music Share is a place to share a song with strangers.

Open the feed and you'll find songs posted by anonymous people from
wherever they are, each one paired with a short message. Post your own
favorite of the day, and it goes up right alongside everyone else's.

Every post lives for 24 hours, then disappears for good. Nothing is
archived, nothing builds up into a profile or a history — just today's
songs, shared anonymously, gone by tomorrow.

## Services

Monorepo with two independent services (see `ARCHITECTURE.md` for the
folder rules and `CODE_STANDARDS.md` for code-level rules):

- `api` — HTTP entrypoint: track search on Spotify (post feed and rate
  limiting are future phases).
- `worker` — receives internal calls from the API, enriches posts with
  streaming-platform links via Odesli, and writes to Postgres.

## Stack

- Runtime: Node.js 22 (LTS)
- Framework: Fastify 5
- Language: TypeScript (strict)
- Tests: Vitest
- Database: Postgres 16 (worker only)

## Getting started

Each service has its own `package.json` and test suite.

```sh
# api
cd api
cp .env.example .env    # then fill in Spotify credentials
npm install
npm run dev             # or: npm test / npm run build

# worker
cd worker
cp .env.example .env
npm install
npm run dev
```

Or with Docker from the repo root:

```sh
docker compose up --build
```

Tests (single command per service, standards §3):

```sh
npm test --prefix api
npm test --prefix worker
```

## Honorable mention

Gemini Pro
Sonnet 5
