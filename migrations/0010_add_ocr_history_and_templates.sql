-- OCR履歴テーブル
CREATE TABLE IF NOT EXISTS ocr_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  file_names TEXT NOT NULL,  -- JSON array of filenames
  extracted_data TEXT NOT NULL,  -- JSON object of extracted data
  confidence_score REAL,  -- OCR confidence score (0.0 - 1.0)
  processing_time_ms INTEGER,  -- Processing time in milliseconds
  is_edited INTEGER DEFAULT 0,  -- Whether user edited the results
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- OCR履歴テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_ocr_history_user_id ON ocr_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_history_created_at ON ocr_history(created_at DESC);

-- 物件テンプレートテーブル
CREATE TABLE IF NOT EXISTS property_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,  -- 'apartment', 'house', 'land', 'commercial', 'custom'
  template_data TEXT NOT NULL,  -- JSON object of template fields
  is_shared INTEGER DEFAULT 0,  -- Whether this template is shared with all users
  use_count INTEGER DEFAULT 0,  -- How many times this template has been used
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- テンプレートテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_property_templates_user_id ON property_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_property_templates_type ON property_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_property_templates_use_count ON property_templates(use_count DESC);

-- OCR設定テーブル（ユーザーごとのOCR設定）
CREATE TABLE IF NOT EXISTS ocr_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  auto_save_history INTEGER DEFAULT 1,  -- Automatically save OCR history
  default_confidence_threshold REAL DEFAULT 0.7,  -- Minimum confidence to accept OCR results
  enable_batch_processing INTEGER DEFAULT 1,  -- Enable batch processing for large uploads
  max_batch_size INTEGER DEFAULT 20,  -- Maximum files per batch
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- OCR設定テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_ocr_settings_user_id ON ocr_settings(user_id);
