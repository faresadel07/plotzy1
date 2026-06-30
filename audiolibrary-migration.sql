-- Audiolibrary tables (public-domain audiobooks from LibriVox + Internet Archive)
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS audiolibrary_books (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  language TEXT,
  description TEXT,
  cover_url TEXT,
  total_duration INTEGER,
  chapters JSONB,
  source_url TEXT,
  genres JSONB,
  downloads INTEGER DEFAULT 0,
  cached_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_books_lang ON audiolibrary_books(language);
CREATE INDEX IF NOT EXISTS idx_audio_books_source ON audiolibrary_books(source);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_audio_books_source_ext ON audiolibrary_books(source, external_id);

CREATE TABLE IF NOT EXISTS audiolibrary_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES audiolibrary_books(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL DEFAULT 0,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  playback_rate NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_audio_progress_user_book ON audiolibrary_progress(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_audio_progress_user ON audiolibrary_progress(user_id);
