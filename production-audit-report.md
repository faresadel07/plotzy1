# Plotzy — Production Pre-Launch Audit Report

**Scope:** ~758 files across `artifacts/api-server/src` (backend), `artifacts/plotzy/src` (frontend), `lib/db/src/schema` (database), and shared libs.
**Methodology:** Three parallel sub-agent passes (backend security & route coverage, frontend bugs & UX, database & integrations) plus targeted manual verification of the highest-impact claims.
**Excluded:** issues already shipped in commits `851b434`, `dcb4e73`, `4208482`, `591cede`, `dcef9aa`, `e98f2ca`, `50d9290`, `80f89a1`, `7d5438a`, `9e9cc1c`, `1480a45`, `c25c201` (prior audit batches A–F + pentest follow-up).

---

## 🔴 CRITICAL — must fix before launch

### C-1: `POST /api/books/:id/generate-cover` — IDOR, overwrites any book's cover
- **File:** `artifacts/api-server/src/routes.ts:617`
- **Issue:** Route is gated by `imageGenLimiter, tierAiLimiter` only — no `requireBookOwner`. Any authenticated user can call `POST /api/books/<victim>/generate-cover` and the handler executes `storage.updateBook(bookId, { coverImage: dataUri })`, replacing the victim's cover with attacker-supplied AI generation. Bonus: the book existence check (`book?.title || 'Novel'`) doesn't short-circuit on missing book — wasted AI spend on nonexistent IDs.
- **Fix:** Add `requireBookOwner` as the first middleware. Reject early if book is missing.

### C-2: `POST /api/books/:id/generate-blurb` — IDOR, overwrites any book's summary
- **File:** `artifacts/api-server/src/routes.ts:731`
- **Issue:** Same pattern as C-1: gated by `requireOpenAI, aiLimiter, tierAiLimiter` but missing ownership check. Calls `storage.updateBook(bookId, { summary: blurb })`. Attacker can rewrite any published book's blurb to spam, NSFW, or competitor content.
- **Fix:** Prepend `requireBookOwner`.

### C-3: `POST /api/payments/confirm` — payment IDOR + race condition
- **File:** `artifacts/api-server/src/routes/payments.routes.ts:54-88`
- **Issue:** No ownership check on the `bookId` param — given a valid `paymentIntentId` known to be in `pending` state, an unrelated authenticated user can flip ANY book to `isPaid: true`. Additionally, the "check existing transaction → update" sequence is non-atomic; concurrent requests with the same `paymentIntentId` both see "not yet succeeded" and double-process.
- **Fix:** Verify `req.user.id === book.userId` before updating. Wrap the status transition in a DB transaction with `UPDATE ... WHERE status = 'pending'` so only one request can flip it.

### C-4: AI improve/expand/continue/showDontTell/translate leak book lore
- **File:** `artifacts/api-server/src/routes.ts:1755-1919` (5 endpoints)
- **Issue:** Each accepts an *optional* `bookId` in the body. When supplied, the handler calls `storage.getLoreEntries(bookId)` to enrich the prompt — without checking whether the caller owns that book. Attacker submits the victim's `bookId` and gets the AI response built on the victim's worldbuilding/character notes. This is a different surface from the per-book `/api/books/:bookId/ai/*` routes already gated in commit `9e9cc1c`.
- **Fix:** When `bookId` is present in the body, require auth + ownership before fetching lore. If unauthenticated/unauthorised, drop the `bookId` silently and proceed without lore context.

### C-5: Email verification not enforced anywhere
- **File:** `artifacts/api-server/src/routes/auth.routes.ts` (registration handler) + every authenticated route
- **Issue:** `users.emailVerified` flag is set on registration and toggled by the verify endpoint, but no middleware enforces it. A throwaway-email account can register and immediately publish books, send messages, post comments, consume AI quota. Combined with the now-Zod-validated profile, this enables industrial-scale spam.
- **Fix:** Add a `requireEmailVerified` middleware. Apply it to all mutating routes EXCEPT `/api/auth/*` and the verification endpoint itself. Existing OAuth users (Google/Apple) where `email_verified` arrives true on first login should be auto-marked verified.

---

## 🟠 HIGH — fix before launch or accept material risk

### H-1: OAuth account-takeover via unverified email (Apple, LinkedIn)
- **File:** `artifacts/api-server/src/routes/auth.routes.ts:354-362, 499-510`
- **Issue:** Google One Tap correctly checks `payload.email_verified === true` before linking (commit `dcb4e73`). The Apple and LinkedIn callback handlers do NOT — they accept the OAuth provider's email as-is and link to an existing Plotzy user with the same email. A malicious OAuth account claiming `victim@gmail.com` (without verification) gets linked to the real user's row.
- **Fix:** Mirror the Google One Tap check in the Apple and LinkedIn `_verify` callbacks: if `email_verified !== true`, reject linking.

