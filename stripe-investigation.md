# Stripe Investigation Report

**Date**: 2026-05-04
**Investigator**: Claude Code (Opus 4.7, 1M context)
**Scope**: Read-only investigation. Does Plotzy actively use Stripe, or is it dead code?
**Verdict**: **Recommendation A — SAFE TO REMOVE** (with high confidence)

---

## Executive Summary

Stripe is dead code. The integration was added early in the project's history (one of the very first commits) but never wired into the customer-facing flow that the team actually built around. Every signal points the same direction: there is no UI path that reaches Stripe endpoints, the production environment has no Stripe credentials configured, the entire frontend hook that would have driven Stripe checkout is defined but never imported, the legacy plan shape it expects (`"monthly" | "yearly"`) predates the current Pro/Premium tier system, and twelve months of recent commits to the relevant files are all PayPal-focused with no Stripe touches beyond mechanical typecheck cleanup. The `.env.example` itself documents Stripe as "optional, alternative to PayPal" — and the actual `.env` does not set the Stripe keys, which means the Stripe SDK would throw `"Stripe credentials not found"` at boot if any code path actually reached it.

The risk of removal is low. The only ambiguity is whether any historical user has Stripe IDs in the database, which can be verified with a single SELECT query before dropping columns. The cleanest removal path keeps the schema columns untouched (orphans the data, preserves any stragglers) and drops only the code, which is a 4-6 hour task.

---

## Q1: Frontend Reachability

**Per-endpoint findings:**

