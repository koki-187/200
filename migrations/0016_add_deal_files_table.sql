-- v3.55.0: ファイル管理機能の追加
-- 目的: 案件ごとのファイル保存、ダウンロード、管理機能

-- deal_files テーブル（案件に紐づくファイル）
CREATE TABLE IF NOT EXISTS deal_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,        -- 'ocr', 'document', 'image', 'other'
  file_size INTEGER NOT NULL,     -- bytes
  r2_key TEXT NOT NULL,           -- R2のオブジェクトキー（例: "deals/123/ocr/456_sample.pdf"）
  mime_type TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  uploaded_by TEXT NOT NULL,      -- user_id or 'admin'
  is_ocr_source BOOLEAN DEFAULT 0, -- OCR元資料かどうか
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_deal_files_deal_id ON deal_files(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_user_id ON deal_files(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_file_type ON deal_files(file_type);
