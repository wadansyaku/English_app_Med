ALTER TABLE books ADD COLUMN catalog_source TEXT;
ALTER TABLE books ADD COLUMN access_scope TEXT;

-- Existing official books were imported from the licensed catalog.
UPDATE books
SET catalog_source = CASE
  WHEN created_by IS NULL THEN 'LICENSED_PARTNER'
  ELSE 'USER_GENERATED'
END
WHERE catalog_source IS NULL;

UPDATE books
SET access_scope = CASE
  WHEN created_by IS NULL THEN 'BUSINESS_ONLY'
  ELSE 'ALL_PLANS'
END
WHERE access_scope IS NULL;

CREATE INDEX IF NOT EXISTS idx_books_catalog_scope
  ON books(catalog_source, access_scope);

CREATE TABLE IF NOT EXISTS learning_preferences (
  user_id TEXT PRIMARY KEY,
  target_exam TEXT,
  target_score TEXT,
  exam_date TEXT,
  weekly_study_days INTEGER NOT NULL DEFAULT 4,
  daily_study_minutes INTEGER NOT NULL DEFAULT 20,
  weak_skill_focus TEXT,
  motivation_note TEXT,
  intensity TEXT NOT NULL DEFAULT 'BALANCED',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_instructor_assignments (
  student_user_id TEXT PRIMARY KEY,
  instructor_user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assignments_instructor
  ON student_instructor_assignments(instructor_user_id, updated_at DESC);
