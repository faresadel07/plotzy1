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

## MEDIUM — Silent column drop on PayPal subscription activation

**Location**: `artifacts/api-server/src/routes/payments.routes.ts`
around line 441 (the successful-capture path of
`/api/paypal/capture-order`).

**Behavior**: After a successful PayPal capture and amount
verification, the handler calls:

```ts
storage.updateUser(userId, {
  subscriptionStatus: "active",
  subscriptionTier: tier,
  subscriptionPlan: plan,
  subscriptionEndDate: endDate,
  paymentMethod: "paypal",
} as any);
```

The `paymentMethod` field is included in the payload, BUT the
`payment_method` column does NOT exist in the `users` table schema.
The `as any` cast disables TypeScript's type checking, so the
compiler can't catch the mismatch. At runtime, Drizzle (or the
storage layer wrapping it) silently drops the unknown field — the
update for the other 4 fields succeeds, but `paymentMethod` is
never persisted.

**How discovered**: During Test 2 verification of the
amount-verification fix (group `fix/payment-amount-verification`).
The forensic DB query attempted to `SELECT payment_method` and
got `column "payment_method" does not exist`, while the production
code attempts to write to it on every successful PayPal capture.

**Current safety**: SAFE-ish. The other 4 fields update correctly,
so the subscription DOES activate. But:

1. We have NO record of which payment provider activated each
   subscription (lost analytics + lost ability to route
   cancellation/portal flows correctly per provider).
2. If we ever ADD a `payment_method` column to the schema, the
   writes would suddenly start landing — which could be a desired
   feature, but the activation could leak this field via
   copy-paste between Stripe/PayPal handlers in unexpected ways.
3. This is the observable consequence of Issue #6 from the
   original audit ("remove `as any` from `storage.updateUser`") —
   the cast hides this exact class of bug.

**Recommended fix** (in a future dedicated group, NOT here):

- Decide product intent: do we WANT to track `payment_method`
  per user? Probably yes (for cancellation routing, analytics,
  customer support).
- If yes: add `payment_method` column to users schema, write a
  migration, remove the `as any`, fix the type, deploy.
- If no: remove the `paymentMethod: "paypal"` line from the
  `updateUser` payload (and from the parallel Stripe handler if
  it has the same pattern).
- Either way: removing the `as any` is what would have caught
  this at compile time. That's the meta-fix that prevents future
  versions of this bug.

**Severity**: Medium. No security or financial impact. Loss of
operational data (per-user payment provider) and risk of similar
silent drops elsewhere via the same `as any` antipattern.

**Related**:

- Original audit Issue #6 (remove `as any` from `updateUser`) is
  the underlying cause.
- A parallel check on the Stripe activation path (around line
  ~70 in `payments.routes.ts` based on earlier context) would
  confirm whether this affects Stripe-side activations too.
  Worth a 5-min audit when Issue #6 is addressed.

_Discovered 2026-04-28 during Test 2 verification of the
amount-verification fix (group fix/payment-amount-verification)._

---

## LOW — Hardcoded "Plotzy Pro" toast on all subscription activations

**Location**: `artifacts/plotzy/src/components/paypal-button.tsx`
around line 58 (the `onApprove` success path of the PayPal button).

**Behavior**: After a successful PayPal capture for ANY plan
(pro_monthly, pro_yearly, premium_monthly, premium_yearly, plus
the 3 legacy plan IDs), the success toast displays:

```ts
toast({
  title: "🎉 Welcome to Plotzy Pro!",
  description: "Your subscription is now active."
});
```

The `plan` prop is in scope (it's used in the request body on the
preceding line) but is not used to differentiate the message. As
a result:

- A user activating `premium_yearly` sees "Welcome to Plotzy Pro"
  even though they're now on Premium.
- A user activating `pro_monthly` sees the same message — which
  happens to be correct.
- The DB and the gated features both reflect the correct tier
  immediately after activation, so users WILL notice they actually
  got Premium when they use Premium-only features. The toast just
  lies for a moment.

**How discovered**: During Test 1.4 verification of the
amount-verification fix (group `fix/payment-amount-verification`),
the user reported the toast saying "Plotzy Pro" after upgrading
to `premium_yearly`. Backend verification confirmed the DB
activated `premium_yearly` correctly — the toast was the only
wrong thing.

**Current safety**: SAFE. No security or financial impact. The
correct tier is activated; the toast is just a static string
that doesn't reflect the actual tier. Mildly confusing UX but
reversible in seconds (the user reloads and sees the Premium
tier active).

**Recommended fix** (in a future frontend polish group):

```ts
const tierLabel = plan?.startsWith("premium") ? "Premium" : "Pro";
toast({
  title: `🎉 Welcome to Plotzy ${tierLabel}!`,
  description: "Your subscription is now active."
});
```

