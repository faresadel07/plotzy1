# Plotzy

A modern web platform for writers — book / chapter editor, AI assistant
(improve, expand, continue, translate), audiobook generation via Microsoft
Edge TTS, marketplace, public library, and reader/social features.

Monorepo (pnpm workspaces). Two deployable surfaces:

- **`artifacts/api-server`** — Express + Drizzle + Neon Postgres backend
- **`artifacts/plotzy`** — React + Vite frontend (PWA)

Plus shared workspace packages under `lib/*` (DB schema, route contracts,
typed API client, shared utilities).

## Quick start (local dev)

```bash
pnpm install
cp .env.example .env      # then fill in DATABASE_URL + secrets
pnpm --filter @workspace/api-server dev   # backend on :8080
pnpm --filter @workspace/plotzy dev        # frontend on :5173 (proxies /api → :8080)
```

## Required environment variables

The full list lives in [`.env.example`](./.env.example). The minimum to
boot the backend:

| Var | Why |
|-----|-----|
| `DATABASE_URL` | Neon Postgres connection string |
| `SESSION_SECRET` | ≥32 chars in production; generate via `openssl rand -hex 48` |
| `PORT` | api-server port (default 8080) |
| `NODE_ENV` | `development` / `production` |
| `ALLOWED_ORIGINS` | Comma-separated list of front-end origins (CORS + CSRF) |

Optional but used heavily: `OPENAI_API_KEY` (or Groq via
`AI_INTEGRATIONS_OPENAI_BASE_URL`), `RESEND_API_KEY` (transactional
email), Stripe / PayPal, Sentry, Google / Apple / LinkedIn OAuth pairs.
Boot-time validation (`lib/env.ts`) prints a precise list of which vars
are missing or wrongly shaped.

## Workspace commands

```bash
pnpm typecheck             # workspace-wide; gates on the invisible-char scan first
pnpm scan:invisible        # ASCII guard against U+2028/2029 + Trojan-Source bidi chars
pnpm build                 # typecheck → all package builds (esbuild + Vite)
pnpm audit                 # dependency vulnerability check
```

Per-package:

```bash
pnpm --filter @workspace/api-server <script>   # dev / build / typecheck / start
pnpm --filter @workspace/plotzy <script>       # dev / build / preview / typecheck
```

## Deploy

`Dockerfile` builds a Node 22-slim runtime image. Multi-stage:

1. **deps** — installs from `pnpm-lock.yaml` with `--frozen-lockfile`
2. **build** — `pnpm run build` (typecheck + esbuild bundle + Vite build)
3. **runtime** — non-root user, `dist/index.mjs` entrypoint, `/healthz`
   liveness probe via `healthcheck.mjs`

```bash
docker build -t plotzy .
docker run --rm -p 8080:8080 --env-file .env plotzy
```

`/healthz` (200 = healthy, 503 = DB unreachable) is wired into Docker
HEALTHCHECK; `/livez` is the lightweight "process is alive" probe.

## Troubleshooting

- **Backend exits with `Environment validation failed`** — fill the
  vars listed under the failure. The error block shows the schema path
  and a hint per missing/wrong field.
- **Frontend says "Could not reach the server"** — backend isn't
  running, or `ALLOWED_ORIGINS` doesn't include the dev origin
  (`http://localhost:5173` by default).
- **`pnpm audit` shows new advisories that weren't there last week** —
  GHSA publishes new CVEs continuously. Always re-audit at the deploy
  boundary; don't rely on prior reports.
- **Schema changes don't take effect** — there's no migrations folder
  yet. The team currently uses `pnpm --filter @workspace/db push` which
  applies the schema directly to the configured `DATABASE_URL`. Use a
  Neon dev branch when iterating on schema; never push-force production.

## Repo structure

```
artifacts/
  api-server/     Express backend (esbuild bundle, Pino logging, Drizzle)
  plotzy/         React + Vite frontend (PWA, TipTap editor, framer-motion)
  mockup-sandbox/ Standalone Vite playground for design iteration
lib/
  db/             Drizzle schema + db config
  shared/         Route contracts (Zod), achievements, shared helpers
  api-zod/        Generated Zod helpers for the API contract
  api-client-react/ Typed client hooks for consuming the API from React
scripts/          Workspace-level utilities (e.g. invisible-char guard)
.env.example      Full list of supported environment variables
Dockerfile        Production runtime image
discovered-issues.md   Findings logged across audits — read before launch
```

## License

Private. See `package.json` `"private": true`.
