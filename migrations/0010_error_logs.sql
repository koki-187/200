-- Error Logs Table for Auto Error Recovery System
-- Created: 2025-12-11
-- Purpose: Track all errors and auto-recovery attempts

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('error', 'warning', 'info')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  context TEXT,
  user_id TEXT,
  recovery_attempted INTEGER DEFAULT 0,
  recovery_success INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);

-- Sample data for testing
INSERT OR IGNORE INTO error_logs (id, timestamp, level, category, message, recovery_attempted, recovery_success)
VALUES ('test-001', datetime('now'), 'info', 'system_startup', 'Error logging system initialized', 0, 0);
