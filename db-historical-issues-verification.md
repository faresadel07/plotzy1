# Historical Database Issues — Pre-Launch Verification

**Date:** 2026-05-07
**Scope:** Verify 4 historical DB issues from prior sessions are resolved before launch.
**Method:** Read-only audit (schema introspection, code grep, source file review). No code changes applied — fixes proposed where issues remain.

---

## Issue 1 — Schema-vs-DB drift detection

### Method
- Listed all 48 user tables in production via `information_schema.tables`.
- Listed all 45 `pgTable("…")` declarations in `lib/db/src/schema/index.ts` via grep (regex covers both quote styles).
- Cross-referenced.

### Findings — **3 tables in DB are NOT declared in Drizzle**

| DB table | Drizzle schema | Code references | Status |
|---|---|---|---|
| `user_sessions` | absent | `connect-pg-simple` (express-session) creates and manages this table at runtime | **Expected drift.** Outside Drizzle by design. |
| `marketplace_usage` | absent | Raw SQL in [`tier-limits.ts:154, 163, 210`](artifacts/api-server/src/lib/tier-limits.ts) (SELECT, INSERT, SELECT). 1 row in prod. | **Real drift.** Active table managed via raw SQL only. |
| `reading_progress` | absent | None in api-server or frontend. 0 rows in prod. | **Dead table.** Orphan from a removed feature. |

### Other drift checks
- Recent Phase 1–3 changes (12 dropped indexes, FK on `quote_requests`, schema comments, course_content_translations dropped) all verified sync between schema declarations and DB state. No structural drift introduced this batch.
- Column-level drift was not exhaustively re-audited — Phase 4's post-mediums report concluded "zero structural drift" and that holds.

### Risk assessment
- `user_sessions` — zero risk. Express-session is the canonical owner.
- `marketplace_usage` — **MEDIUM risk** for `drizzle-kit push`. The push tool would not know to manage this table; it would leave it alone (good) but TypeScript callers can't use Drizzle's typed query builder against it (annoying). The current raw-SQL pattern works and is documented.
- `reading_progress` — **LOW risk.** Empty table, no code touches it. A future developer reading the DB might wonder what it's for. Could be `DROP TABLE`'d or left as a graveyard.

### Recommended fix (post-launch, NOT blocking)

**Option A (clean):** Add Drizzle schema declarations for `marketplace_usage` and `reading_progress`. Effort ~30 min — one `pgTable` block per table introspected from `information_schema.columns`.

**Option B (cheaper):** Add a comment block in `schema/index.ts` documenting the 3 known un-declared tables (`user_sessions`, `marketplace_usage`, `reading_progress`) so future readers know not to declare them blindly. Drop `reading_progress` if confirmed dead. Effort ~15 min.

**Status: PARTIAL DRIFT — not blocking launch.** Document in `discovered-issues.md` for post-launch cleanup.

---

## Issue 2 — `lib/db` `.d.ts` staleness in typecheck flow

### Method
- Read `artifacts/api-server/tsconfig.json`
- Read `artifacts/api-server/package.json` `typecheck` script
- Read `lib/db/package.json` `scripts`
- Cross-referenced with the manual rebuild pattern observed throughout this session

### Findings

**The typecheck script does NOT auto-build referenced projects.**

`artifacts/api-server/tsconfig.json` correctly declares project references:
```json
"references": [
  { "path": "../../lib/db" },
  { "path": "../../lib/api-zod" },
  { "path": "../../lib/shared" }
]
```

But the typecheck script is:
```json
"typecheck": "tsc -p tsconfig.json --noEmit"
```

**`tsc -p tsconfig.json --noEmit` does NOT follow project references** — it only checks the api-server project against existing `.d.ts` files in `lib/db/dist/`. If the schema changed in `lib/db/src/schema/index.ts` since the last manual `npx tsc --build` run, the compiled `.d.ts` is stale and api-server's typecheck reads outdated types.

This was confirmed empirically during this session — every time I edited `lib/db/src/schema/index.ts` (Phases 1, 2, 3), `pnpm typecheck` initially failed with `Module '"../../../lib/db/src/schema"' has no exported member 'X'` until I manually ran `npx tsc --build` in `lib/db` first.

### `lib/db` package has no `typecheck` script

```json
"scripts": {
  "push": "drizzle-kit push --config ./drizzle.config.ts",
  "push-force": "drizzle-kit push --force --config ./drizzle.config.ts",
  ...
}
```

So a `pnpm -r typecheck` (recursive across packages) skips lib/db entirely.

### Risk assessment

