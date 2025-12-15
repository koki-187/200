-- マイグレーション: APIログとエラーログテーブルの追加
-- バージョン: v3.80.0
-- 作成日: 2025-12-01

-- APIログテーブル
CREATE TABLE IF NOT EXISTS api_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  request_size_bytes INTEGER DEFAULT 0,
  response_size_bytes INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  error_code TEXT,
  error_message TEXT,
  request_body TEXT, -- JSON形式
  response_body TEXT, -- JSON形式（大きすぎる場合は省略）
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- APIログインデックス（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_error_code ON api_logs(error_code);

-- エラーログテーブル
CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,
  error_type TEXT NOT NULL, -- 'api_error', 'database_error', 'validation_error', 'system_error'
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  severity TEXT NOT NULL DEFAULT 'error', -- 'debug', 'info', 'warning', 'error', 'fatal'
  endpoint TEXT,
  method TEXT,
  request_data TEXT, -- JSON形式
  context_data TEXT, -- JSON形式（tags, extra等）
  ip_address TEXT,
  user_agent TEXT,
  environment TEXT DEFAULT 'production', -- 'development', 'production'
  resolved BOOLEAN DEFAULT 0,
  resolved_at DATETIME,
  resolved_by TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- エラーログインデックス（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_environment ON error_logs(environment);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);

-- メトリクス集計用ビュー（オプション、パフォーマンスのため）
CREATE VIEW IF NOT EXISTS api_metrics_summary AS
SELECT 
  endpoint,
  method,
  COUNT(*) as total_calls,
  SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
  AVG(response_time_ms) as avg_response_time,
  MIN(response_time_ms) as min_response_time,
  MAX(response_time_ms) as max_response_time,
  DATE(created_at) as date
FROM api_logs
GROUP BY endpoint, method, DATE(created_at);

-- エラー統計ビュー（オプション）
CREATE VIEW IF NOT EXISTS error_stats_summary AS
SELECT 
  error_type,
  error_code,
  severity,
  COUNT(*) as error_count,
  COUNT(CASE WHEN resolved = 1 THEN 1 END) as resolved_count,
  COUNT(CASE WHEN resolved = 0 THEN 1 END) as unresolved_count,
  DATE(created_at) as date
FROM error_logs
GROUP BY error_type, error_code, severity, DATE(created_at);
