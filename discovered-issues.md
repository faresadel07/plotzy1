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
