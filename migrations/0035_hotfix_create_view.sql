-- ========================================
-- データ品質ダッシュボード用ビュー作成（Hotfix）
-- v3.153.126 - ビューのみ作成
-- ========================================

-- 既存のビューを削除（存在する場合）
DROP VIEW IF EXISTS v_data_quality_summary;

-- データ品質ダッシュボード用ビュー
CREATE VIEW v_data_quality_summary AS
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
