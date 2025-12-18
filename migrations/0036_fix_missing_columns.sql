-- ========================================
-- データ品質フィールド追加（不足テーブルのみ）
-- v3.153.126 - Hotfix for missing columns
-- ========================================

-- zoning_restrictions テーブルにデータ品質管理フィールドを追加
ALTER TABLE zoning_restrictions ADD COLUMN confidence_level TEXT DEFAULT 'pending';
ALTER TABLE zoning_restrictions ADD COLUMN verification_status TEXT DEFAULT 'pending';
ALTER TABLE zoning_restrictions ADD COLUMN verified_by TEXT;
ALTER TABLE zoning_restrictions ADD COLUMN verified_at DATETIME;

-- geography_risks テーブルにデータ品質管理フィールドを追加
ALTER TABLE geography_risks ADD COLUMN confidence_level TEXT DEFAULT 'pending';
ALTER TABLE geography_risks ADD COLUMN verification_status TEXT DEFAULT 'pending';
ALTER TABLE geography_risks ADD COLUMN verified_by TEXT;
ALTER TABLE geography_risks ADD COLUMN verified_at DATETIME;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_zoning_confidence ON zoning_restrictions(confidence_level);
CREATE INDEX IF NOT EXISTS idx_zoning_verification ON zoning_restrictions(verification_status);

CREATE INDEX IF NOT EXISTS idx_geography_confidence ON geography_risks(confidence_level);
CREATE INDEX IF NOT EXISTS idx_geography_verification ON geography_risks(verification_status);

-- 既存データの品質ラベリング
UPDATE zoning_restrictions SET 
  confidence_level = 'medium',
  verification_status = 'pending',
  verified_by = 'system_auto_label',
  verified_at = CURRENT_TIMESTAMP
WHERE confidence_level = 'pending';

UPDATE geography_risks SET 
  confidence_level = 'medium',
  verification_status = 'pending',
  verified_by = 'system_auto_label',
  verified_at = CURRENT_TIMESTAMP
WHERE confidence_level = 'pending';

-- ========================================
-- マイグレーション完了
-- ========================================
