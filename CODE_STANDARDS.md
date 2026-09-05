# Code Standards — Music Share

This document defines the code-level rules that must be followed across the
entire backend of the project. It applies to both services in the monorepo
(`api` and `worker`). Any new code — written by a human or by an agent —
must follow this before being merged.

For folder structure and where files should live, see `ARCHITECTURE.md`.

---

## 1. Code style

- **Functions: 4 to 20 lines.** If it goes over, that's a sign the function
  is doing more than one thing — extract a new function.
- **Files: up to 500 lines.** If it goes over, split by responsibility (e.g.,
  separate validation from orchestration).
- **One thing per function, one responsibility per module** (Single
  Responsibility Principle). A `spotify.client.ts` module only knows how to
  *call* the Spotify API — it doesn't decide what to do with the result,
  doesn't validate route input, doesn't know about Fastify.
- **Names: specific and unique.** Avoid `data`, `handler`, `Manager`,
  `helper`, `util`. Prefer names that, when grepped across the codebase,
  return fewer than 5 hits (e.g., `fetchTrackBySpotifyId` instead of
  `getData`).
- **Explicit types.** Never use `any`. No `Record<string, unknown>` as a
  lazy shortcut when the shape is known — declare the real `type`/
  `interface`. Every exported function has an explicit return type, not an
  implicitly inferred one.
- **No code duplication (DRY).** Logic repeated in two places becomes a
  shared function or module — but only after the duplication actually
  appears (no speculative abstraction ahead of that).
- **Early return instead of nested if.** Maximum of 2 levels of indentation
  per function. If a third level is needed, extract the inner logic into
  another function.
- **Exception messages include the received value and the expected shape.**
  Never `throw new Error("invalid input")` alone — always
  `throw new Error(\`Expected non-empty string for "q", got: ${JSON.stringify(q)}\`)`.

---

## 2. Comments

- **Existing comments are not stripped during a refactor** without
  understanding why they're there — they carry intent and provenance that
  aren't always obvious from the code alone.
- **Comments explain why, not what.** The code already says what it does;
  the comment exists to say why that decision was made. Don't comment
  `// fetch the token` above `getToken()`.
- **Public (exported) functions get a docstring** with the function's
  intent and a minimal usage example — especially in modules that wrap an
  external API (e.g., `spotify.client.ts`, `odesli.client.ts`), where the
  third-party API's behavior isn't obvious just from reading the signature.
- **Reference the reason behind non-obvious decisions.** If a line exists
  because of some quirky behavior in an external API (e.g., "Spotify
  Accounts API requires `application/x-www-form-urlencoded`, not JSON"),
  that becomes a code comment, not knowledge lost in the head of whoever
  wrote it.

---

## 3. Tests

- **Every test runs with a single command**: `npm test` (within each
  service — `/api` and `/worker` have independent suites). This must work
  both locally and inside the Docker container, with no extra
  configuration.
- **Every new function gets a test.** Bug fixes get a regression test that
  fails without the fix and passes with it.
- **External I/O is mocked with named fake classes**, not loose inline
  stubs scattered through the test. E.g., `class FakeSpotifyClient
  implements SpotifyClient` instead of an anonymous `jest.fn()` spread
  across the test file — this makes the contract being simulated explicit.
- **Tests follow F.I.R.S.T**: fast (no real network calls), independent (do
  not depend on execution order or another test's state), repeatable (same
  result every time), self-validating (clear assertion, no manual log
  reading required), and timely (written alongside the feature, not months
  later).

---

## 4. Dependency Injection and testability

- **Dependencies are injected via parameter/constructor**, never imported
  directly as a global singleton inside the function that uses them. E.g.,
  `spotify.client.ts` receives a `getToken` function as a parameter (or via
  a factory), instead of importing `spotify.auth.ts` and calling it
  directly — this allows swapping in a fake during tests without module
  mocking.
- **Third-party libraries sit behind a thin interface owned by the
  project.** The rest of the code never imports the Spotify SDK or a
  generic HTTP client directly — it imports the module's interface
  (`spotify.client.ts`), which uses `fetch` underneath. This isolates the
  project from changes in the external lib and enables a future swap
  without rewriting consumers.

---

## 5. Formatting

- Standard formatter for the language: **Prettier** for all TypeScript
  code, with a shared config between `/api` and `/worker`
  (`.prettierrc` at the monorepo root).
- **ESLint** with strict TypeScript rules (`@typescript-eslint/recommended`
  + `no-explicit-any` as an error, not a warning).
- Do not discuss style beyond what the formatter decides — run
  `npm run format` before every commit, with no manual debate over
  spacing/braces/quotes.

---

## 6. Logging

- **Debugging/observability logs are structured as JSON**
  (use `pino`, which integrates natively with Fastify) — never a loose
  `console.log` string in production.
- **Plain text is reserved only for end-user-facing output**, when
  applicable (not the case for this backend, which has no direct CLI output
  to the user — but the rule applies if that changes).
- Every log includes minimal context: module name, and when it makes sense,
  an identifier of the related request/post — never just an isolated error
  message.

---

## 7. Errors

- Thrown errors always carry context: the received value, the expected
  value, and the module of origin. A generic error (`"Failed"`,
  `"Something went wrong"`) should never bubble up without being wrapped in
  context before leaving the module where it occurred.
- Errors from modules wrapping an external API (Spotify, Odesli) use their
  own error classes (e.g., `SpotifyAuthError`, `SpotifyRateLimitError`)
  instead of a generic `Error` — this lets the consumer decide how to
  handle it (retry, log, HTTP response) without parsing a message string.