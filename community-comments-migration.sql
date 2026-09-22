-- Community comments (the live feedback wall on the landing page).
-- Additive only. Safe to re-run: every statement is IF NOT EXISTS guarded.

CREATE TABLE IF NOT EXISTS community_comments (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  pinned_at   TIMESTAMP,
  hidden      BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_at   TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_feed
  ON community_comments (hidden, pinned, created_at);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_id
  ON community_comments (user_id);

-- Length guard mirrors the API validation (4..600 characters).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_comments_body_len'
  ) THEN
    ALTER TABLE community_comments
      ADD CONSTRAINT community_comments_body_len
      CHECK (char_length(body) BETWEEN 4 AND 600);
  END IF;
END $$;