### H-2: Public comment endpoints have no per-book rate limit
- **Files:** `artifacts/api-server/src/routes.ts:441` (`POST /api/public/books/:id/comments`), `routes.ts:504` (`POST /api/books/:bookId/chapters/:chapterId/inline-comments`)
- **Issue:** `writeLimiter` (30/min/IP global) is the only protection. An attacker can spam any single published book with thousands of comments per hour from rotating IPs.
- **Fix:** Add a dedicated `commentLimiter` keyed on `(req.ip, bookId)` capped at ~10/hour per book.

### H-3: PayPal "Approve" lacks double-click prevention
- **File:** `artifacts/plotzy/src/components/paypal-button.tsx:22-49`
- **Issue:** `<PayPalButtons>` exposes Approve to rapid clicks; if both `onApprove` callbacks race to the server's capture endpoint with the same `orderID`, both can succeed and result in a double-charge. The server's idempotency relies on PayPal's order state, which lags.
- **Fix:** Track `isProcessing` state and disable the button across `createOrder` → `onApprove` lifecycle. Additionally, add server-side dedup keyed on `orderID`.

### H-4: Chapter editor "Show Don't Tell" leaks state on unmount
- **File:** `artifacts/plotzy/src/pages/chapter-editor.tsx:905-937`
- **Issue:** `setTimeout` schedules an AI fetch; the `AbortController` is created INSIDE the timeout callback. If the component unmounts before the timer fires, cleanup can't abort what hasn't started yet, and when the timeout finally fires it calls `setSdtLoading(false)` on an unmounted component (React warning at minimum, state corruption at worst).
- **Fix:** Create the `AbortController` synchronously alongside the `setTimeout`; cleanup aborts the controller and clears the timer.

### H-5: AuthContext logout — `window.google` access is `as any` and silent-fails
- **File:** `artifacts/plotzy/src/contexts/auth-context.tsx:48`
- **Issue:** `(window as any).google?.accounts?.id?.disableAutoSelect?.()` — the optional-chaining swallows undefined. If the GSI script hasn't loaded by the time logout runs, auto-select stays enabled and the next page-load silently signs the user back in.
- **Fix:** Properly type the `window.google` global once (declare in a `.d.ts`), and on logout `await loadGsiScript()` before calling `disableAutoSelect`.

### H-6: pg Pool not sized for Neon serverless
- **File:** `artifacts/api-server/src/db.ts:13`
- **Issue:** `new Pool({ connectionString })` uses Node-postgres defaults (`max: 10`, infinite idle). Neon serverless aggressively closes idle connections, and a cold-start pool spin can exhaust the project's connection budget.
- **Fix:** Configure `{ max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 }`.

### H-7: Reorder operations are N×1 sequential `UPDATE`s
- **File:** `artifacts/api-server/src/storage.ts:271-285, 696-701` (`reorderStoryBeats`, `reorderChapters`, `reorderSeriesBooks`)
- **Issue:** `for (const u of updates) await db.execute(sql\`UPDATE … WHERE id = ${u.id}\`)`. 30 chapters → 30 round-trips → ~600 ms on Neon. Drag-and-drop reordering feels laggy and consumes connection budget.
- **Fix:** Single multi-row UPDATE using `CASE WHEN id = X THEN N` patterns — one round-trip regardless of count.

### H-8: Missing UNIQUE constraint on `book_ratings(book_id, user_id)`
- **File:** `lib/db/src/schema/index.ts` (book_ratings table)
- **Issue:** Concurrent rating submissions from the same user race against the application-level dedup; both can insert and the user accidentally rates twice.
- **Fix:** `uniqueIndex("uq_book_ratings_book_user").on(t.bookId, t.userId)` + matching ALTER TABLE migration.

### H-9: Missing CHECK constraints on enum-style columns
- **File:** `lib/db/src/schema/index.ts` (`users.role`, `users.subscriptionStatus`, `users.subscriptionTier`)
- **Issue:** All declared as `text` with documented allowed values, but no DB-level enforcement. A buggy query path could persist `tier = 'gold'` and break tier checks downstream.
- **Fix:** Add CHECK constraints (or convert to PostgreSQL ENUM domains) for `role IN ('user','admin','moderator')`, `subscriptionStatus IN ('free_trial','active','canceled','expired')`, `subscriptionTier IN ('free','pro','premium')`.

