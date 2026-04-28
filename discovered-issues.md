# Discovered Issues — Group A (typecheck cleanup)

This file logs findings that surfaced during Group A but were either out
of scope, out of pattern, or worth flagging for future reviewers. Sorted
by severity. Each entry includes a recommendation; nothing is auto-fixed.

---

## HIGH — security

### H-1. Rate-limit keyGenerator was bucketing all callers under one key

**File**: `artifacts/api-server/src/middleware/rate-limit.ts` (the version on
`master` before commit `fdc2308`).

**What was wrong**: the shared `keyGenerator` called
`ipKeyGenerator(req, res)` — passing the Express `Request` object where the
library expects the IP **string** as the first argument. At runtime the
library presumably stringified the Request, producing the same bucket key
for every caller. The effect: per-IP rate limiting was effectively disabled
on every endpoint that uses `aiLimiter`, `imageGenLimiter`, `generalLimiter`,
`writeLimiter`, `publicReadLimiter`, `authLimiter`, or `sensitiveAuthLimiter`.

**How it surfaced**: as a *typecheck* error (TS2345). Trying to fix the
typecheck error revealed the wrong call shape, which in turn revealed the
runtime gap.

**Severity rationale**: this defeated the rate-limit defence on registration,
login, password reset, AI endpoints (cost burn), payment intent creation,
and every other limited route. It was almost certainly the highest-impact
finding in the entire audit cycle.

**Remediation**: fixed in commit `fdc2308` — `ipKeyGenerator(req.ip || "")`
restores per-IP bucketing with proper IPv6 normalisation.

**Recommendation for future reviews**: any rate-limit middleware change
should be paired with an integration test that fires N+1 requests from one
synthetic IP and asserts the (N+1)th gets 429. Because this bug masquerades
as success at unit-test level (the function returns *some* string, just the
wrong one), only a behavioural test would have caught it.

---

### H-2. Frontend has 191 pre-existing typecheck errors hidden by api-server errors

**Scope**: 191 errors across 18 distinct error codes in
`artifacts/plotzy/src`. Top offenders:

| Count | Code | Meaning |
|------:|------|---------|
| 101 | TS2339 | Property does not exist on type |
| 24 | TS2322 | Type X is not assignable to type Y (e.g. framer-motion `ease: string`) |
| 23 | TS7006 | Parameter implicitly has 'any' type |
| 13 | TS2345 | Argument type mismatch |
| 9 | TS18046 | Variable is of type 'unknown' |

**Why hidden**: the workspace `pnpm typecheck` script runs packages in
order. Once api-server failed, the frontend was processed but its errors
got drowned in the upstream noise. After Group A made api-server clean,
the 191 frontend errors became visible.

**Why HIGH severity**: framer-motion API changed its `Variants` type signature
between releases, and the frontend's `writing-guide.tsx` still passes
`{ ease: "easeOut" }` (a string) where the library now wants
`Easing | Easing[]`. This is a *silent UI regression risk*: Vite still
builds, but at runtime framer-motion may silently fall back to default
easing or, in a future minor version, drop the unknown shape entirely.
The TS2339 cluster (101 occurrences) is similar — components reading
properties that no longer exist on the typed objects.

**Recommendation**: dedicated **Group A2** before public launch. Estimate:
2–4 hours focused work. Fixes are non-mechanical (each TS2339 needs a
real type lookup) so cannot be batched as cleanly as Group A.

---

## MEDIUM — engineering hygiene

### M-1. Audit undercounted backend typecheck errors by 4×

**Original audit report**: 16 errors across 3 files (`social.routes.ts`,
`storage.ts`, `stripe-client.ts`).

**Actual count**: 68 errors across 11 files including `app.ts`,
`middleware/auth.ts`, `middleware/rate-limit.ts`, `routes.ts`,
`routes/admin.routes.ts`, `routes/auth.routes.ts`, `routes/books.routes.ts`,
`routes/chapters.routes.ts`, `routes/misc.routes.ts`,
`routes/payments.routes.ts`, plus the original 3.

