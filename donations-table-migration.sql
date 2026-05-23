-- Donations table migration
-- Run this once in the Supabase SQL editor.
-- Safe to re-run: every statement is IF NOT EXISTS guarded.

CREATE TABLE IF NOT EXISTS donations (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  donor_email     TEXT,
  donor_name      TEXT,
  paypal_order_id   TEXT NOT NULL,
  paypal_capture_id TEXT NOT NULL,
  amount_cents    INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_donations_paypal_order_id ON donations(paypal_order_id);
