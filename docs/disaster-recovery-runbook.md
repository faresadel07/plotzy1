# Disaster Recovery Runbook — Plotzy

**Last reviewed:** 2026-05-07 (Phase 3 of pre-launch DB hardening)
**Database:** Neon Postgres 17, project `round-hill-56996492`, region `aws-us-west-2`
**Primary contact:** Faris Adel (admin)
**Secondary contact:** Neon support (paid tier: in-dashboard ticket; free tier: support@neon.tech)

This runbook covers six recovery scenarios. Each scenario lists how the incident is detected, the step-by-step recovery procedure, expected RTO (recovery time objective) and RPO (recovery point objective), and which contacts to engage.

---

## Pre-recovery checklist (do this first, every time)

Before running ANY recovery action:

1. **Stop writes** if the situation allows. Either:
   - Set `block_public_connections: true` on the Neon project (Neon dashboard → Settings → "Block public connections")
   - Or scale the API server to zero replicas on the host platform

2. **Confirm the production DATABASE_URL** isn't pointing at the dev branch. Check the host platform's env vars; the production branch endpoint contains `ep-withered-silence-ak3jivqx`, the dev branch contains `ep-cool-poetry-aky8xn3o`.

3. **Take a manual snapshot of the current state** before recovering, even if the current state is broken. Neon → Branches → "Create branch" → name `incident-<date>-<scenario>`. This lets you compare pre/post recovery and rollback the recovery itself if it makes things worse.

4. **Document the incident in real time** — open a fresh markdown file at `docs/incidents/YYYY-MM-DD-<short-name>.md` and timestamp every action you take. Future post-mortems depend on it.

---

## Scenario 1 — Single table corruption / accidental DELETE

**Detection:**
- User-reported missing data (e.g., "all my chapters disappeared")
- `/healthz` shows `db: "ok"` but app endpoints return empty results unexpectedly
- Sentry alerts on a spike of "row not found" 404s

**RTO target:** <1 hour | **RPO target:** ≤6 hours (Neon PITR window)

**Procedure:**
1. Open the Neon console for project `round-hill-56996492`.
2. Branches → "Create branch" → source: production branch → time: pick a moment BEFORE the corruption.
3. Name the branch `recovery-<date>-<table>`.
4. Get the recovery branch's connection string (Connection details panel).
5. From a local environment with both connection strings exported as `DATABASE_URL_PROD` and `DATABASE_URL_RECOVERY`:
   ```bash
   pg_dump --data-only --table=<corrupted_table> "$DATABASE_URL_RECOVERY" > /tmp/recovered.sql
   psql "$DATABASE_URL_PROD" -c "TRUNCATE <corrupted_table> CASCADE"   # ⚠ verify FK cascade is acceptable first
   psql "$DATABASE_URL_PROD" < /tmp/recovered.sql
   ```
   For a partial restore (only specific rows), use `pg_dump --table=… --where="id IN (…)"` instead of TRUNCATE.
6. Verify row counts match expectations before re-enabling writes.
7. Delete the recovery branch: Neon → Branches → `recovery-<date>-<table>` → Delete.

**Contacts:** Faris (primary). Neon support if PITR window is exhausted.

---

## Scenario 2 — Full DB loss (Neon project deleted)

**Detection:**
- `/healthz` returns 503 with `db: "error"` continuously
- Neon dashboard: project missing or marked "deleted"
- `psql` connection refused

**RTO target:** <4 hours | **RPO target:** ≤24 hours (depends on external backup cadence)

**Procedure:**
1. **If the project was deleted within the last 7 days:** Neon retains deleted projects for ~7 days. Email support@neon.tech IMMEDIATELY with the project ID `round-hill-56996492` and request restore.
2. **If past the retention window:** restore from the external backup (see "External backup storage" below).
   ```bash
   # Create a fresh Neon project via dashboard, name it `plotzy`, region us-west-2.
   # Get the new connection string.
   gpg --decrypt /path/to/latest-backup.sql.gpg > /tmp/restore.sql
   psql "$NEW_DATABASE_URL" < /tmp/restore.sql
   ```
3. Update the host platform's `DATABASE_URL` env var to the new project's connection string. Trigger a redeploy.
4. Verify via `/healthz` and a smoke-test login flow.

**Data loss exposure:** rows added between the last external backup and the project deletion are lost.

**Contacts:** Neon support FIRST (best chance of zero-loss recovery within 7 days). Faris for backup access.