| Endpoint | Reachable from UI? | Evidence |
|---|---|---|
| `POST /api/payments/create-intent` | **NO** | The shared API contract at [shared/routes.ts:124](artifacts/plotzy/src/shared/routes.ts#L124) defines `api.payments.createIntent.path` but searching the entire `artifacts/plotzy/src` tree for callers returns zero matches. Only the BACKEND consumes this contract (at [payments.routes.ts:37](artifacts/api-server/src/routes/payments.routes.ts#L37) — the route definition itself). |
| `POST /api/payments/confirm` | **NO** | Same as above — defined at [shared/routes.ts:125](artifacts/plotzy/src/shared/routes.ts#L125), referenced only by [payments.routes.ts:83](artifacts/api-server/src/routes/payments.routes.ts#L83) (its own backend route definition). No frontend caller. |
| `POST /api/subscription/create-checkout` | **NO** (dead caller) | Called by `createCheckoutSession()` in [hooks/use-subscription.ts:43-52](artifacts/plotzy/src/hooks/use-subscription.ts#L43). **`createCheckoutSession` is exported but never imported anywhere in the codebase.** Full grep across `artifacts/plotzy/src` found only the definition line. |
| `POST /api/subscription/portal` | **NO** | No frontend `fetch` calls or hook references found anywhere in `artifacts/plotzy/src`. The Stripe billing portal endpoint exists at [payments.routes.ts:282](artifacts/api-server/src/routes/payments.routes.ts#L282) with no caller. |
| `POST /api/stripe/webhook` | **N/A — server-to-server** | Webhook receiver at [app.ts:171](artifacts/api-server/src/app.ts#L171). Called externally by Stripe servers, not by Plotzy frontend. The handler in [webhook-handlers.ts](artifacts/api-server/src/webhook-handlers.ts) processes `customer.subscription.*` events — but if no checkout creates a Stripe subscription, no events arrive. |

**Bonus dead-code finding**: The entire `useSubscription` hook in `use-subscription.ts:15-41` (separate from the dead `createCheckoutSession` function at the bottom of the same file) is **also unimported anywhere in the codebase**. Grep for `from.*hooks/use-subscription` returns zero matches. The hook would call `/api/subscription/status` (which exists at [payments.routes.ts:146](artifacts/api-server/src/routes/payments.routes.ts#L146)) but no component consumes it. The live subscription state in the frontend comes through `useAuth().user.subscriptionStatus`, not this hook.

**Type signature is wrong for the current product**: `createCheckoutSession(plan: "monthly" | "yearly")` uses the legacy two-plan model. The current product has four plans (`pro_monthly`, `pro_yearly`, `premium_monthly`, `premium_yearly`) per [lib/checkout-plans.ts](artifacts/plotzy/src/lib/checkout-plans.ts). Even if some forgotten button somewhere did call this function, it would silently fail by sending an unrecognized plan code.

**Confirmed dead-from-frontend list**: All 4 customer-facing Stripe endpoints have no UI reachability path. The webhook is server-to-server and depends on the customer-facing flows producing subscriptions, so it is functionally dead too.

---

## Q2: Database Data

I cannot run direct SQL against the production database from this environment. Here is what I can verify from code/schema:

**Stripe columns defined in schema:**
- `users.stripeCustomerId` — [schema-types.ts:25](lib/shared/src/schema-types.ts#L25)
- `users.stripeSubscriptionId` — [schema-types.ts:26](lib/shared/src/schema-types.ts#L26)
- `transactions.stripePaymentIntentId` — [schema-types.ts:99](lib/shared/src/schema-types.ts#L99)

**Backend code that WRITES to these columns:**
Only inside the dead Stripe handlers at [payments.routes.ts:264-265](artifacts/api-server/src/routes/payments.routes.ts#L264) (`stripeCustomerId` + `stripeSubscriptionId` set during `/api/subscription/confirm-checkout`) and [payments.routes.ts:72](artifacts/api-server/src/routes/payments.routes.ts#L72) (`stripePaymentIntentId` set during `/api/payments/create-intent`). All three writers are inside endpoints that have no frontend reachability.

**Backend code that READS these columns:**
- [storage.ts:368-417](artifacts/api-server/src/storage.ts#L368) — `getTransaction()` and `getUserByStripeCustomerId()` query helpers. The only callers of these helpers are the dead Stripe endpoints in `payments.routes.ts` and the webhook handler.
- [social.routes.ts:170](artifacts/api-server/src/routes/social.routes.ts#L170) — defensive strip of `stripeCustomerId` and `stripeSubscriptionId` from public user payload. This is a write-time exclusion (preventing leak), not a read of populated data.
- [auth.ts](artifacts/api-server/src/auth.ts) — type-level reference only, no actual read.

**Conclusion**: The columns can only be populated via the dead Stripe endpoints. Since those endpoints are unreachable from the frontend and the production environment has no Stripe credentials configured (see Q3 evidence below), the columns are extremely likely to be empty in production. To verify before dropping the schema columns, a one-shot query is sufficient:
```sql
SELECT
  COUNT(*) FILTER (WHERE stripe_customer_id IS NOT NULL) AS users_with_stripe_customer,
  COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL) AS users_with_stripe_sub
FROM users;
SELECT COUNT(*) FILTER (WHERE stripe_payment_intent_id IS NOT NULL) AS txns_with_stripe FROM transactions;
```
Expected: all three return 0.

**Migrations / seeds folder**: No migrations folder exists. Plotzy uses `drizzle-kit push` directly against `DATABASE_URL` per [README.md:88](README.md#L88) ("there's no migrations folder yet"). No seed file populates Stripe data.

---

## Q3: Git History

**`stripe-client.ts`** — the Stripe SDK initialization file:
- **First commit**: `1b7a0a0` "Add authentication and Stripe integration to the API server" — this is the introductory commit, very early in the project history.
- **Last commit**: `fdc2308` "fix(types): resolve all 68 typecheck errors blocking CI" — purely mechanical (added explicit return types, removed `as any` casts, fixed rate-limit keyGenerator). **Zero feature changes since the original add.**
- The file's logic has not been touched in any meaningful way since it was first added.

**`webhook-handlers.ts`** — the Stripe webhook handler:
- **First commit**: `1b7a0a0` (same initial commit as above).
- **Last commit**: `6769d06` "hardening: Sentry redacts sensitive keys + Stripe webhook event whitelist (audit M-2, M-3)" — security hardening (event whitelist + log redaction). No feature evolution.

**`payments.routes.ts`** — the file containing both Stripe and PayPal routes:
- The last twelve commits touching this file are **all PayPal-focused**: `feat/cancel-subscription`, `feat/payment-history`, `fix/payment-amount-verification`, `feat/checkout-redesign`, etc. (See git log output in the investigation transcript.)
- **No commits in the last twelve have evolved Stripe logic.** Stripe code in this file is frozen at its early-2026 form, while PayPal logic has been actively rewritten and hardened across nine of the eleven session merges.

**Stripe revert attempts**:
- Searched git log with `--grep="revert|remove.stripe|deprecate.stripe|migrate.from.stripe"` — three "revert" commits found, all unrelated to Stripe (ContainerScroll dimensions, hero scroll, PayPal button restoration).
- **No reverted Stripe-removal attempt.** Stripe code has been a stable presence; there's no signal of a botched migration off it.

**Pattern interpretation**: Stripe was the original payment integration. The team subsequently migrated to PayPal (probably for its non-PayPal-account credit-card flow, which Stripe also offers but requires merchant-of-record setup). The Stripe code was never deleted in the migration. It has sat as inert infrastructure for the duration of the recent active development period (the past two days of session work, but the broader pattern likely extends much further back).

**Environment variable evidence**:
- `.env.example` line 67 (approximate): `# Stripe (optional, alternative to PayPal)` — followed by `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`. The "optional, alternative" language is explicit.
- Actual `.env` file: **no `STRIPE_` keys set** (grep returned empty after the heading). Stripe SDK initialization at [stripe-client.ts:17](artifacts/api-server/src/stripe-client.ts#L17) throws `"Stripe credentials not found"` when the keys are absent. So in the current production environment, every Stripe code path would fail-closed at the first SDK call.

---

## Recommendation

### **A) SAFE TO REMOVE**

All three pillars of dead-code evidence are present:
1. **No frontend reachability.** Zero UI path leads to a Stripe endpoint. The one frontend function that does is dead-imported and references the legacy plan model, so it would fail even if called.
2. **No database data populating from any active code path.** The only code that writes to Stripe columns is gated behind unreachable endpoints. (Awaiting one-shot SELECT to confirm columns are actually empty before dropping schema.)
3. **No active development.** Last meaningful Stripe touch was the initial add (~early 2026). Subsequent touches are mechanical typecheck/security cleanup. Twelve of twelve recent commits to the shared file are PayPal-only.

The `.env.example` itself describes Stripe as "optional, alternative to PayPal" — the team's own framing is that PayPal is primary.

---

## Removal Risk Assessment

### Files to modify or delete

| Action | File | Lines | Notes |
|---|---|---|---|
| **DELETE** | [artifacts/api-server/src/stripe-client.ts](artifacts/api-server/src/stripe-client.ts) | ~90 | SDK init |
| **DELETE** | [artifacts/api-server/src/webhook-handlers.ts](artifacts/api-server/src/webhook-handlers.ts) | full | Stripe-only webhook receiver |
| **DELETE** | [artifacts/plotzy/src/hooks/use-subscription.ts](artifacts/plotzy/src/hooks/use-subscription.ts) | full | Whole file is dead (both `useSubscription` and `createCheckoutSession`) |
| **MODIFY** | [artifacts/api-server/src/routes/payments.routes.ts](artifacts/api-server/src/routes/payments.routes.ts) | ~270 lines of Stripe routes (out of ~750 total) | Remove the 6 Stripe endpoints + the `import { getUncachableStripeClient, getStripePublishableKey } from "../stripe-client"` line. PayPal endpoints stay. |
| **MODIFY** | [artifacts/api-server/src/app.ts](artifacts/api-server/src/app.ts) | 2 references | Lines 60 (webhook URL) and 171 (route mount) |
| **MODIFY** | [artifacts/api-server/src/storage.ts](artifacts/api-server/src/storage.ts) | 4 methods (~50 lines) | Remove `getTransaction()`, `markTransactionSucceededIfPending()`, `getUserByStripeCustomerId()`, plus their interface declarations |
| **MODIFY** | [artifacts/api-server/src/routes/social.routes.ts](artifacts/api-server/src/routes/social.routes.ts) | 1 line | Drop `stripeCustomerId` and `stripeSubscriptionId` from the destructure-strip (they don't exist after column removal) |
| **MODIFY** | [lib/shared/src/routes.ts](lib/shared/src/routes.ts) | 2 lines | Remove `api.payments.createIntent` and `api.payments.confirm` contracts |
| **MODIFY** | [artifacts/plotzy/src/shared/schema.ts](artifacts/plotzy/src/shared/schema.ts) | 3 lines | Remove `stripeCustomerId`, `stripeSubscriptionId`, `stripePaymentIntentId` from the frontend type interfaces |
| **MODIFY** | [lib/shared/src/schema-types.ts](lib/shared/src/schema-types.ts) | 3 lines | Remove the same 3 column declarations |
| **MODIFY** | [lib/db/src/schema/index.ts](lib/db/src/schema/index.ts) | 3 lines | Remove the same 3 columns from the canonical schema (after verifying empty) |
| **MODIFY** | [.env.example](.env.example) | 4 lines | Remove the Stripe section heading + 3 keys |
| **DROP** | `users.stripe_customer_id` column | DB migration | After SELECT confirms empty |
| **DROP** | `users.stripe_subscription_id` column | DB migration | After SELECT confirms empty |
| **DROP** | `transactions.stripe_payment_intent_id` column | DB migration | After SELECT confirms empty |
| **REMOVE** | `transactions` table | DB migration | If table is exclusively for Stripe payments and has no data; verify first |
| **UNINSTALL** | `stripe` npm package | package.json | From `artifacts/api-server/package.json` |
| **UNINSTALL** | `stripe-replit-sync` npm package | package.json | From `artifacts/api-server/package.json` |

**Totals**: 3 file deletions, 9 file modifications, 1 frontend hook file deletion, 3 column drops (plus possibly the entire `transactions` table), 2 npm package removals.

### DB migration needed

**Yes**, but after a one-shot SELECT verification first. The migration drops three columns and possibly the `transactions` table. Drizzle's `pnpm --filter @workspace/db push` workflow handles this; the schema diff will be auto-generated.

### Webhook URL to deactivate in Stripe dashboard

**Conditionally yes**. If a Stripe project exists for Plotzy with a configured webhook endpoint pointing at `/api/stripe/webhook`, the webhook should be disabled in the Stripe dashboard so Stripe stops attempting deliveries. If no Stripe project was ever created (the `.env` having no keys is consistent with this), there's nothing to deactivate.

**Verification step**: Faris can check at https://dashboard.stripe.com/webhooks. If the dashboard has no webhooks pointing at any Plotzy domain, no action needed.

### Estimated effort to remove cleanly

**4-6 hours** broken down:
- ~30 min: Run the empty-columns SELECT, confirm zero data
- ~30 min: Plan the commit ordering (frontend deletes → backend deletes → schema → migration → npm uninstalls). Each step kept compileable.
- ~2 hours: Make the code changes in commit-sized chunks, with typecheck after each
- ~1 hour: Test that PayPal flow still works end-to-end (create-intent / confirm path used `transactions` table — verify the live PayPal path doesn't reference `transactions` accidentally)
- ~1 hour: Schema migration via `drizzle-kit push` against a Neon dev branch first, then production
- ~30 min: Deactivate Stripe webhook in dashboard, remove env var from production environment, commit, merge, push

**Recommended commit ordering** to keep the tree compileable at every step:
1. Frontend dead-hook deletion (`use-subscription.ts`)
2. Backend dead-route removal (the 4 Stripe endpoints in `payments.routes.ts`)
3. Backend webhook-handler deletion (`webhook-handlers.ts` + the `app.ts:171` mount)
4. Storage methods removal (the 4 dead methods in `storage.ts`)
5. SDK file deletion (`stripe-client.ts`)
6. Shared types pruning (`shared/routes.ts`, `lib/shared/src/schema-types.ts`, `artifacts/plotzy/src/shared/schema.ts`)
7. After empty-column verification: schema column drops in `lib/db/src/schema/index.ts` + push
8. `.env.example` cleanup
9. npm uninstalls (`stripe`, `stripe-replit-sync`)

Each step typechecks before proceeding to the next.

---

## What this means for the original cleanup batch

The pre-launch audit's **C-1 finding ("Stripe falsely listed in legal docs")** was inverted. The legal documents are correct *as-the-code-currently-stands*. They become incorrect *only after Stripe is removed*. So the proper sequencing is:

1. First: this Stripe-removal task (separate batch, est 4-6 hours)
2. Then: update Privacy Policy + Terms of Service to remove Stripe references (5 minutes — this becomes accurate at that point)
3. Then: the rest of the cleanup batch

Inverting that order — editing the legal docs first while Stripe is still live — would replace one false claim ("Stripe is a processor", which is true) with a worse false claim ("Stripe is not a processor", which would be false until the removal lands).

Equally, the **`/faq` answer** at `faq-data.ts:181-187` and `faq-data.ts:223` ("Plotzy uses PayPal as its payment processor") **becomes accurate after removal**. Today it's a singular claim that omits the second integration.

---

## Decision required from Faris

1. **Proceed with Stripe removal as a separate batch?** Recommendation: yes. ~4-6 hours, low risk, unblocks the legal-doc cleanup correctly.
2. **Pause the current `feat/cleanup-batch-1` branch?** The branch currently has only the (untracked) audit files and no commits. Either keep it open and tackle Stripe removal first, then resume cleanup, or delete the branch and start fresh after Stripe is gone. My recommendation: pause cleanup-batch-1, ship Stripe removal as `feat/remove-stripe`, then resume cleanup.
3. **Run the one-shot DB query first** to confirm Stripe columns are empty before dropping schema. This is a 30-second prerequisite to the migration step.

_End of investigation. No code modified. Working tree unchanged from start of investigation._
