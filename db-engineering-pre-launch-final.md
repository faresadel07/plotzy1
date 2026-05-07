# Database Engineering — Pre-Launch Final Summary

**Project:** Plotzy
**Period:** Pre-launch hardening cycle, completed 2026-05-07
**Database:** Neon Postgres 17.8, project `round-hill-56996492`, region `aws-us-west-2`
**Master tip at closure:** `9ced540`
**All work merged to master, no open branches, no force-pushes, all changes peer-reviewable in git history.**

---

## 1. Where the work began

A pre-launch audit of the Plotzy database surfaced **18 findings** distributed across schema integrity, data integrity, performance, security, backup & disaster recovery, migrations, and observability:

- **8 HIGH** — issues that could cause user-visible failures, data loss, or security incidents at launch traffic.
- **10 MEDIUM** — issues that wouldn't break launch but would compound into operational debt.

The audit was the first time the production DB had been examined as a whole rather than piecemeal during feature work. The findings were the accumulated cost of moving fast on features without regular hygiene passes.

Full original audit: [`db-health-audit-pre-launch.md`](db-health-audit-pre-launch.md).

---

## 2. Historical issues verification

In addition to the audit-found 18, four lingering issues from earlier engineering sessions were re-verified before launch:

1. **Schema-vs-DB drift detection** — confirm Drizzle schema matches production reality.
2. **`lib/db` `.d.ts` staleness in the typecheck flow** — long-running friction where every schema change required a manual rebuild before downstream typechecks.
3. **`payment_method` silent column drop** — a write to a non-existent column on the `users` table that Drizzle was silently ignoring.
4. **`/api/auth/user` returns `subscriptionTier`** — verify the auth response includes the tier field the frontend depends on.

Verification report: [`db-historical-issues-verification.md`](db-historical-issues-verification.md).

**Total findings tracked through this cycle: 22.**

---

## 3. Resolution status

### 19 of 22 findings resolved

| # | Finding | Resolution | Phase | Commit |
|---|---|---|---|---|
| H-1 | Email verification tokens stored raw | SHA-256 hash at rest | Pre-launch B1 | `ec9e510` |
| H-2 | Password reset tokens stored raw | SHA-256 hash at rest | Pre-launch B1 | `ec9e510` |
| H-3 | 13 dev-junk books in production | Deleted + 5 test users CASCADE-cleaned | Pre-launch B2 | `e4846d0` |
| H-5 | `pg.Pool` no error handler | `pool.on("error")` listener; no more Node crash on transient Neon errors | Pre-launch B2 | `e4846d0` |
| H-8 | Local dev shares prod DB | Neon `dev` branch + `.env` split | Pre-launch B3 | `e775479` |
| M-1 | 12 duplicate indexes | Dropped CONCURRENTLY; ~180 KB freed; write-perf marginally improved | Phase 1 | `feb3872` |
| M-2 | N+1 in `/api/course/progress` | 19 queries / 3 round-trips → 7 queries / 1 round-trip | Phase 1 | `feb3872` |
| M-3 | No statement timeout | 30s `statement_timeout` per pool client | Phase 1 | `feb3872` |
| M-4 | 8 audit log gaps | New `logAuditEvent()` helper with IP + UA capture; 8 sensitive routes wired | Phase 2 | `3ca9963` |
| M-5 | GDPR Article 15 data export | `GET /api/me/export-data` — 23-table fan-out, whitelist field exclusion, sensitive-rate-limited | Phase 3 | `4cb1a78` |
| M-6 | `quote_requests` FK NO ACTION | Changed to RESTRICT; matches codebase pattern | Phase 1 | `feb3872` |
| M-7 | DR runbook | 6-scenario `docs/disaster-recovery-runbook.md` shipped | Phase 3 | `4cb1a78` |
| M-8 | Storage error logging consistency | 103 silent route catches converted to logged catches (audit estimated 67; bonus coverage caught 36 more) | Phase 2 | `3ca9963` |
| M-9 | Sentry alerting beyond capture | Boot-log + `/healthz` Sentry-status field + manual dashboard alert rules | Phase 2 | `3ca9963` |
| M-10 | Invite-code verification | End-to-end re-trace confirmed three token surfaces correctly hashed; closing comment for forward-looking `books.shareToken` | Phase 3 | `4cb1a78` |
| Hist-1 | Schema drift documentation | 32-line schema comment for 3 undeclared tables | Final cleanup | `f9ac8fc` |
| Hist-2 | Typecheck script doesn't follow project references | All 3 packages → `tsc --build`; closes the long-running "rebuild lib/db manually" friction | Final cleanup | `f9ac8fc` |
| Hist-3 | `payment_method` dead write | Removed dead key + `as any` cast | Final cleanup | `f9ac8fc` |
| Hist-4 | `/api/auth/user` returns `subscriptionTier` | Already resolved at audit time | (n/a) | (already in code) |