Or, more robustly, derive the label from the API response or a
mapping that tracks the canonical plan-to-tier relationship
(consistent with the `planToTier()` mapping on the backend). A
shared frontend constant or hook would be cleanest if the same
label is needed elsewhere.

If we eventually internationalize the app, this toast string
should also be wrapped in a translation function — flag for that
future work, too.

**Severity**: LOW. Cosmetic / UX. No data integrity issue.

_Discovered 2026-04-28 during Test 1.4 verification of
amount-verification fix (group fix/payment-amount-verification)._

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


# Card Button Verification — flagged during Phase 1 verification

## LOW — Card flow shows stuck-loading state briefly after success

**Location**: `artifacts/plotzy/src/components/paypal-button.tsx`
(`onApprove` function, around lines 49-66).

**Behavior**: After a successful card payment via the gray "Debit
or Credit Card" button, the PayPal popup closes and the success
toast fires correctly, but the buttons themselves remain in their
loading-spinner state for 1-2 seconds before the page navigates
away or the spinner clears. The user sees what looks like "still
processing" even though the backend has fully activated the
subscription.

**How discovered**: During Test C1.1 verification of the card
payment flow (group `verify/card-button-flow`). DB confirmed
subscription was active immediately; only the visual state
lagged.

**Cause** (most likely):
- `refetch()` is fire-and-forget (not awaited) — auth context
  refresh races `onSuccess?.()` / `navigate("/")`.
- Plus possible PayPal SDK internal state retention after popup
  close in `react-paypal-js` v9.
- The `finally` block does call `setIsProcessing(false)`, but
  timing vs. SDK-internal repaint can leave a brief gap.

**Current safety**: SAFE. Cosmetic only. DB and entitlements are
correct as soon as the backend confirms the capture. Users who
refresh see the right state immediately.

**Recommended fix** (future frontend polish group):
1. `await refetch()` before `navigate("/")` or `onSuccess?.()`.
2. Move `setIsProcessing(false)` BEFORE the success toast/
   navigation so visuals clear first.
3. Consider an explicit "redirecting…" overlay during the brief
   gap.

**Severity**: LOW. UX/cosmetic only.

_Discovered 2026-04-29 during Test C1.1 of card flow verification
(group `verify/card-button-flow`)._


# Quick Wins Batch 1 — flagged during Step 4 testing

## LOW — Resend `onboarding@resend.dev` testing domain blocks all
## sends to recipients other than the account owner

**Location**: `artifacts/api-server/src/lib/email.ts:43`, also
`artifacts/api-server/src/routes/auth.routes.ts:199` and `:625`,
`artifacts/api-server/src/routes/misc.routes.ts:383`. All four
hardcode `from: "Plotzy <onboarding@resend.dev>"`.

**Behavior**: Resend's shared `onboarding@resend.dev` testing
domain has a documented restriction — it can only send to the
email address registered with the Resend account. Sends to any
other recipient are silently rejected (or returned with a 422
`validation_error` visible only in the Resend dashboard). The app
sees no error: `sendEmail()` swallows the failure in its internal
try/catch, the user-facing flow returns 200, but the email never
arrives.

**How discovered**: Step 4 of `feat/quick-wins-batch-1` (cancel
subscription confirmation email). The cancel flow worked end-to-end
on id=2 (`faresadeldq@gmail.com`) with the UI flipping correctly
and the DB updating, but the email never landed in the inbox.
After investigation: id=2 is not the Resend-registered account;
id=1 (`faresadelqd@gmail.com`) is. Re-tested on id=1 and the email
arrived as expected.

**Current safety**: SAFE for development — the Resend account
owner can test all email flows on their own account. No production
impact yet because Plotzy isn't launched.

**Recommended fix BEFORE production launch**:
1. Verify a custom domain in Resend (typically
   `noreply@plotzy.com` or `mail.plotzy.com`). Resend's docs:
   https://resend.com/docs/dashboard/domains/introduction
2. Update the `DEFAULT_FROM` constant in `lib/email.ts` (or read
   from `process.env.EMAIL_FROM`) and the support-email `from`
   override in `misc.routes.ts`. After feat/quick-wins-batch-2
   Step 1, all email sends route through the centralized
   `sendEmail()` helper, so this is a 1–2 line change rather than
   touching multiple call sites.

**Severity**: LOW for dev, **HIGH for production launch**. Without
this fix, no real users will ever receive: verification emails,
password reset emails, notification emails, payment receipts, or
cancel confirmations. The whole email pipeline silently fails for
everyone except the Resend-account owner.

_Discovered 2026-04-30 during Step 4 testing of
`feat/quick-wins-batch-1` (cancel subscription confirmation email)._

## LOW — `GET /api/admin/support/unread-count` returns 500

**Location**: `artifacts/api-server/src/routes/misc.routes.ts:647-655`.

