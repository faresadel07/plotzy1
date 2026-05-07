# Plotzy — Pre-launch Database Health Audit

**Date:** 2026-05-07
**DB:** Neon Postgres 17.8, project `round-hill-56996492`, region `aws-us-west-2`
**DB size:** 216 MB
**Tables:** 48 user tables, 0 stored functions, 0 triggers
**Auditor:** Phase A inspection only. No code changes, data changes, or migrations applied.

---

## Section 1: Schema integrity

### 1.1 Drift between Drizzle schema and production
Sampled all 48 tables; spot-checked column lists, FKs, indexes, CHECK constraints. **No structural drift detected.** Specifically:

- The `password_reset_tokens.token` UNIQUE constraint that `discovered-issues.md:2052` flagged as drift is **now present in production** (`password_reset_tokens_token_key`) and matches `lib/db/src/schema/index.ts:646`. Drift resolved at some point between the prior audit and today. No action needed.
- The Cert PDF columns added via surgical SQL in Batch 3.2 (per `discovered-issues.md:2056`) are present and match the Drizzle definition (`courseCertificates.pdfData`, `pdfUrl`, `pdfGeneratedAt`, `pdfSizeBytes`, `holderLanguage`).
- The `course_content_translations` table added via Neon MCP for the (later reverted) Arabic translation feature has been **dropped** as part of the revert and is absent from production. Schema clean.

### 1.2 Foreign keys (55 total)
Full FK matrix queried via `information_schema.referential_constraints`. All `delete_rule` values are deliberate. Notable patterns:

- **CASCADE** (most user-owned tables): course_progress, course_quiz_attempts, course_certificates, book_likes, follows, daily_ai_usage, etc. → user/book deletion cleans up dependents.
- **SET NULL** (audit-trail-style references): `books.user_id`, `chapters.user_id`, `notifications.actor_id`, `inline_comments.user_id`, `support_messages.user_id`, `support_replies.sender_user_id`, `content_flags.reviewed_by`, `page_views.user_id`, `reading_progress.chapter_id`. → preserves the row when the referenced entity is deleted; the row's relationship becomes anonymous.
- **RESTRICT**: `course_progress.lesson_id` only. Documented in schema as "make it HARD to accidentally delete a lesson that any student has progress on."
- **NO ACTION**: `quote_requests.professional_id`. **Flag** — this is the default Postgres behaviour but uncommon in this codebase. Likely intended as RESTRICT (so a professional with active quote requests can't be silently deleted). See finding M-7.

Update rules are all `NO ACTION` — fine, since IDs are SERIAL and never updated.

### 1.3 Indexes
**178 indexes total across 48 tables.** Coverage is generally good — every FK column has at least one index.

**Issue found: 12 sets of duplicate indexes** on the same column tuples across 9 tables. These cost write performance and storage with zero read benefit. Examples:

| Table | Duplicate index pair | Shape |
|---|---|---|
| `arc_recipients` | `idx_arc_recipients_book` + `idx_arc_recipients_book_id` | `(book_id)` |
| `book_likes` | `book_likes_book_id_user_id_key` + `uq_book_likes_book_user` | UNIQUE `(book_id, user_id)` |
| `book_ratings` | `idx_book_ratings_book` + `idx_book_ratings_book_id` | `(book_id)` |
| `book_ratings` | `idx_book_ratings_unique` + `uq_book_ratings_book_user` | UNIQUE partial `(book_id, user_id) WHERE user_id IS NOT NULL` |
| `book_series` | `idx_book_series_user` + `idx_book_series_user_id` | `(user_id)` |
| `content_flags` | `idx_content_flags_book` + `idx_content_flags_book_id` | `(book_id)` |
| `course_certificates` | `course_certificates_certificate_uuid_key` + `idx_course_certificates_uuid` | `(certificate_uuid)` (one is UNIQUE, the other a plain index — keep UNIQUE) |
| `daily_ai_usage` | `daily_ai_usage_user_id_date_key` + `uq_daily_ai_usage_user_date` | UNIQUE `(user_id, date)` |
| `follows` | `idx_follows_unique` + `uq_follows_follower_followee` | UNIQUE `(follower_id, followee_id)` |
| `lore_entries` | `idx_lore_entries_book` + `idx_lore_entries_book_id` | `(book_id)` |
| `transactions` | `idx_transactions_book` + `idx_transactions_book_id` | `(book_id)` |
| `user_achievements` | `idx_user_achievements_unique` + `uq_user_achievements_user_achievement` | UNIQUE `(user_id, achievement_id)` |

See finding M-1.

**Missing index spot-check:** every FK column has an index. `books.user_id`, `chapters.book_id`, `course_progress.user_id`, `course_quiz_attempts.user_id` — all covered. No missing-index hits found in the heavy paths.

### 1.4 CHECK constraints (10 total)
All sane and matching the schema's intent:

- `book_ratings.rating ∈ [1, 5]`
- `books.view_count ≥ 0`
- `course_modules.order ∈ [1, 6]`
- `course_quiz_attempts.score_percentage ∈ [0, 100]`
- `course_quiz_questions.correct_option ∈ {a,b,c,d}`
- `course_quizzes.type ∈ {module, final}` + module/final consistency
- `course_quizzes.passing_percentage ∈ [0, 100]`
- `direct_messages: sender_id ≠ receiver_id` (no self-DM)
- `follows: follower_id ≠ followee_id` (no self-follow)

None missing or stale.

### 1.5 Triggers and functions
**0 stored functions, 0 triggers.** All business logic is in the application layer. Clean baseline.

---

## Section 2: Data integrity

### 2.1 Orphaned rows
Spot-checked 10 FK relationships:

| Check | Orphans |
|---|---:|
| `course_progress` → `course_lessons` | 0 |
| `course_quiz_attempts` → `course_quizzes` | 0 |
| `course_quiz_questions` → `course_quizzes` | 0 |
| `chapters` → `books` | 0 |
| `books.user_id IS NULL` (orphaned via SET NULL) | 0 |
| `lore_entries` → `books` | 0 |
| `notifications.user_id IS NULL` | 0 |
| `transactions` → `books` | 0 |
| `reading_progress` → `books` | 0 |
| `course_certificates` → `users` | 0 |

**No orphans. Clean.**

### 2.2 NULL where NOT NULL expected
No drift here — all NOT NULL declarations in the Drizzle schema are enforced in production (cross-checked the `users` table column list as a representative; FK columns and required fields all match `is_nullable='NO'`).

### 2.3 Duplicate values vs UNIQUE constraints
Checked: `users.email`, `books.share_token`, `password_reset_tokens.token`, `email_verification_tokens.token`, `course_certificates.certificate_uuid`. **All zero duplicates.** All UNIQUE constraints can hold; no blocking values to clean up.

### 2.4 Reference data presence
| Expected | Present | Status |
|---|---:|---|
| 6 course modules | 6 | ✅ |
| 27 lessons | 27 | ✅ |
| 7 quizzes (6 module + 1 final) | 7 | ✅ |
| 70 quiz questions (6×5 + 40) | 70 | ✅ |
| `correctOption` set on every question | yes (CHECK enforces) | ✅ |
| Module order 1–6 (UNIQUE) | yes | ✅ |
| Final exam: `type='final'`, `module_id IS NULL`, `passing=75`, `time_limit=60` | confirmed via earlier seed runs | ✅ |

### 2.5 Course content sync state
All 27 lesson markdown files on disk are in sync with `course_lessons.content` (last seed run reported `content: 0 updated, 27 unchanged`).
Arabic translations were reverted in commit `9f232b7`; production confirmed clean — `course_content_translations` table no longer exists. No leftover rows.

### 2.6 Test/dev data leakage in production — 🚨 confirmed leak
Production DB contains **10 of 13 books with clearly-test titles** authored mostly by user_id=1:

| ID | user_id | title | published | deleted |
|---:|---:|---|:---:|:---:|
| 2 | 1 | "ت" | no | no |
| 3 | 1 | "س" | **yes** | no |
| 5 | 2 | "قب" | no | yes |
| 6 | 3 | "fares" | no | no |
| 7 | 1 | "ty" | **yes** | no |
| 8 | 1 | "fatsre" | no | no |
| 9 | 1 | "ffffff" | no | no |
| 10 | 1 | "ffdfd" | no | no |
| 11 | 1 | "dfsdfxc" | no | no |
| 12 | 6 | "F" | no | no |
| 13 | 2 | "ا" | no | no |
| 14 | 2 | "yu" | no | no |

**Two of these are PUBLISHED** to the Community Library (IDs 3 and 7) and will appear in the `/library` listing on launch day. See finding H-3.

Plus 4 chapters with empty content. Plus user_id=1's general dev usage.

**`users` table:** 6 users total — likely all internal testers. Verify before launch.

---

## Section 3: Performance

### 3.1 Slow query risks
**HIGH — Unbounded SELECTs in heavy paths** (per code audit):

| Function | File:line | Issue |
|---|---|---|
| `getPublishedBooks()` | `storage.ts:492` | LEFT JOIN with `users`, ORDER BY `publishedAt DESC`, **no `.limit()`**. Powers the public Community Library. As books grow, this fetches everything per request. |
| `getBooks()` | `storage.ts:221` | All books WHERE `is_deleted=false`, no LIMIT. |
| `getSupportMessages()` | `storage.ts:812` | All support tickets, no LIMIT. Admin queue. |
| `getDeletedBooks()` | `storage.ts:261` | All soft-deleted books, no LIMIT. |

See finding H-4.

**MEDIUM — N+1 in `/api/course/progress`** at `course.routes.ts:269,279`:
```ts
const moduleQuizzes = await Promise.all(modules.map((m) => storage.getModuleQuiz(m.id)));
const allUserAttempts = await Promise.all(allQuizzes.map((q) => storage.getQuizAttempts(userId, q.id)));
```
12–20 round-trips per dashboard render. Code comment acknowledges it as v1 tradeoff. See finding M-2.

**Other endpoints** (`/api/course/modules`, `/api/library`, `POST /quizzes/:id/attempts`) are clean — already use `Promise.all()` for independent reads, no missing indexes detected on their predicates.

### 3.2 Connection pool sanity
`artifacts/api-server/src/db.ts`:
```ts
new Pool({ connectionString: ..., max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 })
```
- Sizing tuned for Neon's free tier (max=5 fits well under Neon's connection budget).
- `idleTimeoutMillis` deliberately shorter than Neon's idle drop, preventing ECONNRESET on next checkout.
- `connectionTimeoutMillis` bounds wait time under load.

