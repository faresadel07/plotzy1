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

## MEDIUM — Missing logged-in change-password endpoint

**Location**: `artifacts/api-server/src/routes/auth.routes.ts` —
no `POST /api/auth/change-password` (or similar) handler exists.

**Behavior**: A logged-in user has no in-app way to change their
password without going through the forgot-password reset-token
flow. They have to log out, click "Forgot password," wait for the
email, follow the link, and set the new password. This is the
recovery flow, not the routine-rotation flow.

**Why this matters now**: Item 5 of feat/cleanup-batch-1 wired
the new password-changed notification email into the
`/api/auth/reset-password` handler — the only path that exists.
The user prompt asked us to "verify BOTH paths" assuming a
logged-in change endpoint existed. It does not. The single path
is now covered; the second path remains missing.

**Cross-reference**: This is the same gap previously logged in
`pre-launch-audit.md` as M-11 ("No password-change endpoint for
logged-in users"). Re-flagging here so it doesn't drift, and so
the next batch that adds this endpoint knows to also call the
same `sendEmail` helper to fire the password-changed
notification (the email body and contact-email env-var pattern
are already in place at `auth.routes.ts:705-738`).

**Suggested implementation when prioritised**:
```ts
// POST /api/auth/change-password — auth-required
// Body: { currentPassword: string, newPassword: string }
// Validate currentPassword via bcrypt.compare against the stored hash
// Reject if invalid (avoids hijacked-session password takeover)
// bcrypt.hash newPassword, storage.updateUser({ passwordHash })
// Fire the same password-changed email block already in
// /api/auth/reset-password — extract to a helper or duplicate
```

**Why MEDIUM rather than HIGH**: a recovery path exists. Users
who want to change their password can do so via forgot-password
even if they remember the old one. The gap is convenience, not
capability.

_Logged 2026-05-04 during Item 5 of feat/cleanup-batch-1 when
auditing both password-change paths._

## LOW — Suspension email has no admin-supplied "reason" field

**Location**: `artifacts/api-server/src/routes/misc.routes.ts:623`
(single-suspend) and `:705` (bulk-suspend); the email helper at
`artifacts/api-server/src/lib/email.ts:163` (`sendSuspensionEmail`).

**Behavior today**: When an admin suspends a user via either
endpoint, the user receives a generic email saying "Your account
has been suspended... contact us if you believe this is a
mistake." The email body says nothing about WHY the suspension
happened. The user has to email support to find out, then wait
for a manual reply.

**Why this matters**: a user who was suspended for a clear cause
(e.g., posted abusive content, ToS violation, payment fraud)
should ideally see that reason in the email itself — both for
their own clarity and to reduce support back-and-forth. Without
it, every suspension generates an appeal email even when the
admin's reason was unambiguous.

**Why LOW**: the platform is pre-launch; suspension volume is
zero today. The current generic email is honest about the
situation; users can appeal via the SUPPORT_EMAIL contact and
get a reason that way. The gap is convenience and admin-time
efficiency, not user-rights compliance.

**Suggested implementation when prioritised**:

1. Backend — extend the request body shape:
```ts
const { suspended, reason } = z.object({
  suspended: z.boolean(),
  reason: z.string().max(500).optional(),
}).strict().parse(req.body);
```

2. Backend — pass reason to the helper:
```ts
sendSuspensionEmail(before.email, reason).catch(...)
```

3. Helper — interpolate with `escapeHtml()`:
```ts
export async function sendSuspensionEmail(toEmail: string, reason?: string) {
  const reasonHtml = reason
    ? `<p style="..."><strong>Reason:</strong> ${escapeHtml(reason)}</p>`
    : "";
  // ...
}
```

The `escapeHtml()` step is critical — without it, an admin could
craft an HTML-injection payload as the reason and weaponise the
suspension email pipeline. The helper file already has
`escapeHtml()` available; the inline comment in
`sendSuspensionEmail` flags this for the implementer.

4. Persistence — add a `reason` column to `admin_audit_logs.details`
JSON or a new `suspension_reason` column on the user row. Keeping
it on the audit log is cleaner since it's a per-action attribute,
not a per-user-state attribute.

5. Admin UI — add a textarea to the suspend modal in
`artifacts/plotzy/src/pages/admin.tsx` (single-suspend mutation
at line 245-251 and the bulk modal). Pass the reason through.

**Why deferred from Item 6 of feat/cleanup-batch-1**: Adding a
reason field requires API change + admin UI textarea + audit log
persistence. Defer until admin moderation gets dedicated product
attention.

_Logged 2026-05-04 during Item 6 of feat/cleanup-batch-1 after
deciding to ship the email pipeline first and the reason field
as a separate UX polish._

## LOW — Aria-label coverage gaps deferred from Item 7 (cleanup-batch-1)

Three areas were scoped out of the Item 7 sweep because verifying
each properly would expand the batch's footprint significantly:

### 1. `pages/audiobook-studio.tsx` — ~6 icon-only buttons need verification

The MiniPlayer toggle (line 271), export button context (line 779),
per-chapter expand chevrons (line 913), and a few others have
icon children that may or may not be paired with visible text in
the surrounding row layout. Verified: line 847 (chapter selection
CheckCircle/Circle toggle) and line 913 (expand ChevronUp/Down)
ARE icon-only and need aria-label. Better as a focused
audiobook-studio a11y pass than a guess-based addition mixed in
with the other Item 7 work.

### 2. Form `aria-describedby`

Auth modal password input passes `error={fieldErrors.password}`
into a shared `FieldInput` component. Adding `aria-describedby`
properly requires modifying FieldInput's id-generation and the
error-slot binding, which propagates to every field across the
app. Better as a single focused FieldInput refactor than a one-off
aria-describedby on the password input.

### 3. Read-book left/right page-tap regions are `<div onClick>` not buttons

Lines 477 and 502 of `pages/read-book.tsx` are `<div>` elements
with `onClick` and `title=` for previous/next page navigation.
They have title attributes for sighted-keyboard tooltip behavior
but cannot be focused with Tab and don't announce as buttons to
screen readers. Adding aria-label to a non-button div helps
little. Proper fix is conversion to `<button>` in Item 9 of this
batch (div-buttons → buttons), at which point aria-label can be
added as part of the conversion.

### 4. Full i18n translation of all aria-labels

The 34 labels added in Item 7 are English-only (with 9 reusing
the existing `ar ? "..." : "..."` ternary pattern in
chapter-editor for free Arabic coverage). Translating to all 14
UI languages would add roughly 25 new strings × 13 non-English
languages ≈ 325 entries. Defer until i18n batch is prioritized.

_Logged 2026-05-04 during Item 7 of feat/cleanup-batch-1 after
deciding to ship verifiable aria-labels first._

## LOW — Div-onClick conversions deferred from Item 9 (cleanup-batch-1)

Two clusters of div-as-button patterns were SKIPPED in Item 9
because converting them carries CSS or HTML5 risk that exceeds
the cleanup batch's scope:

### 1. LibraryBookshelf decorative spines (20 divs)

`components/LibraryBookshelf.tsx:25-50` has 20 visual book-spine
divs with heavy custom CSS classes (`.book.white.has-simple-text`,
`.book.maroon.decor-heavy`, `.book.book-pages`, etc.) that paint
the on-homepage shelf decoration. Each div has an onClick that
shows a preview overlay.

Converting to `<button>` requires CSS overrides on every `.book`
selector to neutralise default button styles (background, border,
font, color, padding). The companion stylesheet would need
`appearance: none; background: transparent; border: 0; padding: 0;
color: inherit; font: inherit;` reset rules per selector.

Better as a focused LibraryBookshelf a11y + CSS pass than a
mid-batch conversion.

### 2. cover-designer.tsx:840 layer row (1 div)

The cover-designer layer row is a div with an onClick (selects the
layer) but contains 4 nested `<button>` children (visibility, lock,
move-up, move-down) that were given aria-labels in Item 7. HTML5
forbids interactive elements nested inside `<button>`, so the row
cannot be converted to a `<button>` while keeping the children as
buttons.

Proper fix is one of:
- `role="button"` + `tabIndex={0}` + keyboard handler on the outer
  div (preserves the children unchanged)
- Refactor so the row's click target and the action buttons are
  siblings rather than parent/children

Both restructures are larger than Item 9's scope. Defer to a
focused cover-designer a11y pass.

### 3. Modal/dropdown backdrops (8 divs) — INTENTIONAL, no change planned

The following `<div>` elements have `onClick` but should NOT be
converted to buttons because they are full-screen close-on-outside
overlays. Converting them would create giant invisible tab-stops
that screen readers announce as buttons, which is worse UX than
the current state. Keyboard users close these via the Escape key
or the explicit close button inside the modal:

- `gutenberg-reader.tsx:882, 992, 1026` (page panel / TOC / settings)
- `research-board.tsx:72`, `book-customizer.tsx:298`,
  `ai-assistant.tsx:169`, `BookViewerOverlay.tsx:34`,
  `author-profile.tsx:811`

These are listed for completeness so a future contributor reading
this entry doesn't try to "fix" them.

_Logged 2026-05-04 during Item 9 of feat/cleanup-batch-1 after
choosing conservative scope to avoid CSS regressions._

---

## MEDIUM — SPA fallback returns HTTP 200 for unknown paths

**File**: `artifacts/api-server/src/static.ts:16`

The static-serving middleware sends `index.html` for every path that
doesn't match a real file:

```ts
app.use("/{*path}", (_req, res) => {
  res.sendFile(path.resolve(distPath, "index.html"));
});
```

This is the standard SPA pattern, but it has an SEO consequence:
crawlers receive `200 OK` for genuinely missing content. The frontend
React `<NotFound>` component renders a 404 message, but the HTTP
status is wrong. Search engines that cache by status code may index
the 404 body as legitimate content, and link-checkers can't
distinguish dead URLs from live ones.

**Fixing this requires server-side route knowledge.** Options:

1. **Allowlist of valid SPA routes** — middleware checks `req.path`
   against a route table copied from `App.tsx`; 404 if not in table.
   Brittle (must keep the list in sync with App.tsx).
2. **Probe the data layer** — for paths like `/read/:id`, hit the DB
   to verify the resource exists; 404 if not. Adds a DB roundtrip per
   crawler hit and only catches dynamic-resource 404s.
3. **Generate a 404.html during build** and `res.status(404).sendFile`
   on unknown paths. Loses client-side navigation benefit (full page
   reload to show the 404). Cleanest for SEO.

**Recommendation**: defer to a focused 404-handling batch. This is
out of scope for `feat/seo-meta-and-jsonld` because none of the
options is a one-line change and option 1's brittleness needs its
own design decision.

_Logged 2026-05-04 during Phase A audit of feat/seo-meta-and-jsonld._

---

## LOW — SEO: SPA limits social-preview crawlers to root OG tags

**Context**: Plotzy is a pure client-rendered SPA (no SSR). The static
[index.html](artifacts/plotzy/index.html) is served verbatim for every
route by [static.ts:16](artifacts/api-server/src/static.ts#L16).
After hydration, `react-helmet-async` updates the head with per-page
tags — but only crawlers that execute JavaScript see the updated
values.

**Who this affects**:
- ✓ Googlebot, Bingbot, DuckDuckBot — they execute JS, see per-page
  meta + JSON-LD correctly. Search ranking is unaffected.
- ✗ Twitter/X card-bot, Facebook/Instagram crawler, LinkedIn preview,
  Slack/Discord/iMessage unfurlers — they fetch raw HTML only. Every
  shared URL renders the root `og:image` ("/opengraph.jpg") and root
  title regardless of the actual page.

For Plotzy's pre-launch state with no measurable social traffic, this
is acceptable. For the medium term it costs:

- Sharing `/read/:id` (a published book) on Twitter/Facebook shows
  the generic site preview, not the book cover.
- Sharing `/authors/:userId` shows the site preview, not the author
  avatar.
- Article shares from `/blog/:id` lose the per-post hero image.

**Two future paths** (recommended in priority order):

### Path B — Build-time prerender for static public pages

Use `vite-react-ssg`, `vite-plugin-prerender-spa`, or a similar Vite
plugin to render the following routes to real HTML files at build:

- `/`, `/pricing`, `/faq`, `/privacy`, `/terms`, `/tutorial`,
  `/writing-guide`, `/marketplace`

Each gets its own static `index.html` with the correct title, meta,
and OG tags baked in. Fixes social previews for those eight pages.
Estimated effort: 3–4 hours including build-pipeline verification.
Dynamic routes still need Path C.

### Path C — Server-side dynamic OG injection for dynamic pages

Add an Express middleware that intercepts these dynamic routes:

- `/read/:id` (book cover OG)
- `/authors/:userId` (author avatar OG)
- `/blog/:id` (article hero OG)
- `/series/:id` (series first-book cover OG)

For each, fetch the relevant row, replace placeholder tokens in
index.html (e.g., `<!-- @@OG_TITLE@@ -->`), and send the rewritten
HTML. Fixes social previews everywhere. Estimated effort: 6–8 hours
including a small in-memory cache (5-minute TTL) so a viral share
doesn't hammer the DB.

**Recommendation**: revisit Path B after launch when there's evidence
of social-share traffic warranting the work. Path C only if a major
social channel becomes a primary acquisition surface.

_Logged 2026-05-04 during Phase A audit of feat/seo-meta-and-jsonld._

---

## LOW — OG image aspect ratio mismatch on book / author / article shares

**Files**: [pages/read-book.tsx](artifacts/plotzy/src/pages/read-book.tsx),
[pages/author-profile.tsx](artifacts/plotzy/src/pages/author-profile.tsx),
[pages/article-view.tsx](artifacts/plotzy/src/pages/article-view.tsx),
[pages/series-view.tsx](artifacts/plotzy/src/pages/series-view.tsx),
[pages/gutenberg-reader.tsx](artifacts/plotzy/src/pages/gutenberg-reader.tsx)

Stage 3 of `feat/seo-meta-and-jsonld` wires the user-supplied content
image into `og:image` / `twitter:image`:

- `/read/:id` → `book.coverImage` (book cover, typically 2:3 portrait)
- `/authors/:userId` → `profile.avatarUrl` (avatar, typically 1:1 square)
- `/blog/:id` → `article.featuredImage` (variable)
- `/series/:id` → `series.coverImage || books[0].coverImage` (2:3 portrait)
- `/discover/:id` → `meta.coverUrl` (Project Gutenberg, variable)

**The Open Graph standard expects 1.91:1 (1200×630)** for "summary
large image" cards. Twitter, Facebook, LinkedIn, Slack, Discord, and
iMessage all crop or letterbox anything that doesn't match. Book
covers in 2:3 portrait will appear letterboxed in horizontal cards;
square avatars get center-cropped. The shared preview is always
*something* — never broken — but it's not the polished, branded
landscape preview competitors ship.

**Why this is a low priority for now**: in the SPA-only architecture
(Path A from the earlier discovered-issues entry), social previews
already fall back to the root `/opengraph.jpg` for non-JS crawlers
regardless of what `<SEO ogImage>` is set to. The per-page ogImage
only takes effect for JS-executing crawlers (Googlebot — which doesn't
render social cards anyway). So the aspect-ratio mismatch only shows
up if the SPA architecture is later upgraded to Path B (build-time
prerender) or Path C (server-side OG injection). At that point this
becomes worth fixing.

**Future enhancement when the time comes**:

1. Build a dynamic OG image generator using `@vercel/og` (or
   `satori` directly) — composites the cover/avatar onto a 1200×630
   branded canvas with title and author overlay text.
2. Serve via a small `GET /api/og/book/:id`, `/api/og/author/:id`,
   etc. endpoint with a long-lived cache header.
3. Update `<SEO>` callers to point at the generated URL instead of
   the raw upload.

Estimated effort when triggered: ~1 day including a font license
review and a generated-image cache strategy. Defer until Plotzy has
measurable social-share traffic on book or author pages.

_Logged 2026-05-04 during Stage 3 of feat/seo-meta-and-jsonld._

---

## LOW — Organization JSON-LD has no contactPoint / sameAs / foundingDate

**File**: [artifacts/plotzy/src/lib/seo-schema.ts](artifacts/plotzy/src/lib/seo-schema.ts)

Stage 4 of `feat/seo-meta-and-jsonld` ships a minimal `Organization`
schema with name, url, logo, and description only. Three optional
schema.org fields are intentionally omitted at launch:

- **`contactPoint.email`** — would expose `faresadel@gmail.com` (or
  whatever `SUPPORT_EMAIL` resolves to) to spam scrapers that crawl
  JSON-LD blobs. Google rarely surfaces `contactPoint` in rich results,
  so the SEO benefit is negligible against the spam-bot risk.
- **`sameAs`** — list of official social-profile URLs. Plotzy doesn't
  yet have a managed social presence to point at, and pointing at a
  non-existent or inactive account makes the schema look stale.
- **`foundingDate`** — pre-launch; no canonical "founding" date to
  publish. Adding one later when the launch date is fixed.

**When to add each**:

1. `contactPoint` → after a dedicated support inbox (e.g. `support@plotzy.com`)
   exists. The spam exposure on a personal address isn't worth the
   marginal SEO value.
2. `sameAs` → after Plotzy has at least one active, branded social
   profile (Twitter, Instagram, LinkedIn) — list every active one as
   absolute URLs.
3. `foundingDate` → on the day of public launch, ISO 8601 format
   (e.g. `"2026-06-01"`).

All three are one-line additions to `buildOrganizationSchema()` when
ready.

_Logged 2026-05-04 during Stage 4 of feat/seo-meta-and-jsonld._

---

## LOW — FAQ accordion close animation is instant (forceMount trade-off)

**Files**: [components/ui/accordion.tsx](artifacts/plotzy/src/components/ui/accordion.tsx),
[pages/faq.tsx](artifacts/plotzy/src/pages/faq.tsx)

Stage 7 of `feat/seo-meta-and-jsonld` added an opt-in `forceMount`
prop to the shared `AccordionContent` and turned it on for every
item on `/faq`. This was required for the FAQPage JSON-LD to match
Google's "structured data must reflect visible content" rule —
without `forceMount`, Radix's `Presence` component unmounts closed
answer content from the DOM, and the schema would then reference text
that crawlers can't see.

**Side effect**: with `forceMount` on, Radix sets the `hidden` HTML
attribute on closed-state content. Browsers default `[hidden]` to
`display: none`, which suppresses the existing close-direction
animation (`data-[state=closed]:animate-accordion-up`). The result:

- **Open animation** — still smooth (state change `closed → open`
  removes `hidden` before the down animation runs)
- **Close animation** — instant collapse (the `hidden` attribute lands
  before the up animation can play)

Closing is the less-noticeable direction in practice and the
trade-off was deliberately accepted to ship the JSON-LD compliance
fix in a single commit. Other accordions in the app are unaffected
because `forceMount` defaults off.

**If user feedback indicates the instant close is jarring**, fork
the FAQ accordion to use a different hide mechanism that keeps both
animations smooth AND keeps content in the DOM. Two viable patterns:

1. Replace Radix's `[hidden]` with CSS `visibility: hidden;
   height: 0; overflow: hidden` controlled by `data-state`. Allows
   the close animation to play because the content is rendered, just
   collapsed.
2. Use a plain CSS-only details/summary element (no Radix). Native
   browser semantics, but loses Radix's keyboard-navigation and
   typed API.

Estimated effort if triggered: ~30 min for option 1.

_Logged 2026-05-04 during Stage 7 of feat/seo-meta-and-jsonld._

---

## LOW — Restore email contact in FAQ once a dedicated inbox is provisioned

**File**: [artifacts/plotzy/src/data/faq-data.ts](artifacts/plotzy/src/data/faq-data.ts)

The "How do I contact support?" answer was rewritten to drop the
literal `faresadel@gmail.com` from the FAQ body — that text now ships
inside the FAQPage JSON-LD on `/faq` and structured data is widely
indexed and scraped. The contact form on the Support page is the
documented path for now.

**Restore the email mention when** a brand-aligned support inbox
(e.g., `support@plotzy.<tld>`) exists. At that point:

1. Update the `contact-support` answer in `faq-data.ts` to re-include
   the inbox.
2. Sweep the rest of `faq-data.ts` for the four remaining mentions
   of `faresadel@gmail.com` (refunds, discounts, account deletion,
   change-email, browser-issues — five answers). Replace them all
   with the new inbox in one pass.
3. Consider also updating the Organization JSON-LD `contactPoint`
   per the earlier deferred entry.

The four remaining personal-email mentions in other FAQ answers
were intentionally left in this batch because (a) they're inside
longer-form answers that don't ship as cleanly via JSON-LD as
`contact-support`'s short tail entry, and (b) consolidating them is
a copy decision best made together with the new inbox rollout.

_Logged 2026-05-04 during Stage 7 follow-up of feat/seo-meta-and-jsonld._

---

## LOW — Migrate sitemap.xml to a dynamic endpoint when content scales

**File**: [artifacts/plotzy/public/sitemap.xml](artifacts/plotzy/public/sitemap.xml)

The sitemap is currently a static XML file maintained by hand.
Stage 10 of `feat/seo-meta-and-jsonld` adds `/faq` and `/blog` to it
but leaves the static-file approach in place. This is fine for v1
because Plotzy has fewer than ~100 published books at launch and
content updates are rare.

The static approach **will not scale**. Once any of the following is
true, migrate to a dynamic `GET /sitemap.xml` Express endpoint that
reads from the DB:

- Published books exceed ~500 (search engines may stop crawling a
  large stale sitemap)
- Weekly blog posts or new author profiles become routine
- Sitemap submission to Google Search Console / Bing Webmaster Tools
  shows stale indexing

**Implementation when needed**:

1. New route in api-server: `GET /sitemap.xml` that queries
   `pageViews` skip rules + selects `id, publishedAt` from
   `books WHERE isPublished = true`, plus distinct authors with
   any published book.
2. Render `<urlset>` to plain XML; set
   `Content-Type: application/xml`.
3. Cache the result for ~1 hour with `Cache-Control: public, max-age=3600`.

Estimated effort when triggered: ~1 hour.

_Logged 2026-05-04 during Phase A audit of feat/seo-meta-and-jsonld._

---

## Pricing Path A follow-ups (deferred from feat/pricing-honesty-rewrite)

This batch (commits 9f6f9d7, 61b1dd5, 23f2bf5, ab3ca93) re-based the
`/pricing` copy on the actual server-side gates in
`artifacts/api-server/src/lib/tier-limits.ts`. Many TierLimits flags
(`canExportPdf`, `canUseAudiobook`, `maxBooks`, etc.) are well-defined
but never read by any route handler — Free users currently access
all those features. The pricing copy now reflects this reality (Path B).

Path A is the engineering work that re-introduces real gates so Pro
and Premium re-acquire structural value beyond AI quotas. Each item
below has the audit's effort estimate, the file:line that needs
touching, and severity reflecting revenue impact + customer trust risk.

Reference: `pricing-truthfulness-audit.md`, `pricing-rewrite-plan.md`.

### HIGH — infrastructure investments

#### Item 11. Feature-flag system for "Early access" tier benefit

**Severity**: HIGH
**Effort**: ~16h
**Why HIGH**: requires building a new system (DB table, gating
middleware, admin UI for flag management), not just wiring up an
existing constant. Blocks the "Early access to new features" claim
that was removed from /pricing.

**Work**: introduce a `feature_flags` table (`flag_name`, `enabled_tiers`),
a small `requireFeatureFlag('foo')` middleware, and a frontend
`useFeatureFlag` hook. When ready, claim can return to /pricing.

#### Item 12. Support priority queue for "Priority support" tier benefit

**Severity**: HIGH
**Effort**: ~16h
**Why HIGH**: also requires net-new infrastructure. The `supportMessages`
table exists but has no priority/tier column, no admin triage UI, no
SLA timer.

**Work**: add `priority` column to `supportMessages` derived from
the submitter's tier at create time; build admin triage UI that sorts
by priority + age; document an SLA target (only after the queue
mechanics exist). Then re-add "Priority support" claim with a real
metric.

### MEDIUM — wire existing tier-limits.ts flags into route handlers

These are 1–3 hour additions per gate. The flag/constant exists in
`tier-limits.ts` already; the route handler just needs to read it.

#### Item 1. Wire `canExportPdf` on PDF download endpoint

**Severity**: MEDIUM
**Effort**: 1h
**File**: search `artifacts/api-server/src` for the PDF-export route.

**Work**: at top of handler, look up `getUserTier(user)` →
`getTierLimits(tier).canExportPdf`. Return 403 with code
`PDF_EXPORT_TIER_LOCKED` if false.

#### Item 2. Wire `canExportEpub` on EPUB download endpoint

**Severity**: MEDIUM
**Effort**: 1h
**File**: same as Item 1 (often the same endpoint with `format=epub`).

**Work**: parallel to Item 1 with `canExportEpub`.

#### Item 3. Wire `canUseAudiobook` on audiobook preview/export endpoints

**Severity**: MEDIUM
**Effort**: 1h
**File**: `artifacts/api-server/src/routes.ts` audiobook handlers
(synthesizeToMp3 callers around lines 2369/2403).

**Work**: gate on `getTierLimits(tier).canUseAudiobook`.

#### Item 4. Wire `maxAudiobookExportsPerMonth` for monthly export quotas

**Severity**: MEDIUM
**Effort**: 2h
**File**: same as Item 3 + new `audiobook_exports` counter table.

**Work**: add `audiobook_exports` table with `(user_id, created_at)`,
add `checkAudiobookLimit(userId, tier)` mirror of
`checkMarketplaceLimit`, gate before the synth call. Once shipped,
restore "X audiobook exports/month" claims to /pricing per tier.

#### Item 5. Per-tier book count enforcement

**Severity**: MEDIUM
**Effort**: 1h
**File**: `artifacts/api-server/src/routes/books.routes.ts` POST handler.

**Work**: read `getTierLimits(tier).maxBooks`; reject when count ≥
limit. Today no tier has a book count cap so all three tiers behave
identically here. Once shipped, "No book limits" on Pro can become a
relative uplift over a Free/Starter cap.

#### Item 6. Per-book chapter count enforcement (currently checks total)

**Severity**: MEDIUM
**Effort**: 1h
**File**: `artifacts/api-server/src/routes/chapters.routes.ts:48`.

**Work**: today the check uses `getUserChapterCount(userId)` (TOTAL
across all books) and only fires for non-active subscriptions. Extend
to use `getTierLimits(tier).maxChaptersPerBook` per-book and apply on
all tiers (so Pro's "no chapter limits" eventually means "limit is
high but real").

#### Item 7. Aggregate word count enforcement

**Severity**: MEDIUM
**Effort**: 3h
**File**: `chapters.routes.ts:101` (currently per-chapter check) +
new aggregator.

**Work**: add `getUserWordCount(userId)` that sums across all chapters,
gate against `getTierLimits(tier).maxWords` on chapter PUT. Higher
effort because the aggregator query needs an index for performance
on writers with many chapters.

#### Item 9. Wire `canUseAdvancedAI` on 4 analysis endpoints

**Severity**: MEDIUM
**Effort**: 1h
**File**: the 4 analysis endpoints in `routes.ts` (plot holes, pacing,
dialogue, voice consistency).

**Work**: gate each on `getTierLimits(tier).canUseAdvancedAI`. Once
done, the AI analysis tools line moves back to Pro feature list.

### LOW — small wiring fixes + cleanup

#### Item 8. `maxPublishedBooks` enforcement on Pro

**Severity**: LOW
**Effort**: 30m
**File**: publish/unpublish endpoint.

**Work**: today only Free has a published-book cap. Wire Pro to
`PRO_MAX_PUBLISHED_BOOKS` so a future "20 published books on Pro,
unlimited on Premium" claim is real.

#### Item 10. Spine AI cover generation

**Severity**: LOW
**Effort**: ~4h
**File**: cover-generator route + frontend
(`pages/cover-designer.tsx`) + `lib/shared/src/routes.ts:78`
(`z.enum(['front', 'back'])`).

**Work**: extend the cover-generation prompt + Zod enum to accept
`'spine'`; add a spine canvas to the cover designer UI. Once done,
`(front and back)` on /pricing can become `(front, back, and spine)`
and the spine claim is real.

#### Item 14. Delete `/api/marketplace/record` deprecated stub

**Severity**: LOW
**Source**: introduced in B1 of this batch (commit 9f6f9d7).
**File**: `artifacts/api-server/src/routes/misc.routes.ts:1247`.
**Calendar trigger**: 2026-05-19 (≈2 weeks after deploy of 9f6f9d7).

**Work**: by then no browser tab from the pre-fix deployment will
still be alive. Delete the stub route entirely + the comment block.
The frontend already stopped calling it in 9f6f9d7.

#### Item 15. Move mid-file import in `misc.routes.ts` to file top

**Severity**: LOW
**File**: `artifacts/api-server/src/routes/misc.routes.ts:1211`.

**Work**: the
`import { getUserTier, getTierLimits, checkMarketplaceLimit, getMarketplaceHistory }`
statement sits at line 1211, in the middle of the file rather than
at the top with the other imports. Pre-existing pattern (not
introduced by this batch — predates it). Quick cleanup when touching
this file next: hoist to the top alongside the other `import` lines.

#### Item 16. "✦ Most Popular" badge on Pro tier — verify before claim becomes data-supported

**Severity**: LOW
**File**: `artifacts/plotzy/src/pages/pricing.tsx:472-478`.

**Observation**: the badge text "✦ Most Popular" was retained
through the pricing rewrite, but Plotzy is pre-launch with no
subscription distribution data. The claim is the same category as
the items the audit removed — unverifiable marketing copy. Two
honest paths:

- (a) Remove the badge until launch metrics exist, then re-add when
  there is a defensible "X% of subscribers" backing it.
- (b) Reframe as "Recommended" or "Best balance of features and
  price" — softer, not tied to a popularity claim that can't be
  verified.

Neither is a launch blocker. Logging here so it gets revisited the
first time someone touches the pricing card styling.

_Item 13 (downgrade word-cap UX mismatch) was originally drafted for
this list but was promoted to in-batch implementation — see B5b
commit and chapters.routes.ts PUT handler's "downgrade grace" branch._

_Logged 2026-05-05 during B5 of feat/pricing-honesty-rewrite._

---

## Writing Course follow-ups (deferred from feat/course-batch-1-schema)

This batch added the 8-table schema for the free Writing Course. The
items below are deliberate scope cuts logged so they don't get lost.

### LOW — Migrate from drizzle-kit push to versioned migrations once schema stabilizes post-launch

**File**: [lib/db/](lib/db/), [lib/db/drizzle.config.ts](lib/db/drizzle.config.ts)

The project uses `drizzle-kit push` to apply schema changes (no
`migrations/` directory, no versioned `.sql` files on disk, no
`down()` definitions). For the GDPR Stage 1 work and now this
course batch, we hand-write a `*-migration.sql` artifact for review
in the absence of generated migrations.

This is fine while the schema is changing rapidly pre-launch — push
is faster and the artifact gives us human-readable review. After
launch, when schema changes become rare and require careful rollouts,
migrate to `drizzle-kit generate` + `migrate` so we get:

- Version-controlled migration history on disk
- Reversible migrations (`down()` blocks)
- CI-checkable schema state ("is master's schema applied to staging?")

**Estimated effort when triggered**: ~2 hours
- Generate baseline migration from current production schema
- Add `out: "./migrations"` to `drizzle.config.ts`
- Update `lib/db/package.json` scripts: replace `push` with
  `generate` + `migrate`, document the new flow in the README
- Run `drizzle-kit generate` once to establish the baseline file

Don't migrate during active feature development — pre-launch volatility
makes the extra ceremony costly.

_Logged 2026-05-05 during Phase A audit of feat/course-batch-1-schema._

### LOW — Course quiz pool-based randomization (defer until cheating signals appear)

**File**: [lib/db/src/schema/index.ts](lib/db/src/schema/index.ts)
(`courseQuizzes` and `courseQuizQuestions`)

Module quizzes are 5 fixed questions; the final exam is 40 fixed
questions. A user retaking a quiz sees the same questions in the
same order. This is fine for a free trust-based course but may
encourage memorization-as-strategy (especially the final exam).

**When to trigger**: post-launch, if we see signals like:
- Final-exam pass rates >> retention on the actual lesson material
- Users reporting they "Googled the answers"
- Repeat takers achieving 100% on attempt 2 after failing attempt 1

**Schema change when triggered**:
- Add `pool_size INTEGER` nullable column to `course_quizzes`
- When `pool_size > question_count`, server picks `question_count`
  random questions per attempt
- Author 60 final-exam questions instead of 40 (and pull 40); 10
  per module quiz (and pull 5)

**Estimated effort**: ~3h schema + UI + selection logic, plus the
content authoring (additional 50 questions across the course).

_Logged 2026-05-05 during Phase A audit of feat/course-batch-1-schema._

### LOW — Course restart functionality (defer until user requests indicate need)

**File**: [lib/db/src/schema/index.ts](lib/db/src/schema/index.ts)
(`courseProgress`, `courseQuizAttempts`)

v1 ships without a "restart course" button. Users who want to
re-engage can re-watch lessons (the UI shows them as completed but
remains accessible) and retake quizzes (multiple attempts already
supported).

**When to trigger**: a user explicitly asks to "reset their progress
to 0%" — e.g., a writer who wants to retake the course a year
later for a refresher and prefers the visual clean slate.

**Implementation when needed**:
- New endpoint `POST /api/course/restart` that hard-deletes the
  user's `course_progress` and `course_quiz_attempts` rows
- **Never** delete `course_certificates` — once earned, retained
- Frontend confirmation modal ("This will reset your progress
  display. Lessons remain accessible. You'll keep your certificate.")

**Estimated effort**: ~30 min.

_Logged 2026-05-05 during Phase A audit of feat/course-batch-1-schema._

### LOW — Batch 1.3 (frontend): final-project submission needs CTA for users without an existing book

**File**: future course frontend (Batch 1.3)
**Schema reference**: [lib/db/src/schema/index.ts](lib/db/src/schema/index.ts) `courseFinalProjects.bookId notNull`

The final-project submission requires `bookId notNull` — a user who
reaches Module 6 without having created a book in their Plotzy
library cannot submit a final project. The schema deliberately
enforces this.

**Required UX in Batch 1.3**:
- Submission form detects "user has 0 books" state
- Shows a CTA: "Create your first book to submit it as your final
  project" with a button that opens the existing book-creation flow
- After book creation, returns to the submission form pre-selected
  on the new book

Alternative (simpler): on submission attempt, auto-create a
placeholder book named "<DisplayName>'s Course Project" and let the
user populate chapters later. More frictionless but produces an
empty book in their library.

**Estimated effort**: ~1h either way. Logging now so Batch 1.3 doesn't
discover this mid-implementation.

_Logged 2026-05-05 during Phase A audit of feat/course-batch-1-schema._

### LOW — Duplicate `openai` client instances at routes.ts:57 and helpers.ts:14

**File**: `artifacts/api-server/src/routes.ts:57` and `artifacts/api-server/src/routes/helpers.ts:14`.

**Observation**: two `new OpenAI({...})` instances exist with byte-for-byte identical config (same env vars, same SDK options). Pre-existing duplication; not introduced by this batch. The new `lib/ai-analysis.ts` (Commit 1 of feat/course-batch-1-2-api) imports the canonical instance from `routes/helpers.ts`, so going forward the canonical path is the helpers one.

**Work**: delete the routes.ts:57 instance + the local `AI_TEXT_MODEL` constant. Update the remaining `routes.ts` AI handlers (the ones not yet refactored to use shared helpers) to import from `routes/helpers.ts`.

**Risk**: low — both instances are configured identically, so the swap is a no-op behaviorally. Catch is making sure no AI handler is depending on a route-local override.

**Estimated effort**: ~30 min including grep audit + smoke test of every AI route.

_Logged 2026-05-05 during Commit 1 review of feat/course-batch-1-2-api._

### MEDIUM — `tierAiLimiter` should accept an optional `cost` parameter

**File**: `artifacts/api-server/src/middleware/rate-limit.ts:92`.

**Observation**: the existing `tierAiLimiter` middleware charges exactly 1 daily-AI hit per request. For endpoints that consume multiple LLM calls in a single request (today: only `/api/course/final-project/feedback`, which runs 4 analyses), this forces a choice between (a) duplicating cost-aware logic inline, or (b) under-charging the user's budget. Approach (a) was taken in Commit 3 of feat/course-batch-1-2-api.

**Work**: refactor `tierAiLimiter` from an Express middleware function into a factory: `tierAiLimiter({ cost?: number = 1 })`. The factory closes over `cost`, runs `checkAiLimit` with `(used + cost) <= limit` as the gate, and calls `incrementAiUsage` `cost` times on success. Update all 14 existing callsites to use the factory form (most pass nothing, getting the default `cost: 1`); update `/final-project/feedback` to use `cost: 4` and remove the inline cost-aware block.

**Risk**: medium — touches a shared middleware that gates 14+ AI endpoints. Each callsite needs regression smoke-testing. The inline path in `course.routes.ts` becomes deletable, simplifying the orchestration handler.

**Estimated effort**: ~2h. Affects 14 existing endpoints; requires regression testing of each AI feature.

_Logged 2026-05-05 during DP2 of feat/course-batch-1-2-api._

### LOW — Bulk `getAllUserQuizAttempts` if dashboard latency emerges

**File**: `artifacts/api-server/src/storage.ts` + `artifacts/api-server/src/routes/course.routes.ts` (`GET /api/course/progress`).

**Observation**: the course dashboard rollup currently calls `storage.getQuizAttempts(userId, quizId)` once per quiz via `Promise.all` — typically 7 parallel queries (6 module quizzes + 1 final). For v1 with ~7 quizzes this is fine, but if the course expands or many users hit the dashboard simultaneously, query volume grows linearly with quiz count.

**Work**: add `getAllUserQuizAttempts(userId): Promise<CourseQuizAttempt[]>` to `IStorage` that pulls every attempt across every quiz in one query. Update the dashboard handler to use it and group in JS by `quizId`.

**Trigger**: profile shows DB time on `/api/course/progress` becomes load-bearing OR course expands beyond ~10 quizzes.

**Estimated effort**: ~30 min.

_Logged 2026-05-05 during DP3 of feat/course-batch-1-2-api._

### MEDIUM — Certificate PDF lazy-generation on first download

**File**: future `artifacts/api-server/src/routes/course.routes.ts` (new endpoint) + likely a new `lib/pdf-generator.ts` helper.

**Observation**: the cert schema has a nullable `pdf_url` column and the public verification page works as a web view. PDF generation was deferred from Batch 1.2 (D3) to keep that batch focused on the API surface. Without a PDF, users can share the verification URL but can't download a printable cert.

**Work**: add `GET /api/certificates/:uuid/pdf` (path already in Phase A spec). On first hit: generate the PDF (pdfkit or render-then-print HTML), upload to whatever blob storage the app uses for book exports, then `setCertificatePdfUrl(uuid, url)` and serve. Subsequent hits redirect to the persisted URL. Also add the missing `setCertificatePdfUrl(uuid, pdfUrl)` storage method (intentionally deferred from Commit 2 of feat/course-batch-1-2-api).

**Decisions needed before starting**:
- pdfkit (programmatic, more control) vs HTML-to-PDF (easier templating, requires Chromium)?
- Where to store: same blob path as book exports? Or a dedicated certificates/ prefix?
- Cert template/layout — needs design input (logo, layout, fonts).

**Estimated effort**: ~1 day including template design.

_Logged 2026-05-05 during D3 deferral of feat/course-batch-1-2-api._

### LOW — `routes/index.ts` is currently unused

**File**: `artifacts/api-server/src/routes/index.ts`.

**Observation**: the file aggregates every router (`booksRouter`, `coursesRouter`, etc.) but `grep` for any importer returns no matches — the active wire-up is in `routes.ts`'s `registerRoutes` function. We've kept it in sync with each new router (including `courseRouter` in Commit 4 of feat/course-batch-1-2-api) to avoid setting a trap for any future developer who resurrects it.

**Work**: pick one of:
- (a) Delete `routes/index.ts` entirely. Saves cognitive load; if a future contributor wants to consolidate wire-up they can build it fresh.
- (b) Migrate `routes.ts`'s `registerRoutes` to call `app.use(routes/index.default)` and pull EVERY route registration from there. Significant refactor but reduces routes.ts from a 2400-line god-file.

**Trigger**: post-Batch-1.3 cleanup pass, or when routes.ts becomes painful to navigate.

**Estimated effort**: (a) 5 min. (b) ~3h with regression risk.

_Logged 2026-05-05 during Commit 4 review of feat/course-batch-1-2-api._

### MEDIUM — Mobile blocker affects course + certificate share URLs

**File**: `artifacts/plotzy/src/components/MobileBlocker.tsx` and its mount in `artifacts/plotzy/src/App.tsx:296`.

**Observation**: per DP1/A3 of feat/course-batch-1-3-frontend, the existing site-wide MobileBlocker (blocks viewports `< 700px`) was kept in place — no per-route bypass. This means when a user shares a `/certificates/:uuid` URL on LinkedIn/Twitter (mobile-heavy audience), recipients on phones see the "open on iPad or laptop" message instead of the verified certificate. Same impact on `/learn/lesson/<slug>` shares for SEO link clicks from mobile.

**Resolution path**: lift MobileBlocker site-wide in the dedicated Mobile Strategy batch (Option A "full mobile" per Faris's pre-batch directive). Course components were written mobile-first using Tailwind's `sm:` breakpoints + logical properties (`me-*` / `text-start`) so they should render correctly when the blocker is removed; full pass-by-pass mobile QA still needed across the rest of the app first.

**Risk while pending**: temporary friction for shared course URLs from mobile. Mitigation considered but rejected: per-route bypass would create inconsistent mobile UX (course works, rest doesn't) — worse than uniformly deferred mobile.

_Logged 2026-05-05 during DP1/A3 of feat/course-batch-1-3-frontend._

### LOW — Markdown component has no syntax highlighter

**File**: `artifacts/plotzy/src/components/course/Markdown.tsx`.

**Observation**: the component emits `class="language-{lang}"` on `<code>` inside `<pre>` blocks but no syntax highlighter (Prism, Shiki, etc.) is wired. Course content for v1 — Modules 1-6 cover storytelling theory, not technical material — does not require highlighted code samples, so this is acceptable through pre-launch.

**Resolution**: install Shiki (or Prism) and call it from a `useEffect` in `Markdown.tsx` if Batch 2 lesson authoring discovers a need (e.g., a writing exercise involving code-formatted snippets). ~1h with theme integration.

_Logged 2026-05-05 during Clarification B of Commit 1 review._

### LOW — Course chrome translations are English-only outside of `navCourse`

**File**: `artifacts/plotzy/src/lib/i18n.ts`.

**Observation**: feat/course-batch-1-3-frontend added ~75 English course-chrome i18n keys (`courseLanding*`, `courseQuiz*`, `courseFeedback*`, `courseCert*`, `courseElig*`, etc.). Only `navCourse` has translations for all 14 languages; every other key falls back to English via the `getT` resolver. For non-English UI users this means the course pages mix their native language (existing app chrome) with English (course chrome).

**Resolution**: a pure-translation pass that adds 13 × ~75 = ~975 entries. Trivial mechanically (a translator pass), but easy to defer because the fallback works. Recommend grouping with the per-language polish that the user has previously deferred ("translation polish batch").

**Estimated effort**: ~3-4h with a competent translator pass; longer if every translation is hand-reviewed.

_Logged 2026-05-05 during Commit 7 of feat/course-batch-1-3-frontend._

### LOW — Legacy "Save the Cat" reference in writing-guide.tsx

**File**: `artifacts/plotzy/src/pages/writing-guide.tsx:142`.

**Observation**: the legacy writing-guide page (predates the writing course) names "Save the Cat! Beat Sheet" in a list of plotting frameworks. Module 2 (Batch 2.2) introduced a brand-name rule for *course content* — the lesson on beat sheets teaches the concept generically rather than under that specific 2005 trademark. The writing-guide reference predates that rule and is not infringement-tier (brief educational mention), but is inconsistent with the course voice rules that now apply to similar territory.

**Resolution**: during a future content polish pass on `writing-guide.tsx`, reword the entry to a generic phrasing (e.g. "Beat sheet plotting" or "Granular beat plotting"). Not urgent — the page is read by a different audience than the course pages, and the brand-name rule was scoped to course content for a reason.

**Estimated effort**: ~5 min (single line edit) when the writing-guide page is next opened for revisions.

_Logged 2026-05-05 during Phase A of feat/course-batch-2-2-module-architecture._



