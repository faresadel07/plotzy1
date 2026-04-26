# `@workspace/plotzy`

React + Vite frontend for Plotzy. Single-page app with a service worker
(PWA precache), TipTap-based rich-text editor, framer-motion animations,
TanStack Query for data fetching, wouter for routing, and Tailwind 4 +
shadcn/ui for styling.

## Dev

```bash
pnpm install                            # from repo root
pnpm --filter @workspace/plotzy dev     # vite dev server on :5173
```

The dev server proxies `/api/*` and `/auth/*` to `http://localhost:8080`
(the api-server). Boot the api-server first, or the dev server will show
"Could not reach the server" on every authenticated query.

## Build

```bash
pnpm --filter @workspace/plotzy build      # vite production build → dist/public
pnpm --filter @workspace/plotzy preview    # serve the build locally
pnpm --filter @workspace/plotzy typecheck  # tsc --noEmit
```

The Vite build emits a service worker (`vite-plugin-pwa`) that precaches
the app shell. After deploying a new build, the existing service worker
needs to be unregistered before users see the new bundle — `main.tsx`
contains a one-time SW cleanup that handles this automatically on first
load post-deploy.

## Architecture notes

- **API contract** is shared via `@workspace/shared` (`lib/shared/src/
  routes.ts`). Use the typed `apiRequest` helper in `lib/queryClient.ts`
  rather than raw `fetch()` when adding new endpoints, and add the
  Zod input schema to the shared routes file so frontend + backend
  stay in lock-step.
- **Auth** state lives in `contexts/auth-context.tsx`. The `/api/auth/user`
  response is the source of truth for `user` (id, email, displayName,
  hasGoogle, hasApple, subscriptionStatus, isAdmin, suspended). Raw
  OAuth subject IDs (`googleId`, `appleId`) are deliberately never
  shipped to the browser.
- **HTML sanitisation** for stored book content goes through `lib/sanitize.ts`.
  It uses DOMPurify with a strict allowlist and post-processes hooks to
  enforce `rel="noopener noreferrer"` and reject non-http(s) URL schemes.
- **Mobile blocking** at <700px viewport is implemented in
  `components/MobileBlocker.tsx`. The editor is desktop-only by design
  for now; loosening this is a planned UX rework.

## Troubleshooting

- **`Could not reach the server`** — backend is down OR the dev proxy
  in `vite.config.ts` is misrouted. `curl localhost:8080/api/auth/providers`
  to confirm the backend is up.
- **OAuth button shows "SOON"** — `/api/auth/providers` returned
  `{ google: false }` because the corresponding env vars aren't set on
  the backend. Configure `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` on
  the backend (and Apple / LinkedIn equivalents) and restart.
- **Stale build after deploy** — the SW cleanup in `main.tsx` should
  force a one-time hard reload. If users get stuck on the old bundle,
  bump `RELOAD_FLAG` in `main.tsx` to a fresh sessionStorage key.
- **Bundle is huge** — `index-*.js` ~1.9 MB before gzip. Vite warns at
  500 KB. Lazy-load via `React.lazy` for heavy editor / chart pages
  before launch (TipTap + recharts + AmbientSoundscape are the biggest).
