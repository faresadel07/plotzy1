-- Publisher Submission Tracker tables
-- Run once against the production DB to create the new tables.

CREATE TABLE IF NOT EXISTS publisher_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  recipient_key TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP,
  responded_at TIMESTAMP,
  follow_up_at TIMESTAMP,
  notes TEXT,
  materials JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pub_subs_user ON publisher_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_pub_subs_user_book ON publisher_submissions(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_pub_subs_followup ON publisher_submissions(user_id, follow_up_at);

CREATE TABLE IF NOT EXISTS saved_publishers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_key TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_pub_user ON saved_publishers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_saved_pub_user_recipient ON saved_publishers(user_id, recipient_key);
