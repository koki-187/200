-- マイグレーション 0043: geography_risksから詳細住所データを生成
-- 目的: 既存のNG項目データを詳細住所テーブルに展開
-- 作成日: 2025-12-18

-- 既存のgeography_risksデータから詳細住所データを生成
-- 各地区を丁目ごとに分割し、番地レンジを設定

-- 東京都江戸川区小岩（10m以上浸水エリア）
INSERT INTO detailed_address_hazards (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, data_source_url,
  confidence_level, verification_status, verified_by, verified_at
)
SELECT 
  prefecture,
  city,
  district,
  chome_num || '丁目' as chome,
  1 as banchi_start,
  99 as banchi_end,
  prefecture || city || district || chome_num || '丁目1-99番地' as normalized_address,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, data_source_url,
  confidence_level, verification_status, verified_by, verified_at
FROM geography_risks
CROSS JOIN (
  SELECT 1 as chome_num UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL 
  SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
) AS chome_list
WHERE district IS NOT NULL
  AND district != ''
  AND is_over_10m_flood = 1 OR is_cliff_area = 1;

-- データ生成数を確認
SELECT 
  '詳細住所データ生成完了' as status,
  COUNT(*) as generated_count,
  COUNT(CASE WHEN is_over_10m_flood=1 THEN 1 END) as over_10m_count,
  COUNT(CASE WHEN is_cliff_area=1 THEN 1 END) as cliff_count
FROM detailed_address_hazards;
