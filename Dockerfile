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
RUN pnpm run build

# ── Production image ─────────────────────────────────────
FROM node:22-slim AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib/db/node_modules ./lib/db/node_modules
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/plotzy/dist ./artifacts/plotzy/dist
COPY --from=build /app/lib ./lib
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/artifacts/api-server/package.json ./artifacts/api-server/package.json

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