**HIGH — No `pool.on('error', …)` handler.** A single transient pool error (Neon maintenance, network blip) propagates uncaught and crashes the route handler — and on `pg.Pool`, an uncaught client error event crashes the entire Node process. See finding H-5.

### 3.3 Query timeout
No `statement_timeout` set on the pool or per-query. Default is unlimited. A pathological query (e.g. unindexed scan on a large table) would block a pool slot indefinitely. Low risk today (no large tables), MEDIUM risk as `notifications`, `direct_messages`, `api_logs`, `chapter_snapshots` grow. See finding M-3.

---

## Section 4: Security

### 4.1 SQL injection risk
**Clean.** All raw `db.execute(sql\`…\`)` occurrences (7 in `storage.ts`) interpolate via Drizzle's parameterized `sql\`…${var}\`` template literals or `sql.join(...)`. No string concatenation found. ORM usage is correct.

### 4.2 Sensitive data exposure
- **Passwords:** stored as `bcryptjs` hashes, salt rounds=12 ([auth.routes.ts:172](artifacts/api-server/src/routes/auth.routes.ts#L172)). Verified with `bcrypt.compare` ([auth.routes.ts:238](artifacts/api-server/src/routes/auth.routes.ts#L238)). ✅
- **🚨 HIGH — Email verification tokens stored as RAW values** in `email_verification_tokens.token`. Generated via `crypto.randomBytes(32).toString("hex")` and inserted unhashed. A DB compromise hands an attacker every active verification token.
- **🚨 HIGH — Password reset tokens stored as RAW values** in `password_reset_tokens.token`. Same generation, same problem. Mitigated only by `usedAt` single-use semantics. Industry best practice: hash the token (SHA-256 is sufficient since the random 256-bit input has full entropy) and compare against the hash on consumption.
- **MEDIUM — Book-collaborator invite codes** stored as raw values (`book_collaborators.invite_code`). Same class of issue as tokens. Lower urgency since invite codes have narrower scope.
- **Stripe IDs** (`stripe_customer_id`, `stripe_subscription_id`): public identifiers, not secrets. ✅
- **No API keys / secrets columns** in any table. Secrets are env-only. ✅

See finding H-1, H-2, M-4.

### 4.3 Audit log
**Present at `admin_audit_logs`** — schema at `lib/db/src/schema/index.ts:691`. Wired for: `user_suspend`, `user_delete`, `user_grant_subscription`, `book_delete`, `flag_review`, `banner_update`, `social_links_update`, `bulk_suspend`, `bulk_unsuspend`, `bulk_delete`. Safe (try/catch wrapped, doesn't block the main action).

**Gaps:** these sensitive operations are NOT audited:
- User-initiated email change
- Password reset completion
- Course certificate issuance
- Book publish / unpublish

See finding M-5.

### 4.4 GDPR readiness
- **Data export** — **NOT IMPLEMENTED.** No `/export`, `/gdpr`, `/data-download` endpoint anywhere. EU users have a right to request their data; you cannot fulfil it programmatically today.
- **Data deletion** — partial. `DELETE /api/admin/users/:id` exists ([misc.routes.ts:514](artifacts/api-server/src/routes/misc.routes.ts#L514)) but is admin-only. **No self-service account deletion.** EU users have right-to-erasure; admin-only deletion is not GDPR-compliant for self-initiated requests.
- Cascade behaviour on user deletion is mostly correct (CASCADE on most user-owned tables), but `books.user_id` is `SET NULL` — deleting a user orphans their books with `user_id=NULL`. Not a leak (no PII in books), but the books remain published in the Community Library "by anonymous." Verify this is the intended semantics for GDPR deletion.
- **Consent tracking** — no `newsletter_opt_in` / `marketing_email_consent` columns. If you ever send marketing emails (or already do via Resend), you have no record of explicit consent.
- **Data retention** — no background job purges old data. `login_attempts` has a 1% probabilistic 24-hour purge ([auth.routes.ts:42](artifacts/api-server/src/routes/auth.routes.ts#L42)) — that's the only retention policy. Expired password reset / email verify tokens accumulate forever.
- **Privacy policy** — page exists at `artifacts/plotzy/src/pages/privacy-policy.tsx` with privacy@plotzy.app contact.

See findings H-6, M-6.

---

## Section 5: Backup and disaster recovery

### 5.1 Backup status
Neon's tier docs (verified knowledge, not queried directly): the Free tier provides automated **point-in-time recovery (PITR) within a 24-hour history retention window** (`history_retention_seconds: 21600` in the project config = 6 hours, *not* 24 — confirmed via earlier `list_projects` call). For a paid tier upgrade, retention extends to 7 days (Launch tier) or 30 days (Scale tier).

**Current PITR window: 6 hours.** This means accidental data loss older than 6 hours is **unrecoverable** unless you have external backups. See finding H-7.

### 5.2 Disaster scenarios

| Scenario | Current recovery plan | Gap |
|---|---|---|
| Single table corruption | PITR via Neon console (≤6h) | If older than 6h, data is gone |
| Full DB loss | PITR via Neon console (≤6h) | Same |
| Accidental DROP TABLE | PITR via Neon console (≤6h) | High risk because dev/prod share one DB (Sec 7.1) |
| Ransomware on Neon side | None | Hosted-provider risk, accepted |
| Region failure (us-west-2) | None | Single-region; switch to multi-region requires Neon Scale tier + manual DR setup |

**No external backup exists.** A nightly `pg_dump` to S3 / R2 / OneDrive would close the >6h gap. Strongly recommended pre-launch.

---

## Section 6: Migrations

### 6.1 Migration history
- **No migration tracking table** exists (`drizzle_migrations`, `__drizzle_migrations`, etc. are absent — verified via `information_schema.tables`).
- Schema management uses `drizzle-kit push` (declarative, no recorded history). `discovered-issues.md:1774` already flags this as a LOW item to address post-launch.
- **Surgical migrations bypassing Drizzle** (per `discovered-issues.md`):
  - Cert PDF columns (Batch 3.2) — applied via tsx + pg, verified in schema.
  - `password_reset_tokens.token` UNIQUE constraint — earlier drift, now resolved (verified above).
  - The (now reverted) Arabic translations table — applied via Neon MCP, dropped via Neon MCP.
- No migration history beyond what's in git log + `discovered-issues.md`.

### 6.2 Rollback plan
None documented. PITR via Neon console is the de-facto rollback for the 6-hour window. Beyond that — no plan. See M-8.

---

## Section 7: Environment-specific concerns

### 7.1 Single-DB-for-dev-and-prod risk — 🚨 confirmed
Faris's local development hits the production Neon. Verified by:
- `.env` DATABASE_URL points at `ep-withered-silence-ak3jivqx-pooler.c-3.us-west-2.aws.neon.tech` (the production endpoint).
- 10 of 13 books in production are user_id=1 dev test data (Section 2.6).
- 6 users total in production, almost all internal.
- Today's audit included multiple `pnpm seed:course` runs hitting prod.

**Risks materialising on launch day:**
- A local dev `pnpm` script accidentally runs against prod (the seed scripts already do).
- Test data shows up in the Community Library (already happening, IDs 3 and 7).
- Schema changes in dev affect prod schema instantly via `drizzle-kit push`.
- Recovery from a dev mistake costs prod data.

See finding H-8.

### 7.2 Connection string security
- `.gitignore` has `.env` and `.env.*` (verified `.gitignore` line 58–59).
- Tracked `.env*` files: only `.env.example` (safe template). Confirmed `.env` and `.env.backup-pre-sandbox` are LOCAL only and **NOT in git** (`git status --ignored` shows `!! .env` / `!! .env.backup-pre-sandbox`).
- Git history scan (`git log --all --full-history -p | grep -E "neon\.tech|postgres://"`): only the placeholder `postgresql://user:password@host/dbname?sslmode=require` from `.env.example`. **No real credentials ever committed.** ✅
- DATABASE_URL is read only from `process.env.DATABASE_URL` ([db.ts:7](artifacts/api-server/src/db.ts#L7)), never logged. Sentry's automatic redaction covers it through the password-key pattern.

**Status:** clean. The earlier subagent's report flagged committed credentials — that was a false positive (the agent read the local `.env` files, which are correctly gitignored).

---

## Section 8: Monitoring and observability

### 8.1 What's monitored
- Pino logger configured ([lib/logger.ts:1-20](artifacts/api-server/src/lib/logger.ts#L1)) with sensitive-header redaction (authorization, cookie, set-cookie).
- Sentry SDK wired ([lib/sentry.ts:16-93](artifacts/api-server/src/lib/sentry.ts#L16)) with PII redaction regex covering `password`, `token`, `api_key`, `stripe`, `paypal`. 10% trace sample rate. Conditional on `SENTRY_DSN` env var.
- DB error logging is **inconsistent** — present in payment / admin / auth routes; **absent in storage layer** (e.g., `deleteUser()` failures only surface if uncaught upstream).
- **No query performance instrumentation** (no slow-query logging, no per-query timing).
- **No connection pool metrics** (no visibility into checked-out vs idle vs waiting).

### 8.2 Alerting
- **None.** Sentry captures errors but no paging integration (no PagerDuty, no email-on-error).
- No alerts on connection pool exhaustion, disk approaching limits, or PITR window approaching expiry.

See findings M-9, M-10.

---

## SUMMARY OF FINDINGS

### 🚨 BLOCKER — must fix before launch
*None.* No findings rise to launch-blocker severity.

### ⚠️ HIGH — should fix before launch

| # | Finding | Recommended fix | Effort |
|---|---|---|---|
| **H-1** | **Email verification tokens stored as raw values** in DB. A DB compromise hands attackers every active token. | Hash the token with SHA-256 before insert; hash the incoming token before lookup. Migration: drop unused tokens (the 2 in DB are likely test data) or null them out and force re-verify. | 1.5h |
| **H-2** | **Password reset tokens stored as raw values.** Same class as H-1; mitigated only by single-use semantics. | Same fix pattern as H-1. | 1h |
| **H-3** | **10 of 13 books in production are dev junk** (titles "ت", "س", "fff", "F", "ty", etc.); 2 are even **published** in the Community Library and visible to launch-day visitors. | Identify dev users (almost certainly user_id=1 + the obvious test rows), purge the books + their chapters via `DELETE FROM books WHERE id IN (...)`. CASCADE handles dependents. | 30 min (incl. inspection) |
| **H-4** | **Unbounded SELECTs** in `getPublishedBooks` / `getBooks` / `getSupportMessages` — pull entire tables every call. The Community Library endpoint is most exposed. | Add `.limit()` + offset/cursor pagination on these three; update the routes to thread the page param through. | 2-3h |
| **H-5** | **Pool has no `error` event handler.** A transient Neon error crashes the Node process. | One-liner: `pool.on('error', (err) => logger.error({ err }, 'pg pool error'))`. Verify under simulated disconnect. | 15 min |
| **H-6** | **No self-service account deletion.** GDPR right-to-erasure can only be fulfilled by manual admin action. EU users on launch day = compliance gap. | Add `DELETE /api/auth/me` route gated by `requireAuth` + password re-confirmation; reuses the existing `storage.deleteUser` (verify cascade matrix first). | 2-3h |
| **H-7** | **PITR window is 6 hours** on the current Neon Free tier. Older accidents are unrecoverable. | Either upgrade to Neon Launch tier (7-day PITR, ~$19/mo) **or** add a nightly `pg_dump` to external storage (S3/R2/OneDrive). The dump approach is the cheapest insurance. | 1-2h for dump script |
| **H-8** | **Dev and prod share the same Neon DB.** Local script runs hit production, test data leaks in (already happened — see H-3), drizzle-kit push during dev mutates prod schema instantly. | Provision a second Neon project (cost: free), point local `.env` at it, copy schema via `drizzle-kit push`, optionally seed an anonymised subset of prod. Add a `.env.production` documented separately and never local-default to it. | 1-2h |

### 📌 MEDIUM — fix in first weeks post-launch

| # | Finding | Recommended fix | Effort |
|---|---|---|---|
| **M-1** | **12 sets of duplicate indexes** across 9 tables. Each duplicate is a write penalty + storage waste. | Drop the extras. Pick the canonical name (the `*_key` constraint-generated name when one is constraint-backed; the `idx_*` name otherwise) and `DROP INDEX CONCURRENTLY` the duplicates. | 1h (incl. verification) |
| **M-2** | **N+1 in `/api/course/progress`** — 12-20 queries per dashboard render. | Bulk-fetch all module quizzes via single `WHERE module_id IN (...)`; same for attempts via `WHERE user_id = $1 AND quiz_id IN (...)`. | 1.5h |
| **M-3** | **No statement timeout.** A pathological query blocks a pool slot indefinitely. | Add `connectionString + ?statement_timeout=30000` on the pool (PG-level) or wrap critical queries with explicit timeout. | 30 min |
| **M-4** | **Book-collaborator invite codes stored raw** (same class as H-1/H-2 but lower stakes). | Same hash-on-store pattern. | 1h |
| **M-5** | **Audit log gaps.** Email change, password reset completion, certificate issuance, book publish/unpublish are not logged. | Add `logAdminAction` (or rename to `logAuditEvent`) calls in the relevant route handlers. Schema already supports it. | 2h |
| **M-6** | **GDPR — no data export, no consent tracking, no retention jobs.** | Self-export endpoint (1.5h), `marketing_consent` column on users (30 min schema + UI), nightly cron for token cleanup (45 min). | 4-5h total |
| **M-7** | **`quote_requests.professional_id` FK uses `NO ACTION`** — out of pattern. | Change to RESTRICT (matches the codebase's "hard to delete a referenced row" intent). | 15 min |
| **M-8** | **No documented rollback / DR plan.** PITR is the only recovery mechanism. | Write `runbooks/disaster-recovery.md` covering the four scenarios in Sec 5.2 + the steps to restore from PITR + (post H-7) from the external dump. | 2h |
| **M-9** | **Storage layer DB errors not logged.** Failures only surface if uncaught upstream. | Wrap critical storage methods with try/catch + `logger.error`. Or add a Drizzle middleware layer. | 2h |
| **M-10** | **No alerting** beyond Sentry capture. Connection pool exhaustion, PITR window expiry, disk-near-limit invisible. | Sentry alerts on error spikes (free tier supports this); configure email digest. Neon dashboard alerts for storage % (free). | 1h |

### 📝 LOW — track for future improvement

| # | Finding | Notes |
|---|---|---|
| **L-1** | Many indexes have `idx_scan = 0` since DB creation | Normal at low traffic. Re-evaluate at 3 months — drop genuinely unused indexes then. |
| **L-2** | `drizzle-kit push` instead of versioned migrations | Already documented in `discovered-issues.md:1774`. Address once schema stabilises post-launch. |
| **L-3** | 191 frontend typecheck errors (per `discovered-issues.md` H-2) | Not a DB issue but flagged in the same audit cycle. Affects launch reliability. |
| **L-4** | `transactions` table is empty, `subscription_payments` has 5 rows (likely test) | Confirm the payment flow has been end-to-end tested before launch. |
| **L-5** | Only 1 of 6 users has `email_verified=true` | Confirm production-launch flow forces verification before subscription. |

### ✅ INFO — current state is good
- Schema integrity: zero drift detected; CHECK constraints all sensible; FK matrix is deliberate.
- Data integrity: zero orphans across 10 sampled FK relationships, zero duplicate values in any UNIQUE constraint.
- Reference data: full course content present (6 modules / 27 lessons / 7 quizzes / 70 questions).
- SQL injection: clean across the board — Drizzle's parameterized template literals used everywhere; no raw concatenation.
- Passwords: bcryptjs with salt rounds=12, no plaintext anywhere.
- `.env` files: never committed; `.gitignore` correct; git history clean of any real connection string.
- Sentry SDK: wired with sensible PII redaction; trace sampling configured.
- Pool config: Neon-aware (max=5, idleTimeout 30s, connTimeout 5s) with thoughtful inline comments.
- Triggers/functions: zero — clean baseline, all logic in app layer.
- DB size: 216 MB on PG 17.8 — comfortable headroom on Free tier (~3 GB limit).

---

## RECOMMENDED PRE-LAUNCH ACTION PLAN

**Total effort: 10–14 hours of focused work to clear all HIGHs.**

Suggested sequence (each step independent, can be done in any order):

1. **Quick wins (1.5h total)** — H-3 (purge dev data), H-5 (pool error handler).
2. **Token security (2.5h)** — H-1 + H-2 together (same code pattern, batch them).
3. **GDPR compliance (2-3h)** — H-6 self-service deletion endpoint.
4. **Pagination (2-3h)** — H-4 add `.limit()` + cursor pagination on the unbounded SELECTs.
5. **DR insurance (1-2h)** — H-7 nightly `pg_dump` to OneDrive (or upgrade to Neon Launch).
6. **Environment isolation (1-2h)** — H-8 second Neon project for local dev.

After those, master is launch-ready from a DB perspective. The MEDIUMs and LOWs become a steady-state backlog.

## RECOMMENDED POST-LAUNCH ROADMAP

**Weeks 1–2 post-launch (≈12h):**
- M-1 (drop duplicate indexes) — schedule a low-traffic window.
- M-2 (course/progress N+1).
- M-3 (statement timeout).
- M-5 (audit log gaps).
- M-9 (storage error logging).
- M-10 (alerting).

**Month 1 post-launch (≈8h):**
- M-4 (invite-code hashing).
- M-6 (GDPR data export, consent tracking, retention jobs).
- M-7 (quote_requests FK).
- M-8 (DR runbook).

**Q1 post-launch:**
- L-2 (versioned migrations).
- L-1 (drop genuinely-unused indexes).
- L-3 (frontend typecheck cleanup).

---

## Appendix A — Tables with row counts (selected)

| Table | Rows |
|---|---:|
| users | 6 |
| books | 13 |
| chapters | 10 |
| course_modules | 6 |
| course_lessons | 27 |
| course_quizzes | 7 |
| course_quiz_questions | 70 |
| course_progress | 27 |
| course_quiz_attempts | 7 |
| course_certificates | 1 |
| course_final_projects | 0 |
| user_sessions (active) | 27 |
| login_attempts | 2 |
| password_reset_tokens | 1 |
| email_verification_tokens | 2 |
| admin_audit_logs | 3 |
| subscription_payments | 5 |
| transactions | 0 |

## Appendix B — User tier distribution

| Tier | Count |
|---|---:|
| free | 4 |
| pro | 1 |
| premium | 1 |
| (admin role) | 1 of 6 |
| (verified email) | 1 of 6 |

## Appendix C — Project + DB metadata

- Postgres 17.8 on aarch64
- Database: `neondb` (default)
- Project: `round-hill-56996492`
- Region: `aws-us-west-2`
- DB size: 216 MB
- History retention (PITR window): 6 hours (= 21,600 s)
- Compute autoscaling: 0.25 CU min / 0.25 CU max (i.e. fixed at smallest size)
- Suspend timeout: 0 (compute always-on)

End of audit.
