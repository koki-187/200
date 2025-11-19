-- OCRジョブテーブル（非同期処理用）
-- Note: user_idはTEXT型（usersテーブルのidに合わせる）
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  total_files INTEGER NOT NULL,
  processed_files INTEGER DEFAULT 0,
  file_names TEXT,  -- JSON array of filenames
  extracted_data TEXT,  -- JSON object of extracted data with field-level confidence
  error_message TEXT,
  confidence_score REAL,  -- Overall confidence score
  processing_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OCRジョブテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_user_id ON ocr_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status ON ocr_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_created_at ON ocr_jobs(created_at DESC);
