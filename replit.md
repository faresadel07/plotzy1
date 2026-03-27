# Plotzy — Write Your Story

## Overview

Full-stack book writing and publishing platform. pnpm monorepo with React+Vite frontend, Express API server, and PostgreSQL database.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **Frontend**: React 19 + Vite 6 + TypeScript + Tailwind v4
- **3D**: @react-three/fiber v9 (React 19 compatible) + @react-three/drei v10
- **Animations**: framer-motion
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Auth**: Passport.js (Google OAuth + email/password)
- **Payments**: Stripe (subscriptions)
- **AI**: OpenAI API (writing assistance)
- **File uploads**: multer
- **WebSockets**: ws

## Structure

```text
workspace/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   │   └── src/
│   │       ├── index.ts        # Entry point
│   │       ├── app.ts          # Express setup
│   │       ├── routes.ts       # All API routes (~1700 lines)
│   │       ├── storage.ts      # DB access layer
│   │       ├── auth.ts         # Passport strategies
│   │       ├── stripe-client.ts
│   │       ├── achievements-engine.ts
│   │       └── db.ts           # Drizzle client (imports from ../../../lib/db)
│   └── plotzy/             # React + Vite frontend
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── index.css       # Tailwind v4 (@import "tailwindcss")
│           ├── pages/
│           ├── components/
│           └── hooks/
├── lib/
│   ├── db/                 # Drizzle ORM schema + DB connection
│   │   └── src/schema/index.ts  # All table definitions
│   └── shared/             # Shared types and route definitions
│       └── src/
│           ├── routes.ts        # Typed API routes
│           └── achievements.ts  # Achievement definitions
└── pnpm-workspace.yaml
```

## Key Configuration Notes

### Tailwind v4
`index.css` uses `@import "tailwindcss"` + `@theme inline {}` block (NOT `@tailwind` directives).

### Zod imports
`lib/db/src/schema/index.ts` imports from `"zod/v4"` for drizzle-zod 0.8.x compatibility.

### Vite fs config
`deny: ["**/.env", "**/.env.*", "**/.git/**"]` — do NOT use `"**/.*"` (blocks .vite/deps).

### @react-three/fiber
Must use v9.x (React 19 compatible), NOT v8.x.

### API server import paths
From `artifacts/api-server/src/*.ts` to shared lib:
- `../../../lib/db/src/schema` (3 levels up to workspace root, then into lib)
- `../../../lib/shared/src/routes`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with all Plotzy routes.

- Entry: `src/index.ts` — reads `PORT` (8080), starts server
- App setup: `src/app.ts` — CORS, sessions, Passport, routes
- All routes: `src/routes.ts` (books, chapters, lore, story beats, auth, AI, Stripe, admin, etc.)
- Storage: `src/storage.ts` — database access abstraction
- Dev: `pnpm --filter @workspace/api-server run dev` (tsx watch)

### `artifacts/plotzy` (`@workspace/plotzy`)

React 19 + Vite 6 frontend.

- Dev: `pnpm --filter @workspace/plotzy run dev`
- API proxy: Vite proxies `/api/*` to `http://localhost:8080`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM.

- Schema: `src/schema/index.ts` — all table definitions
- Config: `drizzle.config.ts`
- Push schema: `pnpm --filter @workspace/db run push`

### `lib/shared` (`@workspace/shared`)

Shared route type definitions and achievement constants used by both frontend and backend.

## Book Tools (Tools Tab in Book Editor)

### AI Analysis Tools (`src/components/ai-analysis-tools.tsx`)
4 AI-powered analysis tools, each calls a POST endpoint and renders a markdown report:
- **Plot Hole Detector** → `POST /api/books/:id/ai/plot-holes`
- **Dialogue Coach** → `POST /api/books/:id/ai/dialogue-coach`
- **Pacing Analyzer** → `POST /api/books/:id/ai/pacing`
- **Character Voice** → `POST /api/books/:id/ai/voice-consistency`

All use `gpt-4.1-mini` with JSON response format. `buildManuscript()` helper fetches up to 10 chapters (6000 chars each).

### Publishing Tools (`src/components/book-publishing-tools.tsx`)
- **Print Layout Preview** — opens printable view
- **ISBN** → `PATCH /api/books/:id/isbn` — stores ISBN in `books.isbn` column
- **ARC Distribution** → `GET/POST /api/books/:id/arc`, `PATCH/DELETE /api/books/:id/arc/:recipientId` — uses `arc_recipients` table
- **KDP Guide** — collapsible step-by-step guide with KDP link

## Marketplace (`/marketplace`)

9 AI publishing services. Each card has an "Analyze" button that opens `LaunchModal`.

`LaunchModal` flow:
1. Auto-selects the user's first book (via `useEffect` on `myBooks` load)
2. User can switch to Upload/Paste tabs for custom text
3. Clicking "Run Service" calls `POST /api/marketplace/analyze` with `{ serviceId, text }`
4. Result markdown is rendered inline

Service IDs: `dev-editor`, `copy-editor`, `proofreader`, `cover-generator`, `blurb-writer`, `query-letter`, `marketing-plan`, `sensitivity-reader`, `translation`

## Gutenberg Public-Domain Library

Routes: `/discover` (grid browser) → `/discover/:id` (immersive reader)

- **Discover page** (`src/pages/discover.tsx`): Hero search, recently-read shelf (localStorage), genre pill filters, collapsible Filters panel (language + sort), Gutendex API-backed results
- **Reader** (`src/pages/gutenberg-reader.tsx`): Full-screen Kindle-style reader, ~245 words/page pagination, slide transitions, keyboard/swipe navigation, localStorage position persistence, TOC drawer, font/line-height controls, dark/light toggle, .txt download
- **API routes** (in `routes.ts` `registerRoutes`): `GET /api/gutenberg/search`, `GET /api/gutenberg/books/:id`, `GET /api/gutenberg/books/:id/content` (fetches + DB-caches plaintext from Gutenberg servers, strips boilerplate)
- **Critical**: `App.tsx` Router skips `page-turn-enter` animation class for `/discover/:id` routes because `perspective()/rotateY()` CSS transforms on ancestor elements cause `position: fixed` descendants to be positioned relative to the transformed element (not the viewport), making the full-screen reader invisible
- **Parsing**: `parseParagraphs()` normalizes `\r\n` Windows line endings before splitting on `\n{2,}`. Filters lines under 12 chars and `[Illustration]` markers
- **localStorage keys**: `plotzy_rpos_{gutId}` (page position), `plotzy_recently_read` (array of up to 24 recently-read entries)

## Environment Variables Needed

- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)
- `SESSION_SECRET` — Express session secret
- `OPENAI_API_KEY` — For AI writing assistance
- `STRIPE_SECRET_KEY` — For subscriptions
- `STRIPE_PUBLISHABLE_KEY` — For frontend Stripe.js
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — For Google OAuth
