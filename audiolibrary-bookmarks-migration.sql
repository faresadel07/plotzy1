CREATE TABLE IF NOT EXISTS audiolibrary_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES audiolibrary_books(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL DEFAULT 0,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_bookmarks_user_book ON audiolibrary_bookmarks(user_id, book_id);
