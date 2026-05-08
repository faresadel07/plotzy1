# Plotzy deployment guide

This document covers how to deploy the production Docker image to a host.
It is written for someone who does not have prior DevOps experience.

## What gets deployed

A single Docker image (`Dockerfile` at the repo root) that runs:

- The api-server (Express + Drizzle + Pino) on port 8080
- The plotzy frontend, served as static files by the same Node process
- Piper TTS via Python 3 + the `piper-tts` PyPI package
- 5 Piper voice models baked into the image (~350 MB)
- An ffmpeg binary via the `ffmpeg-static` npm package

**Final image size: ~1.3 GB.** That sounds large; it is normal for
self-hosted TTS. Most of it is voice models + Python ML stack
(numpy, onnxruntime).

## Recommended host: Railway

For a single-image, single-process app like this, **Railway** is the
shortest path. Other options below.

| Host | Free tier | Paid (approx) | Pros | Cons |
|---|---|---|---|---|
| **Railway** ⭐ | $5/mo credit | ~$5–10/mo for this app | One-click GitHub deploy, autoreads Dockerfile, instant SSL, easy env vars, easy rollback | Pricing scales with usage |
| **Render** | Free tier exists | $7/mo for the smallest persistent instance | Similar UX to Railway, generous free tier for small projects | Free tier sleeps after inactivity, cold start is slow |
| **Fly.io** | Free allowance | ~$3–8/mo | Globally distributed, low latency, very cheap for small apps | More CLI-driven, slightly steeper learning curve |
| **Hetzner / DigitalOcean VPS** | None | $4–6/mo (Hetzner CX22) | Cheapest at scale, full control | You manage Docker, SSL, restarts, monitoring yourself |

Suggestion: start with **Railway**. If costs grow, migrate to Hetzner.
The Dockerfile works on every host listed above without changes.

---

## Required environment variables

Set these in your host's "secrets" or "environment variables" section.
Variables are grouped by which feature they unlock.

### Always required in production

| Variable | Example value | What breaks without it |
|---|---|---|
| `NODE_ENV` | `production` | All production hardening (cookies, CORS, error messages) |
| `PORT` | `8080` | Server cannot bind. Most hosts auto-set this. |
| `DATABASE_URL` | `postgres://user:pass@host.neon.tech/db?sslmode=require` | Server refuses to start (DB is required) |
| `SESSION_SECRET` | (random 48+ hex chars, see below) | Server refuses to start in production |
| `ALLOWED_ORIGINS` | `https://plotzy.com,https://www.plotzy.com` | Server refuses to start in production |

Generate `SESSION_SECRET`:
```sh
openssl rand -hex 48
```

### Required for OAuth login (Google)

| Variable | Notes |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console → OAuth 2.0 Client IDs |
| `GOOGLE_CLIENT_SECRET` | Same place |

Without these, Google sign-in shows as "SOON" in the UI. Email
sign-up still works.

### Required for paid subscriptions (PayPal)

| Variable | Notes |
|---|---|
| `PAYPAL_CLIENT_ID` | From PayPal Developer dashboard |
| `PAYPAL_SECRET` | Same |
| `PAYPAL_SANDBOX` | `false` for production. `true` for staging/testing. |

Without these, the checkout flow won't work but the rest of the site
runs fine.

### Required for AI features (writing assistant, marketplace analyses)

| Variable | Notes |
|---|---|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI-compatible key. Currently a Groq key. |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | `https://api.groq.com/openai/v1` if using Groq |
| `AI_TEXT_MODEL` | e.g. `llama-3.1-70b-versatile` (Groq) or `gpt-4o-mini` (OpenAI) |

Without these, AI assistant + Marketplace analyses surface clear
errors. The rest of the site is unaffected.

### Required for transactional email (welcome, password reset, cancellations)

| Variable | Notes |
|---|---|
| `RESEND_API_KEY` | From Resend.com dashboard |
| `FRONTEND_URL` | `https://plotzy.com` — used in email links |

Without these, emails silently fail. Auth still works (no email
verification required).

### Optional but recommended

| Variable | What it adds |
|---|---|
| `SENTRY_DSN` | Error monitoring. Without it, server errors are invisible. |
| `SENTRY_ENVIRONMENT` | `production` (or `staging`) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Distributed rate-limiting. Without these the rate limiter falls back to in-memory, which resets on restart. |
| `LOG_LEVEL` | `info` for production. `debug` floods logs and slows the server. |
| `COOKIE_SAME_SITE` | `lax` (default). Use `none` only if you split frontend + backend onto different hosts. |
| `TRUST_PROXY` | `1` if behind a reverse proxy. Most hosts (Railway, Render, Fly) need this. |
| `APP_DOMAIN` | `plotzy.com` — used in OAuth callback URL fallback. |

### Apple Sign-In (optional, four-piece set)

If you want Apple Sign-In, set ALL FOUR or NONE:

- `APPLE_CLIENT_ID`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`

The app refuses to start if you set some but not all.

---

## Deploy to Railway (recommended path)

1. **Push the latest code to GitHub** (the `master` branch).
2. Go to [railway.com](https://railway.com), sign in with GitHub.
3. New Project → Deploy from GitHub repo → pick `faresadel07/plotzy1`.
4. Railway detects the `Dockerfile` automatically. **No build settings
   to configure.** First build takes 8–15 minutes (Python install +
   voice download + npm install + Vite build).
5. Click **Variables** in the project sidebar. Paste every required
   variable from the lists above.
6. Click **Settings** → **Networking** → **Generate Domain** to get a
   `*.up.railway.app` URL. Test the site there first.
7. **DNS:** point your `plotzy.com` A/CNAME records at Railway's domain.
   Railway issues a free SSL certificate automatically.
8. Update `ALLOWED_ORIGINS` to include your final domain after DNS is live.

## Deploy to Render

Same pattern as Railway:

1. Sign in to [render.com](https://render.com) with GitHub.
2. New → Web Service → connect the repo.
3. Render detects the Dockerfile.
4. Add env vars under **Environment**.
5. Deploy.

## Deploy to Fly.io

CLI-based, slightly more setup:

```sh
brew install flyctl  # or scoop install flyctl on Windows
fly auth login
fly launch              # detects Dockerfile, asks a few questions
fly secrets set NODE_ENV=production DATABASE_URL=... SESSION_SECRET=...
fly deploy
```

## Deploy to a VPS (Hetzner, DigitalOcean, etc.)

Cheapest, most setup work. You'll need:

- Docker installed on the VPS
- A reverse proxy with auto-SSL (Caddy is easiest)
- A way to keep the container running (`systemd` unit or `docker compose`)

A minimal `docker-compose.yml` would look like:

```yaml
services:
  plotzy:
    build: .
    restart: always
    ports: ["127.0.0.1:8080:8080"]
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      # ... etc
```

Plus Caddy as the public-facing TLS terminator pointing at port 8080.

This option saves money but adds operational responsibility. Recommend
Railway for v1, migrate to a VPS later if costs warrant.

---

## First-deploy checklist

After your first successful deploy:

- [ ] App responds at the host's URL (e.g. `https://*.up.railway.app/`)
- [ ] Frontend loads (you see the Plotzy landing page)
- [ ] `/api/auth/providers` returns `{"google":true,...}` if Google env vars are set
- [ ] You can sign up with email and create a book
- [ ] Audiobook Studio: pick Ryan voice → click Preview → audio plays
- [ ] Audiobook Studio: pick Kareem voice → click Preview → Arabic audio plays
- [ ] Audiobook Studio: download a small audiobook → MP3 plays in your local player
- [ ] DNS points to the host (your custom domain works)
- [ ] HTTPS is active (browser shows the lock icon)
- [ ] `ALLOWED_ORIGINS` includes the final domain
- [ ] PayPal sandbox flag is `false` once you're charging real money

---

## Specific resource notes for this image

- **RAM:** 2 GB minimum. Audiobook synthesis loads ONNX models that
  peak at ~250-400 MB per voice; with the api-server's own footprint
  plus Node, 1 GB hosts will OOM during exports.
- **CPU:** 1 vCPU is enough for low-traffic launch. Each Piper
  synthesis call pegs one core for 3-15 seconds.
- **Disk:** Voice models add ~350 MB to the image. Total image
  ~1.3 GB. Most hosts give 5+ GB by default.
- **Outbound network:** Required for OpenAI-compatible AI provider,
  PayPal, Resend, Upstash Redis, and Sentry. No allow-list needed
  on most hosts.
- **Cold starts:** If the host suspends idle instances (Render free
  tier does this), the first request after wake-up takes 30-60s
  while the Node process boots and imports modules.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| App won't start, log says "Environment validation failed" | A required env var is missing or malformed. Read the error lines under that header. |
| Login works but session is lost on next request | `SESSION_SECRET` is shorter than 32 chars in production, OR `TRUST_PROXY` isn't set behind a reverse proxy |
| OAuth login redirects to "redirect_uri mismatch" | The OAuth callback URL registered with Google/etc. doesn't match `https://<your-domain>/auth/google/callback` |
| Audiobook export downloads a 0-byte file | Already fixed in commit 9e3ba1c. If it returns, check that `voices/` has all 5 `.onnx` files inside the running container. |
| `python3: command not found` in audiobook logs | Image was built without the runtime stage. Re-deploy from scratch. |
| Image build fails on `RUN curl ...` voice download | HuggingFace might be down. Retry the build, or pin to a cached layer in your registry. |

---

## Operational notes

- **Database migrations**: handled at startup by `pnpm push` (Drizzle).
  Make sure `DATABASE_URL` points at the right Neon branch (production
  vs staging) before deploying.
- **PayPal Sandbox toggle**: switching `PAYPAL_SANDBOX` from `true` to
  `false` does NOT migrate any existing sandbox subscriptions. Test a
  full checkout in production-mode before announcing the launch.
- **Voice model updates**: if Piper releases a better Arabic voice or
  you swap an English voice, update the curl loop in the Dockerfile,
  rebuild, redeploy. Voice changes need a new image; they aren't
  hot-reloadable.