**MEDIUM operational risk.** A CI pipeline running `pnpm typecheck` against an out-of-sync workspace would either:
- Pass (because `.d.ts` reflects the OLD schema and api-server's code matches the OLD schema) — false negative.
- Fail (because someone committed a schema change but the `.d.ts` files weren't rebuilt) — surface confusion about why the build succeeds locally but fails in CI.

In practice, this manifests as "typecheck works, push to CI, CI fails inexplicably" until someone realises the `.d.ts` needs a rebuild.

### Recommended fix

Change the typecheck script to chain the build of references:

```json
"typecheck": "tsc --build ../../lib/db ../../lib/api-zod ../../lib/shared && tsc -p tsconfig.json --noEmit"
```

Or, more idiomatically with project references:

```json
"typecheck": "tsc --build"
```

(when run from `artifacts/api-server`, `tsc --build` follows the `references` and rebuilds anything stale, then typechecks the current project as part of the build graph).

Effort: 5 minutes (one-line change in 3 packages' `package.json`).

**Status: OPEN — not blocking launch but worth fixing before CI.**

---

## Issue 3 — `payment_method` silent column drop

### Method
- Grep `payment_method|paymentMethod` across `artifacts/api-server/`
- Read the 4 occurrences
- Verify against `users` and `subscription_payments` schema columns in production

### Findings — **1 dead-write site remains**

| File:line | Context | Status |
|---|---|---|
| [`payments.routes.ts:334`](artifacts/api-server/src/routes/payments.routes.ts#L334) | `storage.updateUser(userId, { ..., paymentMethod: "paypal" } as any)` — writes to **users** table | **🚨 BROKEN — dead write** |
| [`payments.routes.ts:205`](artifacts/api-server/src/routes/payments.routes.ts#L205) | Comment explaining the audit-label semantics | ✅ Fine (just a comment) |
| [`payments.routes.ts:361, 378`](artifacts/api-server/src/routes/payments.routes.ts#L361) | Builds `paymentMethod` var, inserts into `subscription_payments.paymentMethod` | ✅ **Correct target** |
| [`admin.routes.ts:227, 265`](artifacts/api-server/src/routes/admin.routes.ts#L227) | Reads `sp.payment_method` from `subscription_payments` for the admin Revenue tab | ✅ Correct |

### Why payments.routes.ts:334 is dead

- `users` table has 25 columns (verified via `information_schema.columns`); **none is named `payment_method`**.
- Drizzle's `db.update().set(...)` builds the SQL by iterating over the schema's column list and matching keys from the input object. **Unknown keys are silently dropped** — no SQL error, no write, no warning.
- The `as any` cast masks the missing-key from TypeScript at the call site.
- Net effect: every PayPal capture has been writing `paymentMethod: "paypal"` to nowhere for ~weeks. The `subscription_payments` row 38 lines below correctly captures the same value, so no real data is lost — the bug is harmless.

### Why this matters

- The dead write fires on **every successful PayPal subscription capture**. At launch traffic it's invisible bug-noise; at scale it's a code smell that will eventually confuse a future engineer ("why does this update return zero affected rows on the user-side step?").
- The `as any` cast is the smell. Removing the dead key removes the need for the cast and makes the code typecheck-clean against the real `User` type.

### Recommended fix

```diff
 await storage.updateUser(userId, {
   subscriptionStatus: "active",
   subscriptionTier: tier,
   subscriptionPlan: plan,
   subscriptionEndDate: endDate,
-  paymentMethod: "paypal",
-} as any);
+});
```

Effort: 30 seconds. Drop the dead key + drop the `as any`. The `subscription_payments` insert below already captures the payment_method correctly.

**Status: OPEN — minimal pre-launch fix recommended.**

---

## Issue 4 — `/api/auth/user` returns `subscriptionTier`

### Method
- Read [`auth.routes.ts:136-163`](artifacts/api-server/src/routes/auth.routes.ts#L136)

### Findings

```ts
const { id, email, displayName, avatarUrl, googleId, appleId,
        subscriptionStatus, subscriptionTier, subscriptionPlan, subscriptionEndDate,
        suspended } = dbUser;
const isAdmin = isAdminUser(dbUser);
return res.json({
  id, email, displayName, avatarUrl,
  hasGoogle: !!googleId,
  hasApple: !!appleId,
  subscriptionStatus, subscriptionTier, subscriptionPlan, subscriptionEndDate,
  isAdmin,
  suspended: !!suspended,
});
```

`subscriptionTier` IS included in the response (line 153). All four subscription fields (`subscriptionStatus`, `subscriptionTier`, `subscriptionPlan`, `subscriptionEndDate`) are present.

OAuth subject IDs (`googleId`, `appleId`) are correctly destructured but only their boolean presence (`hasGoogle`, `hasApple`) ships to the client — security-correct (per the inline comment).

### Frontend usage check
- No "compute tier from plan" pattern needed — the tier is server-authoritative and arrives directly in the response.

**Status: ✅ RESOLVED.**

---

## Overall verdict

| Issue | Status | Pre-launch action |
|---|---|---|
| 1. Schema-vs-DB drift | **Partial drift** (3 un-declared tables, 2 with active code, 1 dead) | Document in `discovered-issues.md`. Not blocking. |
| 2. typecheck script doesn't build references | **OPEN** | Recommend script fix (~5 min). Not blocking but useful before CI. |
| 3. `payment_method` dead write to users | **OPEN** | Recommend 30-second fix (drop one line + `as any`). |
| 4. `/api/auth/user` subscriptionTier | **✅ RESOLVED** | Mark closed in `discovered-issues.md`. |

### Net launch impact

**No launch BLOCKERs.** Issue 4 is fully resolved. Issues 1–3 are real but each has a tiny effort fix (~5 min, ~30 sec, ~15 min respectively) and none cause user-visible bugs:
- Issue 1: cosmetic schema-tracking drift, no runtime impact.
- Issue 2: dev-experience friction during local typecheck, no runtime impact.
- Issue 3: dead write per PayPal capture, no data loss / no error.

### Recommended consolidated batch

If you want to clean these up before launch: single commit titled
`fix(db): close 3 historical DB issues (drift docs, typecheck refs, dead payment_method write)`
with three small changes (~25 min total):

1. Drop `paymentMethod: "paypal"` + `as any` from `payments.routes.ts:329-335`.
2. Change `pnpm typecheck` script in `artifacts/api-server/package.json` to `tsc --build`.
3. Add a documenting comment block in `schema/index.ts` listing the 3 un-declared tables and their reasons.

If you'd rather defer all three: every one is documented above and slots cleanly into the existing `discovered-issues.md` post-launch backlog.

End of verification.
