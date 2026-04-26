# `@workspace/api-server`

Express backend for Plotzy. Uses Drizzle ORM against Neon Postgres,
Passport for auth (Google / Apple / LinkedIn / email-password), Resend
for transactional email, Microsoft Edge TTS for audiobook generation,
Pino for structured logging, and Sentry for error tracking.

## Dev

```bash
pnpm install                                 # from repo root
pnpm --filter @workspace/api-server dev      # tsx watch on src/index.ts
```

Boots on `$PORT` (default `8080`) and reads from the root `.env` via
`tsx --env-file=../../.env`.

## Build

```bash
pnpm --filter @workspace/api-server build    # esbuild → dist/index.mjs (single bundled ESM)
pnpm --filter @workspace/api-server start    # production launcher
pnpm --filter @workspace/api-server typecheck
```

## Required environment variables

Full inventory in `lib/env.ts` (Zod-validated at boot). Bare minimum:

| Var | Notes |
|-----|-------|
| `DATABASE_URL` | Neon connection string |
| `SESSION_SECRET` | ≥32 chars in production |
| `PORT` | Default 8080 |
| `NODE_ENV` | `development` / `production` |
| `ALLOWED_ORIGINS` | Comma-separated origins (CORS + CSRF) |

Optional: `OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL` (AI),
`RESEND_API_KEY` (email), `STRIPE_SECRET_KEY` / `PAYPAL_*` (payments),
Google / Apple / LinkedIn OAuth pairs, `SENTRY_DSN`,
`UPSTASH_REDIS_REST_*` (rate-limit cache).

## Routes overview

- `GET /livez` — process liveness (flat 200)
- `GET /healthz` — DB-aware readiness (200 healthy, 503 degraded)
- `GET|POST|PUT|PATCH|DELETE /api/...` — main API surface (see
  `lib/shared/src/routes.ts` for the typed contracts)
- `POST /api/stripe/webhook` — Stripe events (CSRF-exempt; verified
  server-side by Stripe's signature)
- `/auth/google` `/auth/apple` `/auth/linkedin` — OAuth bounce paths

## Architecture notes

- Both `src/routes.ts` (legacy, ~2400 lines) and `src/routes/*.ts`
  (modular) are mounted by `app.ts`. Express resolves the FIRST
  registered handler for any duplicate path, and the legacy file
  registers first. Tracked in `discovered-issues.md` — keep new code
  in the modular files.
- Async route handlers are auto-wrapped via the `app.METHOD` monkey-
  patch in `app.ts:1-21` so unhandled promise rejections become
  `next(err)` instead of crashing the process.
- The OpenAI client is configured to point at Groq's compatible
  endpoint by default (`AI_TEXT_MODEL=llama-3.3-70b-versatile`,
  `AI_TRANSCRIBE_MODEL=whisper-large-v3-turbo`). To use OpenAI
  directly, unset `AI_INTEGRATIONS_OPENAI_BASE_URL` and switch the
  model env vars.

## Troubleshooting

- **`Environment validation failed`** — `lib/env.ts` rejects the boot.
  The error block names each missing/wrong var with a one-line hint.
- **`Port already in use — standby mode`** — another instance is
  bound to `$PORT`. Free it (`taskkill //PID <n> //F` on Windows,
  `lsof -ti:8080 | xargs kill` on Unix) and restart.
- **Audio transcription returns 404 model_not_found** — the OpenAI key
  is actually a Groq key but the transcribe model is the OpenAI name.
  Set `AI_TRANSCRIBE_MODEL=whisper-large-v3-turbo` (Groq) or remove
  `AI_INTEGRATIONS_OPENAI_BASE_URL`.
- **Rate limiter never blocks** — make sure `app.set("trust proxy", …)`
  is configured for your reverse proxy (see `app.ts:83-91`). Without
  this, `req.ip` is always the proxy's IP and every user shares one
  bucket.
