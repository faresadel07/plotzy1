-- The Studio: tables backing the multi-model AI companion.
-- Run once in the Supabase SQL editor. Safe to re-run: every
-- statement is IF NOT EXISTS guarded.

CREATE TABLE IF NOT EXISTS studio_conversations (
  id                       SERIAL PRIMARY KEY,
  user_id                  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id                  INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id               INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  title                    TEXT,
  pinned                   BOOLEAN NOT NULL DEFAULT FALSE,
  archived                 BOOLEAN NOT NULL DEFAULT FALSE,
  parent_conversation_id   INTEGER,
  last_provider_id         TEXT NOT NULL DEFAULT 'llama',
  created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_conv_user_chapter
  ON studio_conversations(user_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_studio_conv_book_id
  ON studio_conversations(book_id);
CREATE INDEX IF NOT EXISTS idx_studio_conv_parent
  ON studio_conversations(parent_conversation_id);

CREATE TABLE IF NOT EXISTS studio_messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES studio_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  provider_id     TEXT,
  content         TEXT NOT NULL,
  token_count     INTEGER,
  cost_cents      INTEGER,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_msg_conversation
  ON studio_messages(conversation_id, id);

CREATE TABLE IF NOT EXISTS studio_daily_provider_usage (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  date        TEXT NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_studio_usage_user_provider_date
  ON studio_daily_provider_usage(user_id, provider_id, date);