---

## Scenario 3 — Region failure (us-west-2 outage)

**Detection:**
- Neon dashboard: project unreachable, status "degraded"
- `/healthz` 503s, `psql` times out
- AWS Service Health Dashboard shows `us-west-2` issues

**RTO target:** <24 hours | **RPO target:** ≤24 hours

**Procedure:**
1. **First: wait.** Most regional outages are resolved by AWS within hours. Check Neon's status page (https://neonstatus.com/) and AWS Service Health.
2. If outage exceeds your tolerance window, fail over to a fresh project in another region:
   - Create new Neon project in `us-east-1` (or `eu-central-1` if EU users dominate)
   - Restore from the latest external backup (same procedure as Scenario 2 step 2)
   - Update host platform DATABASE_URL → new connection string
   - Redeploy the API server
3. **Don't run multi-region writes.** Once primary recovers, plan a read-only data migration BACK to us-west-2 during a maintenance window. Don't try to merge writes from both sides.

**Data loss exposure:** rows added during the outage that didn't make it to the external backup.

**Contacts:** Neon support (status updates), Faris (failover decision).

---

## Scenario 4 — Code regression wrote bad data

**Detection:**
- User reports of strange-looking data (truncated content, swapped fields, duplicate rows)
- Spike in 5xx errors after a deploy
- Sentry alerts on data-shape errors (Drizzle returning `null` where a value is expected)

**RTO target:** <2 hours | **RPO target:** depends — varies row-by-row

**Procedure:**
1. **First: revert the bad deploy.** Stop the bleeding before recovering. On the host platform: redeploy the previous good commit, then verify `/healthz`.
2. Identify the affected rows. Run targeted SELECTs to scope the damage:
   ```sql
   -- Example: find rows with empty content where the schema requires content
   SELECT id FROM chapters WHERE content = '' AND updated_at > '2026-05-XX 12:00:00';
   ```
3. Create a Neon recovery branch (Scenario 1, step 2) at the moment before the bad deploy.
4. Generate a per-row diff script:
   ```bash
   pg_dump --data-only --table=chapters --where="id IN (1, 2, 3)" "$DATABASE_URL_RECOVERY" > /tmp/recovery.sql
   ```
5. Manually review `/tmp/recovery.sql`. UPDATE statements (per-row) are safer than full TRUNCATE+INSERT.
6. Apply to production with a transaction:
   ```bash
   psql "$DATABASE_URL_PROD" -c "BEGIN" -f /tmp/recovery.sql -c "COMMIT"
   ```
7. Verify a few rows by hand before declaring done.
8. Delete the recovery branch.

**Contacts:** Faris (primary). Code revert + recovery is a single-engineer operation.

---

## Scenario 5 — Ransomware / security incident

**Detection:**
- Unfamiliar admin user appears in `users` table
- `admin_audit_logs` shows actions from unknown IPs
- Mass data deletion or modification visible
- Ransomware note posted somewhere in the UI

**RTO target:** <8 hours | **RPO target:** ≤6 hours

**Procedure:**
1. **Immediately rotate ALL credentials.** Don't recover first — the attacker may have the credentials and will undo your work.
   - Neon: dashboard → Settings → Roles → Reset password for `neondb_owner`
   - OAuth: Google / Apple / LinkedIn / Facebook console → regenerate client secrets
   - Resend: dashboard → API keys → revoke + create new
   - PayPal: developer.paypal.com → app secrets → regenerate
   - Sentry: settings → DSN → regenerate
   - Update the host platform's env vars with all new values.
2. Review `admin_audit_logs` for the timeline:
   ```sql
   SELECT * FROM admin_audit_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
   ORDER BY created_at DESC;
   ```
3. Identify the attacker's earliest action. Create a recovery branch from the moment BEFORE that.
4. Restore the affected tables from the recovery branch (Scenario 1 procedure, scoped to affected tables).
5. **If the attacker accessed user data:** notify affected users per applicable breach-notification law (GDPR Art. 33 = 72 hours to supervisory authority for EU users).
6. Document the incident in detail at `docs/incidents/<date>-security.md`.

**Contacts:** Faris (primary). Legal counsel if user data was accessed. Neon support for Postgres-level forensics if needed.

---

## Scenario 6 — User reports data loss (single user)

**Detection:**
- Support ticket: "all my books are gone"
- `/api/me/export-data` returns far less than the user expects
- User is logged in as the correct account (verified by support)

