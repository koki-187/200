-- ========================================
-- データ品質管理フィールド追加
-- v3.153.126 - ファクトチェックシステム完全実装
-- 生成日時: 2025-12-18
-- ========================================

-- hazard_info テーブルにデータ品質管理フィールドを追加
ALTER TABLE hazard_info ADD COLUMN confidence_level TEXT DEFAULT 'pending';
-- 信頼度レベル:
-- 'high': 複数ソースで確認済み、データ矛盾なし
-- 'medium': 単一ソースのみ、または軽微な矛盾あり
-- 'low': サンプルデータまたは信頼性に疑問
-- 'pending': 未検証

ALTER TABLE hazard_info ADD COLUMN verification_status TEXT DEFAULT 'pending';
-- 検証ステータス:
-- 'verified': ファクトチェック完了、問題なし
-- 'pending': 検証待ち
-- 'conflict': データ矛盾検出、要手動確認
-- 'manual_check_required': 手動確認が必要

ALTER TABLE hazard_info ADD COLUMN verified_by TEXT;
-- 検証者（システム名またはユーザー名）

ALTER TABLE hazard_info ADD COLUMN verified_at DATETIME;
-- 検証日時

ALTER TABLE hazard_info ADD COLUMN data_source_url TEXT;
-- データソースURL（MLIT API、都道府県HP等）

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_hazard_confidence ON hazard_info(confidence_level);
CREATE INDEX IF NOT EXISTS idx_hazard_verification ON hazard_info(verification_status);
CREATE INDEX IF NOT EXISTS idx_hazard_manual_check ON hazard_info(verification_status) 
  WHERE verification_status = 'manual_check_required' OR verification_status = 'conflict';

-- ========================================
-- zoning_restrictions テーブルにも同様のフィールドを追加
-- ========================================
ALTER TABLE zoning_restrictions ADD COLUMN confidence_level TEXT DEFAULT 'pending';
ALTER TABLE zoning_restrictions ADD COLUMN verification_status TEXT DEFAULT 'pending';
ALTER TABLE zoning_restrictions ADD COLUMN verified_by TEXT;
ALTER TABLE zoning_restrictions ADD COLUMN verified_at DATETIME;
ALTER TABLE zoning_restrictions ADD COLUMN data_source_url TEXT;

CREATE INDEX IF NOT EXISTS idx_zoning_confidence ON zoning_restrictions(confidence_level);
CREATE INDEX IF NOT EXISTS idx_zoning_verification ON zoning_restrictions(verification_status);

-- ========================================
-- geography_risks テーブルにも同様のフィールドを追加
-- ========================================
ALTER TABLE geography_risks ADD COLUMN confidence_level TEXT DEFAULT 'pending';
ALTER TABLE geography_risks ADD COLUMN verification_status TEXT DEFAULT 'pending';
ALTER TABLE geography_risks ADD COLUMN verified_by TEXT;
ALTER TABLE geography_risks ADD COLUMN verified_at DATETIME;
ALTER TABLE geography_risks ADD COLUMN data_source_url TEXT;

CREATE INDEX IF NOT EXISTS idx_geography_confidence ON geography_risks(confidence_level);
CREATE INDEX IF NOT EXISTS idx_geography_verification ON geography_risks(verification_status);

-- ========================================
-- 既存サンプルデータの品質ラベリング
-- ========================================

-- 既存の全ハザードデータをサンプルとしてマーク
UPDATE hazard_info SET 
  confidence_level = 'low',
  verification_status = 'pending',
  verified_by = 'system_auto_label',
  verified_at = CURRENT_TIMESTAMP
WHERE confidence_level = 'pending';

UPDATE zoning_restrictions SET 
  confidence_level = 'low',
  verification_status = 'pending',
  verified_by = 'system_auto_label',
  verified_at = CURRENT_TIMESTAMP
WHERE confidence_level = 'pending';

UPDATE geography_risks SET 
  confidence_level = 'low',
  verification_status = 'pending',
  verified_by = 'system_auto_label',
  verified_at = CURRENT_TIMESTAMP
WHERE confidence_level = 'pending';

-- ========================================
-- ファクトチェック管理テーブル作成
-- ========================================

CREATE TABLE IF NOT EXISTS fact_check_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  check_type TEXT NOT NULL, -- 'auto', 'manual', 'multi_source'
  previous_status TEXT,
  new_status TEXT,
  findings TEXT, -- JSON形式で詳細を記録
  checked_by TEXT,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_fact_check_table ON fact_check_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_fact_check_date ON fact_check_log(checked_at);

-- ========================================
-- データ品質ダッシュボード用ビュー
-- ========================================

CREATE VIEW IF NOT EXISTS v_data_quality_summary AS
SELECT 
  'hazard_info' as table_name,
  confidence_level,
  verification_status,
  COUNT(*) as record_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM hazard_info), 2) as percentage
FROM hazard_info
GROUP BY confidence_level, verification_status

UNION ALL

SELECT 
  'zoning_restrictions' as table_name,
  confidence_level,
  verification_status,
  COUNT(*) as record_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM zoning_restrictions), 2) as percentage
FROM zoning_restrictions
GROUP BY confidence_level, verification_status

UNION ALL

SELECT 
  'geography_risks' as table_name,
  confidence_level,
  verification_status,
  COUNT(*) as record_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM geography_risks), 2) as percentage
FROM geography_risks
GROUP BY confidence_level, verification_status;

-- ========================================
-- マイグレーション完了
-- ========================================
