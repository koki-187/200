-- Migration: OpenAI API Usage Tracking & Cost Protection
-- Version: v3.153.96
-- Created: 2025-12-15
-- Purpose: $20/month cost limit protection + duplicate execution prevention

-- ============================================================
-- 1. OpenAI API使用量追跡テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS openai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id TEXT NOT NULL,
  endpoint TEXT NOT NULL, -- '/api/ocr-jobs'
  model TEXT NOT NULL, -- 'gpt-4o'
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  estimated_cost_usd REAL NOT NULL, -- 推定コスト
  actual_cost_usd REAL, -- 実測コスト(後で更新可)
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rate_limit', 'canceled')),
  error_message TEXT, -- エラー時の詳細メッセージ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_openai_usage_user_id ON openai_usage(user_id);
CREATE INDEX idx_openai_usage_created_at ON openai_usage(created_at);
CREATE INDEX idx_openai_usage_job_id ON openai_usage(job_id);
CREATE INDEX idx_openai_usage_status ON openai_usage(status);

-- ============================================================
-- 2. 月間コスト集計ビュー
-- ============================================================
CREATE VIEW IF NOT EXISTS monthly_openai_cost AS
SELECT 
  strftime('%Y-%m', created_at) as month,
  SUM(estimated_cost_usd) as total_cost_usd,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_requests,
  SUM(CASE WHEN status = 'rate_limit' THEN 1 ELSE 0 END) as rate_limit_requests
FROM openai_usage
GROUP BY month
ORDER BY month DESC;

-- ============================================================
-- 3. 重複実行防止テーブル(24h以内の同一ファイルをブロック)
-- ============================================================
CREATE TABLE IF NOT EXISTS ocr_deduplication (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  file_hash TEXT NOT NULL, -- SHA-256ハッシュ
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- バイト数
  job_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL, -- 24時間後
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_ocr_dedup_user_file ON ocr_deduplication(user_id, file_hash, expires_at);
CREATE INDEX idx_ocr_dedup_expires ON ocr_deduplication(expires_at);

-- ============================================================
-- 4. コスト上限設定テーブル(全ユーザー共通)
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_limits (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- 常に1行のみ
  monthly_limit_usd REAL NOT NULL DEFAULT 20.0,
  alert_threshold REAL NOT NULL DEFAULT 0.8, -- 80%で警告
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER, -- 管理者のuser_id
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- デフォルト値挿入
INSERT OR IGNORE INTO cost_limits (id, monthly_limit_usd, alert_threshold) 
VALUES (1, 20.0, 0.8);

-- ============================================================
-- 5. 期限切れ重複レコードの自動削除トリガー(オプション)
-- ============================================================
-- Note: Cloudflare D1ではトリガーが制限される可能性があるため、
-- バックエンドで定期クリーンアップを実装する方が安全
-- CREATE TRIGGER IF NOT EXISTS cleanup_expired_dedup
-- AFTER INSERT ON ocr_deduplication
-- BEGIN
--   DELETE FROM ocr_deduplication 
--   WHERE expires_at < datetime('now');
-- END;
