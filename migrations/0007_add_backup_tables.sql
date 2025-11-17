-- バックアップ履歴テーブル
CREATE TABLE IF NOT EXISTS backup_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_id TEXT UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'failed', 'deleted')),
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- バックアップ設定テーブル
CREATE TABLE IF NOT EXISTS backup_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enabled INTEGER DEFAULT 0,
  frequency TEXT DEFAULT 'daily' CHECK(frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
  retention_days INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