**RTO target:** <4 hours | **RPO target:** ≤6 hours

**Procedure:**
1. Verify the user's identity via the support ticket flow (matching email + recent login from a known device).
2. Check the audit log for relevant actions:
   ```sql
   SELECT * FROM admin_audit_logs
   WHERE (admin_id = <user_id> OR (target_type = 'user' AND target_id = <user_id>))
     AND created_at > NOW() - INTERVAL '14 days'
   ORDER BY created_at DESC;
   ```
   Look for `book_delete`, `account_delete` actions. If the user themselves deleted, recovery is the user's choice — confirm with them before restoring.
3. If accidental loss: create a Neon recovery branch from BEFORE the loss. Run targeted SELECT for the user's `book_id`s:
   ```sql
   SELECT id FROM books WHERE user_id = <user_id>;
   ```
4. Cross-reference with current production rows; identify the deleted IDs.
5. Restore via per-row INSERT (don't TRUNCATE — affects other users):
   ```bash
   pg_dump --data-only --table=books --where="user_id=<user_id>" "$DATABASE_URL_RECOVERY" > /tmp/user-restore.sql
   psql "$DATABASE_URL_PROD" < /tmp/user-restore.sql
   ```
   Repeat for `chapters` (filter by `book_id IN (...)`), `chapter_snapshots`, etc.
6. Verify the user can now see their data. Close the ticket.
7. Delete the recovery branch.

**Contacts:** Faris (primary). Loop in support_messages thread.

---

## External backup storage

**Status: NOT YET IMPLEMENTED.** Neon PITR provides a 6-hour recovery window only. Beyond that, all recovery scenarios above depend on an external backup that doesn't exist yet.

**Plan:** nightly `pg_dump` from production → encrypted with `gpg` → uploaded to OneDrive (Faris's existing storage). 30 daily + 12 monthly retention.

This is **deferred to post-launch** per Phase 3 decisions — see the entry in `discovered-issues.md`. Until automated, take a manual `pg_dump` to OneDrive **at least weekly** during the first months:

```bash
PGPASSWORD=<from-password-manager>  pg_dump \
  --no-owner --no-acl \
  --host=ep-withered-silence-ak3jivqx-pooler.c-3.us-west-2.aws.neon.tech \
  --port=5432 \
  --username=neondb_owner \
  --dbname=neondb \
  --format=plain \
  > plotzy-backup-$(date +%Y-%m-%d).sql
gpg --symmetric --cipher-algo AES256 plotzy-backup-$(date +%Y-%m-%d).sql
# Upload the .sql.gpg to OneDrive; delete the unencrypted .sql.
```

---

## Where the production DATABASE_URL lives

The production connection string is stored in:
1. **The host platform's environment variables** (Render / Vercel / Fly — wherever the API server is deployed)
2. **Faris's password manager** (1Password, Bitwarden, etc.) as the offline backup

The string is NOT in:
- Any file in the git repository (`.gitignore` covers `.env`)
- Any local `.env` file on a dev machine (local `.env` points at the dev branch endpoint per the post-launch separation)
- Any logged output (Sentry redacts password-key matches; pino has the same redaction at logger init)

If the password manager is lost AND the host platform is inaccessible: the connection string can be regenerated from the Neon dashboard by resetting the role password (Settings → Roles → `neondb_owner` → "Reset password"). All running clients with the old password will start failing immediately, so plan the rotation during a maintenance window.

---

## Backup verification policy

Whoever runs a manual `pg_dump` should also test the restore path on the dev branch quarterly:

```bash
# Pseudo-procedure (NOT a runnable script — see Neon docs for exact branch reset syntax)
gpg --decrypt latest-backup.sql.gpg > /tmp/test-restore.sql
DATABASE_URL=<dev-branch-url>  psql -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public"
DATABASE_URL=<dev-branch-url>  psql < /tmp/test-restore.sql
DATABASE_URL=<dev-branch-url>  psql -c "SELECT COUNT(*) FROM books, chapters, users"
```

A backup that restores cleanly on the dev branch is a backup you can trust on the production branch. A backup that's never been tested is theatre, not insurance.

---

## Runbook revision history

| Date | Change | Reviewer |
|---|---|---|
| 2026-05-07 | Initial version (Phase 3 of pre-launch DB hardening, M-7 finding) | Claude + Faris |