### 3 findings deferred with documented compensating controls

| # | Finding | Trigger to revisit | Compensating control |
|---|---|---|---|
| H-4 | Unbounded SELECTs in `getPublishedBooks`, `getBooks`, `getSupportMessages` | 1000+ books in prod, OR viral moment | Current scale (0 books at launch) makes this irrelevant; pagination work scheduled when the threshold is approached. |
| H-6 | No self-service GDPR account deletion (Article 17 right-to-erasure) | EU traffic appears, OR first deletion request arrives via support | Manual admin path documented. The Article 15 data-export endpoint that DID ship satisfies the right-of-access half of GDPR. |
| H-7 | Neon PITR window is 6 hours; no external backup automation | First incident, OR 30 days post-launch | Disaster recovery runbook ships with detailed manual `pg_dump` procedure (host, role, flags, GPG encryption, OneDrive upload). Quarterly backup verification policy documented. Nightly automation has full implementation outline in `discovered-issues.md` for the future ticket. |

Each deferral has an explicit documented trigger to revisit and a working operational fallback. None block launch.

---

## 4. Master state — all commits

13 commits across the database hardening cycle, all on `master`:

```
9ced540  docs(audit): mark historical Issues 1-3 resolved + Issue 4 already-closed
3a5588b  Merge branch 'fix/db-historical-issues-cleanup'
f9ac8fc  fix(db): close 3 historical issues (dead write + typecheck flow + schema drift docs)
ad7a554  Merge branch 'fix/db-mediums-phase-3-gdpr-dr'
4cb1a78  feat(gdpr): data export endpoint + DR runbook + close M-10 invite-code verification
8e93a92  Merge branch 'fix/db-mediums-phase-2-observability'
3ca9963  fix(observability): error logging + audit gaps + Sentry verification (M-8, M-4, M-9)
a3acee9  Merge branch 'fix/db-mediums-phase-1-performance'
feb3872  fix(db): performance + reliability mediums (N+1 + statement timeout + duplicate indexes + FK fix)
c01b3fe  Merge branch 'fix/pre-launch-security-and-hygiene'
e775479  chore(infra): separate development database from production via Neon branch
e4846d0  fix(hygiene): pg.Pool error handler + production data cleanup
ec9e510  fix(security): hash all stored tokens (email verify, password reset, invite codes)
```

Workflow conventions held throughout:
- **`--no-ff` merges** for every batch — clear feature-branch history in the log.
- **No force-pushes** — every commit is reviewable and revertable.
- **One audit/decision-points cycle per phase** before any code landed — every approved change has a paper trail.
- **Branch deleted after merge** — clean local repo, no orphan branches.

---

## 5. New infrastructure delivered

Beyond fixing the 22 findings, the cycle added permanent infrastructure for ongoing hygiene:

| File | Purpose |
|---|---|
| [`artifacts/api-server/src/lib/token-hash.ts`](artifacts/api-server/src/lib/token-hash.ts) | SHA-256 hash helper. Single source of truth for all token surfaces — algorithm change is a one-line edit. |
| [`artifacts/api-server/src/lib/audit-log.ts`](artifacts/api-server/src/lib/audit-log.ts) | `logAuditEvent({ actorId, action, targetType, targetId, details, req? })`. Failure-tolerant. IP + UA captured automatically when `req` is passed. |
| [`artifacts/api-server/src/lib/log-route-error.ts`](artifacts/api-server/src/lib/log-route-error.ts) | `logRouteError(req, err, context)`. Skips `ZodError` (those are 400s, not server errors). Standardised structured logging across the route layer. |
| [`artifacts/api-server/src/lib/data-export.ts`](artifacts/api-server/src/lib/data-export.ts) | `exportUserData(userId)` — GDPR Article 15 fan-out across 23 tables. Whitelist excludes sensitive fields by default. |
| [`docs/disaster-recovery-runbook.md`](docs/disaster-recovery-runbook.md) | Six incident scenarios with detection method, step-by-step procedure, RTO/RPO targets, contacts. Pre-recovery checklist at the top forces safety steps under pressure. |

Plus enhancements to existing files:
- `pg.Pool` error handler + 30s statement timeout in [`db.ts`](artifacts/api-server/src/db.ts).
- `isSentryActive()` + boot-log + `/healthz` field in [`sentry.ts`](artifacts/api-server/src/lib/sentry.ts) and [`app.ts`](artifacts/api-server/src/app.ts).
- 32-line schema documentation comment in [`schema/index.ts`](lib/db/src/schema/index.ts) for 3 deliberately-undeclared tables.

