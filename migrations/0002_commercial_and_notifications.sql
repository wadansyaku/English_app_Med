ALTER TABLE users ADD COLUMN subscription_plan TEXT NOT NULL DEFAULT 'TOC_FREE';
ALTER TABLE users ADD COLUMN organization_name TEXT;

CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);

CREATE TABLE IF NOT EXISTS instructor_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_user_id TEXT NOT NULL,
  instructor_user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  trigger_reason TEXT NOT NULL,
  delivery_channel TEXT NOT NULL DEFAULT 'IN_APP',
  used_ai INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_student_created
  ON instructor_notifications(student_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_instructor_created
  ON instructor_notifications(instructor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  model TEXT NOT NULL,
  estimated_cost_milli_yen INTEGER NOT NULL DEFAULT 0,
  request_units INTEGER NOT NULL DEFAULT 1,
  used_ai INTEGER NOT NULL DEFAULT 1,
  month_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month
  ON ai_usage_events(user_id, month_key, created_at DESC);
