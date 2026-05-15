FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── Install dependencies ─────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY lib/db/package.json lib/db/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-spec/package.json lib/api-spec/package.json
COPY lib/shared/package.json lib/shared/package.json
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/plotzy/package.json artifacts/plotzy/package.json
RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────
FROM deps AS build
COPY . .
ENV NODE_ENV=production
# Scope to api-server and its workspace dependencies (e.g. @workspace/db).
# The trailing "..." is pnpm filter syntax for "this package + transitive
# workspace deps". Excludes plotzy / mockup-sandbox / scripts which are
# either deployed elsewhere (plotzy → Vercel) or dev-only.
RUN pnpm --filter @workspace/api-server... run build

# ── Production image ─────────────────────────────────────
FROM node:22-slim AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── Piper TTS runtime: Python 3 + piper-tts pip package ──
# Used by artifacts/api-server/src/lib/piper-tts.ts to synthesize
# audiobook narration. piper-tts ships prebuilt wheels (no native
# compilation required) so this layer stays fast. Debian's Python
# is PEP 668 marked, so --break-system-packages is required to
# pip install into the system Python; this is acceptable in a
# Docker image where we own the entire Python environment.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      ca-certificates \
      curl \
      chromium \
      fonts-liberation \
      fonts-noto \
      fonts-noto-cjk \
      fonts-noto-color-emoji \
 && rm -rf /var/lib/apt/lists/* \
 && pip3 install --no-cache-dir --break-system-packages piper-tts==1.4.2

# Tell puppeteer-core where the system Chromium lives so it can
# launch headless Chrome for server-side PDF generation. See the
# /api/books/:id/download?format=pdf handler.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ── Piper voice models (~350 MB) ─────────────────────────
# Downloaded from huggingface.co/rhasspy/piper-voices. The 5 voices
# below are the production set (Ryan, Sophie, Jenny, James, Kareem).
# Each voice has two files: the ONNX model and a config JSON. The
# entire download lives in one cacheable layer so it only re-runs
# when the voice list changes — code changes do NOT bust this layer
# because we COPY application code AFTER this step.
RUN mkdir -p /app/artifacts/api-server/voices \
 && cd /app/artifacts/api-server/voices \
 && for v in \
      "en/en_US/lessac/high/en_US-lessac-high" \
      "en/en_US/hfc_female/medium/en_US-hfc_female-medium" \
      "en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium" \
      "en/en_GB/northern_english_male/medium/en_GB-northern_english_male-medium" \
      "ar/ar_JO/kareem/medium/ar_JO-kareem-medium" ; do \
      fname=$(basename "$v") ; \
      curl -fsSL -o "${fname}.onnx" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/${v}.onnx" ; \
      curl -fsSL -o "${fname}.onnx.json" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/${v}.onnx.json" ; \
    done \
 && ls -la /app/artifacts/api-server/voices/

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib/db/node_modules ./lib/db/node_modules
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/api-server/healthcheck.mjs ./artifacts/api-server/healthcheck.mjs
COPY --from=build /app/lib ./lib
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/artifacts/api-server/package.json ./artifacts/api-server/package.json

ENV NODE_ENV=production

# Run as non-root user for security. Voices and Python install live
# in root-owned, world-readable paths, so appuser can read them.
RUN useradd -m -u 1001 appuser
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node artifacts/api-server/healthcheck.mjs

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