**Root cause**: the audit sampled the first error per file and stopped.
Each `tsc` line was treated as an item, not as a representative of a
class. This caused the original Group A scope to be a 4× underestimate.

**Recommendation for future audits**:
- Count ALL typecheck errors per file, not the first
- Group by error code and report counts (e.g. "TS7030 ×56 across 11 files")
- Run typecheck with `--maxNodeModuleJsDepth 0` and sift the full output
  before declaring scope, rather than truncating at the first batch

### M-2. tsc per-package error budget hides downstream errors

**Symptom**: workspace `pnpm typecheck` runs packages serially. The first
package to fail short-circuits the rest. Errors in later packages never
get reported until upstream is clean. Each "round" of fixes uncovered a
fresh set of errors that had been buried.

**Recommendation**: in CI, run typecheck per package in parallel with
`--no-bail` semantics so the full error inventory is visible from the
first run. Today's serial exit-on-first-failure pattern means a 4-round
ping-pong was needed to discover the actual scope.

### M-3. Stale type drift — `InsertUser` / `UpdateUser` were hand-narrowed and never updated

**File**: `lib/db/src/schema/index.ts` (line 679, before fix), and
`artifacts/api-server/src/storage.ts` (line 24, before fix).

**Symptom**: both were hand-written to cover only 5–11 columns of the
`users` table. As new columns landed (`passwordHash`, `linkedinId`,
`facebookId`, `bio`, `bannerUrl`, `role`, `suspended`, `emailVerified`,
etc.) the types weren't updated. Code that legitimately needed those
columns worked around the stale type with `as any` casts.

**Casts found and removed**: 6, in `auth.ts` (×2), `auth.routes.ts` (×4).

**Fix applied** (commit `fdc2308`): replaced the hand-narrowed types with
`Omit<typeof users.$inferInsert, "id" | "createdAt">` so the type is
schema-derived. New columns are now picked up automatically.

**Recommendation**: do the same conversion for `Book` / `Chapter` /
`InsertLoreEntry` and any other hand-written Insert/Update type in the
schema file. Several places in `storage.ts` still use `as any` on
`db.update(books).set(...)` / `db.update(userStats).set(...)` for the
same root cause; those weren't in scope for this group.

### M-4. `lib/shared` was missing `composite: true`, breaking project references

**Files**: `lib/shared/tsconfig.json`, also referenced in workspace root
`tsconfig.json`.