---

## 6. Production database state at launch

| Dimension | State |
|---|---|
| Tables | 48 user tables, 0 stored functions, 0 triggers (clean baseline) |
| Users | 1 (Faris admin only) |
| Books | 0 (all dev junk purged) |
| Chapters | 0 |
| Course content | 6 modules, 27 lessons, 7 quizzes, 70 questions — intact and verified |
| Schema drift | Zero structural drift; 3 known un-declared tables documented in schema comment |
| Orphan rows | Zero across all FK relationships sampled |
| Duplicate UNIQUE values | Zero |
| Token tables | Empty; all future writes hashed |
| Indexes | 166 (down from 178; 12 duplicates dropped; ~180 KB freed) |
| Foreign keys | 55, all with intentional `delete_rule` semantics |
| CHECK constraints | 10, all enforced |
| DB size | 215 MB on PG 17.8 — comfortable headroom on Neon Free tier |
| PITR window | 6 hours (deferred external backup with documented compensating control) |
| Dev/prod isolation | Neon `dev` branch (`br-mute-block-aks7drtf`) operational; local `.env` switched and verified |

---

## 7. Launch verdict

🟢 **DATABASE: LAUNCH-READY.**

Every HIGH and MEDIUM finding from the original audit is either resolved or explicitly deferred with a documented trigger to revisit and a working operational fallback. The four historical issues are closed. The schema is in sync with production. The 1 user / 0 books / clean course content state means launch-day visitors see a fresh production database, not the accumulated debris of months of feature development.

The application now has, at the database level:
- **Security**: every stored token hashed at rest, every sensitive operation audit-logged with IP and user-agent.
- **Observability**: 100% route-error logging coverage, Sentry boot-time verification, `/healthz` reports Sentry status, 19 audit-logged operations.
- **Compliance**: GDPR Article 15 (right of access) endpoint shipped; the manual Article 17 (right to erasure) path documented.
- **Resilience**: pool error handling + 30s statement timeout + Neon dev/prod isolation + 6-scenario disaster recovery runbook.
- **Performance**: N+1 patterns eliminated on the dashboard hot path; duplicate indexes dropped; project-references typecheck closes the inner-loop friction.
- **Maintainability**: shared helpers for tokens / audit logging / route errors; schema documentation for un-declared tables prevents future drift.

---

## 8. What remains — pure infrastructure setup

No engineering work blocks launch. The remaining items are operational:

| Item | Owner | Approximate time |
|---|---|---|
| Domain registration + DNS configuration | Faris | < 1h |
| Hosting platform selection and deployment (Vercel / Render / Fly) | Faris | 1h |
| Production environment variables: `DATABASE_URL`, `SENTRY_DSN`, `SESSION_SECRET`, OAuth secrets, `RESEND_API_KEY`, PayPal Live keys, etc. | Faris | 1h |
| Resend production API key + sending domain verification | Faris | 30 min |
| PayPal Live mode credentials + IPN webhook verification | Faris | 30–60 min |
| Sentry production project + DSN provisioning | Faris | 15 min |
| Sentry dashboard alert rules (First-Seen + Regression) | Faris | 15 min |
| First manual `pg_dump` to OneDrive (per the runbook) | Faris | 5 min |

**Estimated launch-prep total: 4–5 hours of infrastructure work.**

The production `DATABASE_URL` for Vercel is saved at `C:\Users\ViVoBooK\Desktop\plotzy-prod-db-backup.txt` (deliberately outside any git repo).

---

## Health check at production cutover

After the production deploy, hitting `https://<your-domain>/healthz` should return:

```json
{ "status": "ok", "db": "ok", "sentry": "active" }
```

If `sentry` shows `"disabled"`, the `SENTRY_DSN` env var didn't make it to the production environment — fix before serving traffic.

---

## Closing note

The database started this cycle with 22 known issues, a single shared dev/prod environment, raw tokens stored in three token tables, no statement timeout, 12 duplicate indexes, 67 silent error catches (later found to be 103), no audit trail for password resets, no GDPR data-export endpoint, no disaster recovery plan, a 6-hour PITR window with no insurance, and accumulated dev-test data leaking into the public Community Library.

It ends with: 1 user, 0 books, 0 dev junk in token tables, 30-second statement timeout, deduplicated indexes, 103 logged catches, 19 audited operations, a GDPR Article 15 endpoint, a six-scenario disaster recovery runbook, a verified Neon branch isolating dev from production, and an operational baseline that a launch can stand on.

Three findings are deferred. Each has a trigger that names the condition under which it must be revisited, and each has a documented compensating control covering the gap until then. Nothing is hidden in a "we'll get to it later" pile.

The work is auditable. The decisions are recorded. The database is launch-ready.
