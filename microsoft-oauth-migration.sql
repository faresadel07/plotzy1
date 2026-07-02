-- Adds microsoft_id column for Microsoft OAuth sign-in.
--
-- Runs safely against a live DB: IF NOT EXISTS keeps repeated applies
-- idempotent, and adding a nullable unique column is a metadata-only
-- operation in Postgres. No downtime.
--
-- Apply once when Railway is back online:
--   psql "$DATABASE_URL" -f microsoft-oauth-migration.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS microsoft_id text UNIQUE;

-- No backfill needed — existing rows stay NULL until users link a
-- Microsoft account.