### H-10: Express body limit (10 MB) applies to every route
- **File:** `artifacts/api-server/src/app.ts:144`
- **Issue:** Even endpoints that should accept ≤10 KB (login, comment, follow) accept up to 10 MB. Combined with the now-fixed avatar/banner caps in `/api/me/profile`, several other endpoints (chapter-create, book-create) still let an attacker send 10 MB JSON to inflate row size or pause the event loop during JSON.parse.
- **Fix:** Drop default to 1 MB; raise per-route only where genuinely needed (chapter content, audiobook upload).

### H-11: hover state via direct DOM mutation in two pages
- **Files:** `artifacts/plotzy/src/components/layout.tsx:152, 157, 372-373` and `artifacts/plotzy/src/pages/trash.tsx:107-124`
- **Issue:** `onMouseEnter/onMouseLeave` directly mutate `e.currentTarget.style.*`. If React re-renders between the enter and leave events (auth state changes, query invalidations), the hover state is lost mid-interaction.
- **Fix:** Lift hover into `useState` or use Tailwind/CSS `:hover` rules. Don't mutate the DOM under React's feet.

---

## 🟡 MEDIUM — quality / hardening

### M-1: TipTap `as any` casts in article + chapter editors
- **Files:** `artifacts/plotzy/src/pages/article-editor.tsx:606, 630, 884, 904, 1007, 1121` and matching spots in `chapter-editor.tsx`
- **Issue:** `(editor.chain() as any).setFontSize(...)`. TypeScript safety is bypassed in the most edited code path; a future TipTap upgrade that renames a method would silently fail at runtime.
- **Fix:** Add proper module augmentation declaring the custom `setFontSize`/`indent` commands on the `ChainedCommands` interface; remove all `as any`.

### M-2: Sentry `includeLocalVariables: true` may capture secrets
- **File:** `artifacts/api-server/src/lib/sentry.ts:32`
- **Issue:** Stack frames capture local variables when an exception is thrown. Variables in OAuth/Stripe handlers could include access tokens, password hashes, or webhook secrets at the moment of the crash. `beforeSend` only scrubs `event.request.*`, not stack frame variables.
- **Fix:** Either disable `includeLocalVariables` in production, or extend `beforeSend` to walk `event.exception.values[].stacktrace.frames[].vars` and redact known sensitive names (`token`, `secret`, `password*`, `authorization`).

### M-3: Stripe webhook has no application-level event whitelist
- **File:** `artifacts/api-server/src/webhook-handlers.ts`
- **Issue:** Signature verification is delegated to `stripe-replit-sync` (treated as a black box). The app processes whatever event types the library forwards. Future Stripe API additions could trigger handlers that weren't designed for them.
- **Fix:** Maintain an explicit `KNOWN_EVENT_TYPES` set; ignore + 200 OK on anything outside it (Stripe expects 2xx within ~5s regardless).

### M-4: Avatar upload — no client-side type/size guard
- **File:** `artifacts/plotzy/src/components/layout.tsx:229-242` (and similar in `author-profile.tsx` EditProfileModal — that one DOES enforce via Zod on the server but not client)
- **Issue:** User picks a 50 MB image → browser hangs reading it as DataURL → request fires → server rejects (250 KB Zod cap) → user sees "Save failed" with no explanation. Bad UX.
- **Fix:** Read `file.size > 250_000` and `file.type` in the change handler; toast a useful message before encoding.

### M-5: ResizeObserver cleanup edge case
- **File:** `artifacts/plotzy/src/pages/read-book.tsx:367-370`
- **Issue:** Observer disconnects on unmount, but during fast navigation the `wrapperRef.current` can become null between the `observe` call and the next layout effect, leaking one observer until GC.
- **Fix:** Null-guard before observe; capture the element in a local variable so cleanup definitely operates on the same node.

### M-6: PayPal button missing `isProcessing` UI state
- **File:** `artifacts/plotzy/src/components/paypal-button.tsx`
- **Issue:** Even after H-3's server-side dedup, the user sees no spinner or disabled state during the PayPal flow → multiple clicks feel reasonable to them.
- **Fix:** Add `isProcessing` boolean wired into PayPalButtons' `disabled` plus a spinner overlay.

### M-7: `login_attempts` table missing composite index
- **File:** `lib/db/src/schema/index.ts` (loginAttempts)
- **Issue:** `idx_login_attempts_email_created` exists but `isAccountLocked(email, ip)` now also filters by `ip` (commit `50d9290`). Sequential scan on the secondary filter at scale.
- **Fix:** Add `index("idx_login_attempts_email_ip_created").on(t.email, t.ip, t.createdAt)`.

