-- ユーザー別ストレージ使用量トラッキングテーブル
CREATE TABLE IF NOT EXISTS user_storage_quotas (
  user_id TEXT PRIMARY KEY,
  total_files INTEGER DEFAULT 0,
  total_size_bytes INTEGER DEFAULT 0,
  ocr_files INTEGER DEFAULT 0,
  ocr_size_bytes INTEGER DEFAULT 0,
  photo_files INTEGER DEFAULT 0,
  photo_size_bytes INTEGER DEFAULT 0,
  quota_limit_bytes INTEGER DEFAULT 524288000, -- 500MB default
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_storage_quotas_user_id ON user_storage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_quotas_updated_at ON user_storage_quotas(updated_at);

-- ファイルメタデータテーブル (R2にアップロードしたファイルの記録)
CREATE TABLE IF NOT EXISTS uploaded_files_metadata (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  deal_id TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_category TEXT NOT NULL CHECK(file_category IN ('ocr_document', 'photo', 'other')),
  r2_key TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_deleted INTEGER DEFAULT 0,
  deleted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_deal_id ON uploaded_files_metadata(deal_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_category ON uploaded_files_metadata(file_category);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_deleted ON uploaded_files_metadata(is_deleted);
