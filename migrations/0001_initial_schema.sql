PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  grade TEXT,
  english_level TEXT,
  stats_xp INTEGER NOT NULL DEFAULT 0,
  stats_level INTEGER NOT NULL DEFAULT 1,
  stats_current_streak INTEGER NOT NULL DEFAULT 0,
  stats_last_login_date TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  is_priority INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  source_context TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_books_created_by ON books(created_by);
CREATE INDEX IF NOT EXISTS idx_books_priority_title ON books(is_priority DESC, title ASC);

CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  word_number INTEGER NOT NULL,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  search_key TEXT NOT NULL,
  example_sentence TEXT,
  example_meaning TEXT,
  is_reported INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_words_book_id_number ON words(book_id, word_number);
CREATE INDEX IF NOT EXISTS idx_words_search_key ON words(search_key);

CREATE TABLE IF NOT EXISTS learning_histories (
  user_id TEXT NOT NULL,
  word_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  status TEXT NOT NULL,
  last_studied_at INTEGER NOT NULL,
  next_review_date INTEGER NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  correct_count INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, word_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_histories_user_book ON learning_histories(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_histories_due ON learning_histories(user_id, next_review_date);

CREATE TABLE IF NOT EXISTS learning_plans (
  user_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  target_date TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  daily_word_goal INTEGER NOT NULL,
  selected_book_ids TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS word_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id TEXT NOT NULL,
  reporter_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_word_reports_word_id ON word_reports(word_id);
