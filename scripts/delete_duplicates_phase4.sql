-- Phase 4-1: 重複データ削除
-- 作成日時: 2025-12-28
-- 目的: 各自治体で最新のidのみを残し、重複レコードを削除

-- ステップ1: 削除対象レコード数を確認（検証用）
-- 実行結果: 76件が削除対象と予想
-- SELECT COUNT(*) as will_be_deleted 
-- FROM building_regulations
-- WHERE id NOT IN (
--   SELECT MAX(id)
--   FROM building_regulations
--   WHERE verification_status='VERIFIED'
--   GROUP BY prefecture, city
-- )
-- AND verification_status='VERIFIED';

-- ステップ2: 重複レコードを削除（各自治体で最新のidのみを残す）
DELETE FROM building_regulations
WHERE id NOT IN (
  SELECT MAX(id)
  FROM building_regulations
  WHERE verification_status='VERIFIED'
  GROUP BY prefecture, city
)
AND verification_status='VERIFIED';

-- 検証用クエリ（コメントアウト）
-- 削除後の統計確認
-- SELECT COUNT(DISTINCT CONCAT(prefecture, city)) as unique_municipalities, 
--        COUNT(*) as total_records,
--        COUNT(*) - COUNT(DISTINCT CONCAT(prefecture, city)) as duplicates
-- FROM building_regulations 
-- WHERE verification_status='VERIFIED';

-- 期待される結果:
-- unique_municipalities: 168
-- total_records: 168
-- duplicates: 0