**Behavior**: The endpoint calls `storage.getSupportMessages()`,
expects an array, and filters with `messages.filter((m: any) => !m.read).length`.
In the running dev environment (logged in as id=1 admin) it returns
500 — the body says `{"message":"Internal error"}` and the error
gets swallowed by the bare `catch (err)` with no logging.

**How discovered**: Network tab spotted during Step 3 verification
of `feat/admin-dashboard` (extending the activity feed). Unrelated
to today's work — this endpoint hasn't been touched in this group.

**Current impact**: The admin nav badge for unread support tickets
silently fails to populate. The Support tab itself
(`/api/admin/support`) still works because it calls the same storage
method but presumably doesn't trip whatever the underlying error is —
worth confirming during the actual investigation.

**Suggested investigation**:
1. Add a `logger.error({ err }, "...")` inside the `catch` so the
   underlying exception surfaces in the logs (right now it's blind).
2. Run the endpoint in isolation and inspect the thrown error —
   most likely candidates: a Drizzle schema/column drift, a `null`
   on `m.read`, or `getSupportMessages()` returning a non-array
   shape under some condition.
3. Once the root cause is known, either fix in place (LOW-effort)
   or convert to a `count(*)` SQL query directly so a single
   malformed row can't blow up the whole admin nav.

**Severity**: LOW. No data loss, no user-facing impact, only a
missing nav-badge count for admins.

_Discovered 2026-04-30 during Step 3 testing of
`feat/admin-dashboard` (activity feed payments extension)._

## LOW — No self-service account deletion endpoint exists

**Location**: `artifacts/api-server/src/routes/auth.routes.ts` —
no DELETE handler for the authenticated user's own account.
The only deletion path is `DELETE /api/admin/users/:id` at
`misc.routes.ts:514`, gated by `requireAdmin` and intended for
moderation, not self-service.

**Behavior**: A regular signed-in user has no way to delete
their own Plotzy account from the UI. To delete, they must email
`faresadel@gmail.com` and request manual removal. The /faq page
documents this honestly.

**Why LOW**: deletion is still possible via support contact; the
gap is convenience and ergonomics, not a privacy or compliance
blocker. GDPR/CCPA compliance still operative because the
manual path exists and we honor requests.

**Suggested implementation when this is addressed**:
1. New endpoint `POST /api/auth/delete-account` (or DELETE).
   Auth-required. Confirm with current password (or fresh OAuth
   re-auth) so a hijacked session cannot trigger deletion.
2. Reuse `storage.deleteUser` which already orphans published
   books (sets `userId: null` on books to preserve community
   engagement) and cascades drafts. This behavior matches what
   the FAQ promises so no schema changes needed.
3. Client-side: a danger-zone section in
   `pages/account-subscription.tsx` (or a new `/account` page)
   with a typed-confirmation modal ("type DELETE to confirm").
4. Email confirmation post-deletion through the existing
   `sendEmail` helper so the user gets a record.

**Out-of-scope rationale**: was out of scope for `feat/faq-page`
which only documents existing behavior. The FAQ answer was
written truthfully (`Self-service account deletion is on our
roadmap.`).

_Discovered 2026-04-30 during Phase A audit of `feat/faq-page`
when verifying the founder-stated claim "users can permanently
delete their account" against the codebase._

## INFO — Pre-existing FAQ block on Support page contained 9 false claims (now removed)

**Location**: `artifacts/plotzy/src/pages/support.tsx` lines
16–99 (pre-merge). Removed in `feat/faq-page` and replaced with a
small banner pointing users to the new `/faq` page.

**The false claims that shipped to users**:

1. "Free accounts receive 20 AI requests per month" — schema is
   10 per **day**, not 20 per month.
2. "Pro: 500 monthly AI requests (unlimited on annual plan)" —
   schema is 100 per day; yearly is not unlimited.
3. "Pro users get 10 AI cover generations per month" — schema
   is 10 per **day**.
4. "Authors keep 85% of every sale. Plotzy retains a 15%
   platform fee" — there is no marketplace book-sales feature.
5. "We offer a full refund within 7 days of any purchase" —
   no refund-initiation code exists; policy is case-by-case.
6. "All payments are processed by Stripe" — Plotzy uses
   PayPal, not Stripe.
7. "SOC 2 Type II certification. Backed up every 6 hours with
   30-day retention" — Neon's posture; the specific intervals
   were unverifiable / fabricated.
8. "Account Settings > Data & Privacy > Export My Data" —
   no such endpoint or UI exists.
9. "Account Settings > Danger Zone > Delete Account.
   Permanently removes all your writing" — no self-service
   deletion UI, and the deletion that does exist orphans books
   rather than deleting them.

Plus 4 unverifiable claims (50%/30% student/non-profit
discounts, 24-hour content-moderation SLA, "feature request
board", "triage bug reports within 4 hours") and 2 hard-coded
past-date promises ("offline mode Q3 2025", which never shipped).

**Why this is INFO not a future task**: the false content was
deleted, replaced by the new `/faq` page rendering from the
single source of truth `src/data/faq-data.ts`. There is no
remaining work item from this discovery. Logging it here so a
future maintainer who finds the diff understands the scope of
the cleanup and the quality bar that motivated it.

_Discovered 2026-04-30 during Step 1.5 of `feat/faq-page` when
auditing existing FAQ surfaces before publishing the new one._

## DEFERRED — Stage 6 of feat/remove-stripe (DB migration) and downstream legal/FAQ updates

**Context**: `feat/remove-stripe` removed Stripe across 8 planned
stages. Stages 1-5 (backend routes, webhook, storage layer,
stripe-client + npm uninstall, frontend dead code) and Stages
7-8 (.env, docs) all shipped. Stage 6 (DB migration) was
explicitly deferred per founder's request to handle separate
database issues first.

### 1. Stage 6 — drop the `transactions` table and Stripe columns on `users`

The `transactions` table and three Stripe columns survive in the
schema as of merge. Pre-flight verified all three columns are
empty (0 rows total). The transactions table is also empty
(0 rows). The schema comment at
`lib/db/src/schema/index.ts:178-180` already documents that
`transactions` is "strictly tied to one-time book unlocks" — the
deleted Stripe path.

Migration to run when ready:
```sql
BEGIN;
ALTER TABLE users DROP COLUMN stripe_customer_id;
ALTER TABLE users DROP COLUMN stripe_subscription_id;
DROP TABLE transactions;
COMMIT;
```

Schema files to prune after the SQL succeeds:
- `lib/db/src/schema/index.ts` — remove `stripeCustomerId` +
  `stripeSubscriptionId` columns from `users` table; remove the
  entire `transactions` pgTable definition; remove the
  corresponding `Transaction` / `InsertTransaction` type exports.
- `lib/shared/src/schema-types.ts` — same changes, mirror copy.

### 2. Privacy Policy + Terms of Service Stripe references

Three places in `pages/privacy-policy.tsx` (lines 150, 176, 222
at the time of audit) and one place in `pages/terms-of-service.tsx`
(line 228) name "Stripe and PayPal" or "Stripe / PayPal" as
payment processors. The pre-launch audit's C-1 finding originally
flagged these as false claims; the stripe-investigation.md report
inverted that finding when it discovered Stripe was live in code.
Now that `feat/remove-stripe` has actually removed Stripe, the
legal docs should be updated to remove Stripe and mention PayPal
alone. Approximately 5 minutes of edits.

### 3. FAQ alignment (no action needed)

The /faq currently states "Plotzy uses PayPal as its payment
processor" at `artifacts/plotzy/src/data/faq-data.ts:181-187`
and 223. With Stripe genuinely removed now, this answer is
accurate. No change needed.

### 4. Stage 6 readiness checklist

Before running the migration:
- Confirm production DB matches dev DB (pre-flight ran on
  dev — re-run the SELECT counts against prod connection string
  before any DROP)
- Take a Neon DB branch snapshot or backup
- Run inside a transaction (BEGIN ... COMMIT) so a partial
  failure doesn't leave the schema half-mutated
- After SQL: prune the two schema files above, run typecheck +
  build, commit, merge

**Why DEFERRED rather than CRITICAL**: the surviving columns and
empty transactions table are inert — no code reads or writes
them after Stages 1-5. The launch is not blocked by leaving
them in place. They are simply schema noise that should be
cleaned up when Faris is ready to coordinate with whatever
other DB work is in flight.

_Logged 2026-05-04 during Stage 8 of `feat/remove-stripe`._

## LOW — Same bare-catch-500 pattern on GET /api/admin/support

**Location**: `artifacts/api-server/src/routes/misc.routes.ts:658-665`.

The full-list support-tickets endpoint mirrors the bare-catch
pattern that we fixed for `/api/admin/support/unread-count` in
Item 3 of feat/cleanup-batch-1. Same defensive treatment should
apply: structured `logger.error({ err }, ...)` inside the catch
(currently `err` is captured and silently dropped) plus a graceful
fallback rather than 500ing the admin Support tab on a transient
failure.

**Why LOW**: the admin Support tab is internal-only and a 500
here doesn't affect end-users. The next request retries; the
failure window is bounded.

**Suggested fix when prioritised**:
```ts
catch (err) {
  logger.error({ err }, "Failed to fetch admin support messages");
  return res.json([]);  // or 503, depending on how the UI should react
}
```

_Logged 2026-05-04 during Item 3 of feat/cleanup-batch-1
after deciding to keep this batch's scope narrow._


