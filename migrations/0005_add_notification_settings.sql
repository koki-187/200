-- 通知設定テーブル
CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  email_on_new_deal INTEGER DEFAULT 1,
  email_on_deal_update INTEGER DEFAULT 1,
  email_on_new_message INTEGER DEFAULT 1,
  email_on_mention INTEGER DEFAULT 1,
  email_on_task_assigned INTEGER DEFAULT 1,
  email_digest_frequency TEXT DEFAULT 'daily' CHECK(email_digest_frequency IN ('none', 'daily', 'weekly')),
  push_on_new_message INTEGER DEFAULT 0,
  push_on_mention INTEGER DEFAULT 0,
  push_on_task_due INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