**Symptom**: the workspace root tsconfig declared a project reference to
`lib/shared` (line 16), but `lib/shared/tsconfig.json` lacked
`composite: true`. TypeScript's `--build` mode silently ignores references
to non-composite projects — meaning the root-level project graph was
broken without anyone noticing. The api-server package then couldn't
declare a reference to `lib/shared` either, surfacing as TS6059 ("not
under rootDir") once the api-server typecheck started reaching that
import.

**Fix applied** (commit `fdc2308`): added `composite: true`,
`declarationMap: true`, `emitDeclarationOnly: true`, `rootDir: "src"` to
match `lib/db` and `lib/api-zod`. Then declared `lib/db` as a reference
inside `lib/shared` (cascading project-reference fix).

**Recommendation**: audit all `lib/*/tsconfig.json` files for `composite: true`.
Any package that's listed in a `references[]` anywhere MUST have
`composite: true` or the reference is silently inert.

---

## LOW — process

### L-1. Recommendation for future audits

1. **Enumerate ALL typecheck errors, not just first per file**. Use
   `tsc --noEmit 2>&1 | grep "error TS"` and count by error code before
   estimating scope.
2. **Run audits with `--maxNodeModuleJsDepth 0`** to keep node_modules
   noise out of the report.
3. **Run typecheck per workspace package in parallel** during the audit
   so per-package error budgets don't hide downstream errors.
4. **Track cascading patterns**: when fixing one error class reveals
   another, treat the discovery itself as an audit finding to log here,
   not just a fix to apply silently.
5. **Pair every middleware change with a behavioural test**: especially
   for security middleware (auth, rate-limit, CSRF). Static type
   correctness is not a substitute for "does it actually do what it
   claims".

---

_Generated as part of Group A typecheck cleanup (commit `fdc2308`)._

---

## Group B — dependency audit findings

### Successfully patched (Group B / B1)

- 12 vulnerabilities across 4 packages (dompurify, xmldom×2, postcss)
- 75 % reduction in audit advisories (16 → 4)
- postcss required pnpm override due to vite locking it at 8.5.9

### Deferred — require major version bumps (B3)

- **HIGH**: serialize-javascript 6 → 7 (RCE, build-time only via
  vite-plugin-pwa > workbox-build)
- **MODERATE**: uuid 10 → 14 (theoretical, unreachable in svix's code path)

### NEW finding during audit — esbuild (deferred)

- **MODERATE**: esbuild ≤0.24.2 (dev-server proxy bypass)
- Path: `lib/db > drizzle-kit > @esbuild-kit/esm-loader >
  @esbuild-kit/core-utils > esbuild@0.18.20`
- **Production unaffected**: production esbuild is 0.25.12 / 0.27.3
- **Blocker**: `@esbuild-kit/core-utils` is unmaintained, pinned to
  esbuild 0.18.x. Forcing override may break `drizzle-kit push`.
- **Recommendation**: monitor drizzle-kit for an upgrade that drops
  `@esbuild-kit`, OR vendor a patched fork before production launch.

### Process learning

The audit advisory database publishes new CVEs continuously. An audit
run is a SNAPSHOT, not a permanent state. Any production launch should
include a fresh `pnpm audit` immediately before deployment, not rely
on prior audit reports.

---

_Generated as part of Group B dependency cleanup (commit `ee09218`)._

---

## Architecture issue — duplicate route registration (HIGH severity)

Both `artifacts/api-server/src/routes.ts` (legacy ~2400-line file) AND
`artifacts/api-server/src/routes/*.ts` (new modular files) are mounted
in `app.ts`. Express resolves whichever was registered first, and
`routes.ts` registers its handlers BEFORE the modular routers
(`app.use(authRouter)`, `app.use(booksRouter)`, etc., are called from
inside `registerRoutes()` in `routes.ts` AFTER the inline
`app.METHOD(...)` definitions).

Result: many endpoints exist in BOTH places. The legacy handler wins
for duplicates, while the modular handler is dead code.

**Risk:**
- Silent drift between two implementations of the same endpoint
- Maintenance confusion (which handler is the "real" one?)
- Future security fixes applied only to the modular version are
  effectively no-ops
- Group C `.strict()` work has to be done in both files, doubling the
  edit count and creating new drift surface

**Recommendation**: audit for duplicate routes, decide a single source
of truth (likely the modular routers), and remove the legacy duplicates
from `routes.ts`. Track as a separate refactoring task before
production launch — recommend doing it BEFORE Group C2 / any further
route-level work, since splitting one effort across two files is the
exact pain that motivated the modularisation in the first place.

---

_Generated as part of Group C strict-schemas pre-work._

---

# Group A2 — frontend types audit findings

## Audit framing was misleading

The audit reported 191 frontend typecheck errors. Investigation revealed:

- ~140 cascade from a single root cause (missing `responses` schemas)
- ~11 are real bugs (dead code + schema drift)
- Remaining ~40 are local issues to triage after the cascade is fixed

## Findings

### HIGH — Dead code with broken endpoint references (FIXED in Pattern 0, commit `585d9d3`)

`useImproveText` and `useExpandIdea` hooks in
`artifacts/plotzy/src/hooks/use-ai.ts` called `api.ai.improve` and
`api.ai.expand` — neither exist in the routes definition NOR exist as
server endpoints. Calls would have crashed at runtime with
`Cannot read properties of undefined (reading 'path')`. Both were
exported but never imported anywhere in the codebase. Removed.

### MEDIUM — Schema drift on DailyProgress (FIXED in Pattern 1, commit `5773f8d`)

`artifacts/plotzy/src/shared/schema.ts` declared
`DailyProgress.wordsWritten: number` while the DB column is
`word_count` and runtime code (e.g. `analytics-dashboard.tsx`) accesses
`.wordCount`. The TS type was silently wrong; runtime worked. Fixed.

### HIGH (architectural debt) — Hand-maintained schema mirror

`artifacts/plotzy/src/shared/schema.ts` duplicates types from
`lib/db/src/schema/index.ts` instead of re-exporting them. The audit
found drift in 6+ types beyond DailyProgress:

- **User**: missing 8 fields including `subscriptionTier`, `role`,
  `emailVerified`, `passwordHash`, `suspended`, `bannerUrl`,
  `linkedinId`, `facebookId`. Note: `passwordHash` being absent is
  CORRECT (frontend should never see it) — but it's right by
  *accident*, not by design. The frontend works around the missing
  fields by defining local types in `auth-context.tsx` and `admin.tsx`.
- **Book**: missing `coverData` (jsonb) and `featured` (boolean).
- **LoreEntry, Professional, QuoteRequest, StoryBeat, ResearchItem,
  ArcRecipient**: drifted but unused as type imports anywhere in the
  frontend (dead types in `schema.ts`). Some have severe drift —
  `Professional` declares `email` and `specialty` while the DB has 14
  different fields including `service` and no `email` column.

**Recommendation**: replace this file with type re-exports from
`@workspace/shared` (which can use drizzle's `$inferSelect`). Single
source of truth, automatic sync. This would eliminate the entire class
of drift bugs. Estimated effort: 1 dedicated session, since fixing the
central User and Book types may surface 5-20 new TS errors in callers
that currently work around the gaps with `as any` or local types.

### HIGH (API design) — Routes lack response schemas (DEFERRED to Group A2.2)

~140 of the 191 errors stem from `artifacts/plotzy/src/shared/routes.ts`
not defining `responses` for endpoints. The hook code calls
`parseWithLogging(api.X.Y.responses?.[200], data, "...")` — when
`responses` is undefined, `parseWithLogging<T>` falls back to
`data as T` with `T = unknown`. Every downstream property access on the
result then fails typecheck (TS2339 `Property 'X' does not exist`,
TS18046 `'X' is of type 'unknown'`, TS7006 implicit-any callbacks on
the result, etc.).

This is **API-contract design work**, not type cleanup. Each of the ~25
affected endpoints needs a Zod schema describing the response shape,
and each schema needs to match what the server actually returns
(ideally enforced by importing the same schema from the route handler).

**Estimated effort**: 1-2 dedicated sessions. Should be done before
production launch — without it, the frontend has no runtime validation
of API responses and TypeScript provides no help either.

## Process learning

Future audits should distinguish:

- **"N independent type errors"** (mechanical fixes, work scales with N)
- **"N cascading symptoms of K root causes"** (design work, work scales
  with K, not N)

Counting raw error messages overstates the work for cascade cases and
understates the design judgment required. The "191 frontend typecheck
errors" finding should have been written as "~3 root causes, with 191
visible symptoms" — that framing would have led to the right scoping
discussion at audit time rather than at execution time.

---

_Group A2 frontend types audit notes._

---

# Payment System Hardening — flagged during Issue #1 fix

## LOW — `ORDER_ALREADY_CAPTURED` retry path doesn't re-verify amount

**Location**: `artifacts/api-server/src/routes/payments.routes.ts`,
PayPal capture-order handler, around line 442 (the
`if (errText.includes("ORDER_ALREADY_CAPTURED") ...)` branch).

**Behavior**: When PayPal returns `ORDER_ALREADY_CAPTURED`, the server
returns `alreadyProcessed: true` without verifying that the original
capture's amount matched the currently-requested plan. The handler
re-uses the `plan` parameter from the *current* request body without
checking what the *original* capture was for.

**Current safety**: SAFE in normal flows because:

1. Subscription tier was activated by the original capture (which now
   passes amount verification thanks to the Issue #1 fix).
2. Re-capture attempts don't re-activate or upgrade the user — the
   `alreadyProcessed: true` early return short-circuits before any
   `storage.updateUser` call.
3. The `plan` parameter on retry is effectively ignored — the user's
   subscriptionPlan field was set at the original capture and isn't
   overwritten on retry.

**Future concern**: If the activation logic ever changes to allow
modifications via subsequent capture-order calls (e.g. "upgrade an
existing plan" via the same handler), this becomes a vulnerability.
A user could pay $9.99 for `pro_monthly`, then call capture-order
again with `plan: "premium_yearly"` after the order already captured,
and the retry path would respond with success while the real charge
was for the cheaper plan.

**Recommended (future)**: Either:

- Reject the second call entirely if the body's plan doesn't match
  the original transaction's plan (requires the transaction record
  Issue #3 will introduce); or
- Strip the `plan` param from the `alreadyProcessed` return path and
  read it from the original transaction record so the retry can
  never affect the user's tier.

**Severity**: Low (current). Watch closely if behavior changes.

_Discovered 2026-04-28 during the Payment Security Hardening — Issue
#1 (Amount Verification) implementation._

---

# UI/Backend Price Mismatch — flagged future-cleanup items

## LOW — Duplicate/dead subscription constants in 3 locations

**Locations**:
- `lib/db/src/schema/index.ts:755-758` (canonical, source of truth):
  PRO_MONTHLY_CENTS=899, PRO_YEARLY_CENTS=7999,
  PREMIUM_MONTHLY_CENTS=1699, PREMIUM_YEARLY_CENTS=15999.
- `lib/shared/src/schema-types.ts:304-305` (orphan duplicate):
  SUBSCRIPTION_MONTHLY_CENTS=800, SUBSCRIPTION_YEARLY_CENTS=7800.
- `artifacts/plotzy/src/shared/schema.ts:240-242` (frontend mirror,
  orphan duplicate):
  SUBSCRIPTION_MONTHLY_CENTS=1300, SUBSCRIPTION_YEARLY_MONTHLY_CENTS=1000,
  SUBSCRIPTION_YEARLY_ANNUAL_CENTS=9999.

**Behavior**: The two duplicate locations are not imported anywhere —
verified via `grep -rn "import.*SUBSCRIPTION_"`. They are dead code.
The canonical constants are imported only by
`artifacts/api-server/src/routes/payments.routes.ts` for both PayPal
amounts and Stripe checkout `unit_amount`.

**Current safety**: SAFE. Dead constants don't affect runtime, but
they're a nasty tripwire for future developers. Anyone reading the
frontend mirror will see "$13/month" and could reasonably assume the
backend agrees. The values aren't even close to the canonical numbers
(800, 1300, 7800, 1000, 9999 vs the real 899, 1699, 7999, 15999).

**Future concern**: A developer could:

1. Cargo-cult the wrong number into a new feature (analytics, email
   templates, marketing pages).
2. Update the dead duplicate by mistake while leaving the canonical
   stale.
3. Re-introduce a real import of the dead constants and silently
   double-charge or undercharge users.

**Recommended**: Either delete the dead constants outright, or convert
them to re-exports of the canonical schema constants
(`export { PRO_MONTHLY_CENTS as SUBSCRIPTION_MONTHLY_CENTS } from
"@workspace/db/schema"`) so the truth flows from one place.

**Severity**: Low (currently dead). Watch closely if frontend code
ever starts importing pricing constants — at that point the drift
becomes real.

_Discovered 2026-04-28 during the UI/Backend Price Mismatch
investigation (group fix/price-constants-mismatch)._

---

## MEDIUM — Stripe checkout endpoint doesn't support Premium tier

**Location**: `artifacts/api-server/src/routes/payments.routes.ts`,
`/api/subscription/create-checkout` handler (around line 163).

**Behavior**: The Stripe `create-checkout` accepts only
`plan: "monthly" | "yearly"` (the legacy plan IDs that map to Pro
tier). Lines 174-176 hardcode the price selection between two cases:

```ts
const priceData = plan === "monthly"
  ? { unit_amount: SUBSCRIPTION_MONTHLY_CENTS, recurring: { interval: "month" } }
  : { unit_amount: SUBSCRIPTION_YEARLY_ANNUAL_CENTS, recurring: { interval: "year" } };
```

There is no branch for `premium_monthly` or `premium_yearly`. The
PayPal flow (capture-order) supports all four canonical tiers, but
Stripe customers can only subscribe to Pro.

**Current safety**: SAFE in the sense that Stripe customers don't get
upgraded to Premium without paying — the request is simply rejected
by the Zod enum that limits `plan` to `monthly | yearly`.

**Impact**:

- Feature gap: users who prefer Stripe (card-on-file, Apple/Google
  Pay) can't subscribe to Premium at all.
- Inconsistent product surface: pricing.tsx advertises Premium, the
  PayPal button can charge for it, but Stripe checkout silently 400s.
- Lost revenue: a meaningful share of buyers may abandon when they
  realise Premium isn't available via their preferred payment method.

**Recommended**: Extend the Zod enum to accept all four tier IDs, and
add `premium_monthly` / `premium_yearly` cases to the price selection.
Mirror PayPal's `paypalPlanAmount` mapping. Pair the change with the
Stripe-amount-verification work below (they touch the same handler
family).

**Severity**: Medium (feature gap, not a security issue).

_Discovered 2026-04-28 during the UI/Backend Price Mismatch
investigation (group fix/price-constants-mismatch)._

---

## MEDIUM — Stripe webhook handler doesn't verify amount/plan match

**Location**: `artifacts/api-server/src/webhook-handlers.ts` and
`artifacts/api-server/src/app.ts:171` (the `/api/stripe/webhook`
mount).

**Behavior**: The Stripe webhook receives signed events from Stripe
(signature verification IS performed correctly via
`stripe.webhooks.constructEvent`). But once the event is verified as
"from Stripe", the handler trusts the event's metadata to determine
which subscription tier to activate, without independently
cross-checking that the Stripe Price object's amount matches the
plan that's being activated.

This is the Stripe equivalent of the PayPal Issue #1 vulnerability
(amount tampering). With PayPal we hardened it on
fix/payment-amount-verification by comparing the captured amount to
`paypalPlanAmount(plan)`. The Stripe path needs the same treatment.

**Current safety**: PARTIALLY SAFE. The Stripe signature check
prevents an attacker from forging an arbitrary event payload (they
can't sign one). However:

- If `metadata.plan` on the Checkout Session is set client-side via
  the `create-checkout` request body, an attacker who controls that
  body can pin a higher `metadata.plan` than the price they're
  actually paying for. The webhook would then activate the higher
  tier based on the metadata, not the verified Price.
- We need to confirm whether the create-checkout handler hardcodes
  metadata.plan server-side (safe) or echoes it from the request
  (vulnerable).

**Risk class**: Same as PayPal pre-fix — bait-and-switch tier upgrade
for the price of a lower tier.

**Recommended**: In a separate dedicated group, audit:

1. How `metadata.plan` reaches the Stripe webhook (server-side only,
   or client-controlled?).
2. Add an amount verification step that compares
   `event.data.object.amount_total` (or equivalent) against
   `paypalPlanAmount(plan)`-equivalent for Stripe.
3. Reject activation + Sentry alert + structured log if mismatch
   (mirror the PayPal fix verbatim).

**Severity**: Medium-High (needs the create-checkout audit to
determine exact severity).

**Next action**: Before estimating effort, grep create-checkout
handler for how `metadata.plan` is set. If server-side from the
Zod-validated `plan` enum (likely safe). If echoed from raw
request body (vulnerable). The result determines whether this
becomes a P1 fix or P3 hardening.

_Discovered 2026-04-28 during the UI/Backend Price Mismatch
investigation (group fix/price-constants-mismatch)._