### M-8: DisplayNameModal stale-state edge case
- **File:** `artifacts/plotzy/src/components/layout.tsx:247`
- **Issue:** Modal triggered on `?auth=success` URL param when `!user.displayName`. After a user logs in, sets a name, logs out, and logs back in — they'd never see the modal again even if a future flow requires re-prompting. Edge case but real.
- **Fix:** Once the modal closes, `history.replaceState` to drop the query param (already done) — but also key the `shouldShow` check on a server-side flag rather than client URL inference.

### M-9: dashboard-demo subscription labels not i18n'd
- **File:** `artifacts/plotzy/src/pages/dashboard-demo.tsx:103-104`
- **Issue:** `subscriptionStatus.charAt(0).toUpperCase() + slice(1)` outputs "Free", "Pro", "Premium" in English regardless of `ar` flag.
- **Fix:** Use a translation map: `{ free: ar?"مجاني":"Free", pro: ar?"محترف":"Pro", … }`.

### M-10: `linkedin_handle` schema cleanup
- **File:** `lib/db/src/schema/index.ts:21-28` and `routes/social.routes.ts` LinkedIn block
- **Issue:** Column is commented out with a "run migration first" note. Three call sites (schema, Zod handler, frontend type) reference it but are commented. Confusing for new contributors and makes the LinkedIn UI a half-feature.
- **Fix:** Either run `pnpm drizzle-kit push` and uncomment all three, or fully remove the column + UI until the migration is run.

---

## 🟢 LOW — polish

### L-1: Featured image alt text is empty
- **File:** `artifacts/plotzy/src/pages/article-view.tsx:97`
- **Issue:** `<img alt="" />` for the article's featured image is invisible to screen readers.
- **Fix:** `alt={article.title || "Featured image"}`.

### L-2: Hardcoded "Plotzy author" fallback in share handler
- **File:** `artifacts/plotzy/src/pages/author-profile.tsx` (handleShareProfile)
- **Issue:** When the OS share sheet is invoked and the author has no displayName, the share title is the English literal "Plotzy author". Minor i18n hole.
- **Fix:** `title: profile?.displayName || (ar ? "كاتب على Plotzy" : "Plotzy author")`.

### L-3: Password-reset token TTL is 1 hour
- **File:** `artifacts/api-server/src/routes/auth.routes.ts:551`
- **Issue:** Industry standard is 15-30 min for password reset; 1 hour is on the loose side, but acceptable.
- **Fix:** Tighten to 30 min if you want belt-and-suspenders.

### L-4: Missing index on `book_ratings.userId` (future-proofing)
- **File:** `lib/db/src/schema/index.ts`
- **Issue:** Author-stats queries that aggregate ratings by user will scan the table.
- **Fix:** Add `index("idx_book_ratings_user_id").on(t.userId)` opportunistically.

### L-5: `PaymentIntent`/transaction table missing index by `bookId`
- **File:** `lib/db/src/schema/index.ts`
- **Issue:** Lookups for transaction history per book scan; low volume today, will hurt later.
- **Fix:** `index("idx_transactions_book_id").on(t.bookId)`.

---

## Summary Table

| Severity | Count | Areas |
|---|---|---|
| **CRITICAL** | 5 | IDOR (cover, blurb, payment), AI lore leak, email verification |
| **HIGH** | 11 | OAuth takeover, comment spam, PayPal double-click, race conditions, schema hardening, perf |
| **MEDIUM** | 10 | Type safety, observability, UX guards, missing indexes |
| **LOW** | 5 | A11y polish, i18n holes, future-proofing indexes |
| **TOTAL** | 31 | |

## Recommended rollout order (when you say "start patching")

1. **C-1, C-2** — single commit, two-line fix each (add `requireBookOwner`)
2. **C-3** — payment IDOR + transaction race (slightly larger refactor)
3. **C-4** — AI route lore leak (gate on bookId presence)
4. **C-5** — email verification middleware (touches most routes; biggest single change)
5. **H-1** — Apple/LinkedIn OAuth `email_verified` parity
6. **H-2, H-3, H-4, H-5** — independent small commits
7. **H-6** — pool config (one line, immediate prod benefit)
8. **H-7** — N+1 reorder fix
9. **H-8, H-9** — schema migration commit (write SQL, document deploy)
10. **H-10, H-11** — hardening polish
11. **MEDIUM batch** — single QA pass commit
12. **LOW** — at leisure

Each item is independently revertable. No two CRITICAL fixes touch the same route, so they can ship as parallel small PRs if desired.
