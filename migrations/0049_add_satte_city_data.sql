-- Migration 0049: Add Satte City (幸手市) data for property 北二丁目1-8
-- Target: Add data for the attached property document
-- Version: v3.153.134
-- Date: 2025-12-18

-- Strategy:
-- 1. Add geography_risks data for Satte City
-- 2. Add detailed_address_hazards for 北二丁目 (Kita 2-chome)
-- 3. Add building_regulations based on property document (建蔽率80%, 容積率200%)

-- ===== 1. geography_risks =====
INSERT OR IGNORE INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, data_source_url,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '埼玉県', '幸手市', '北',
  0, NULL, NULL,
  1, '中川', 500, '中川流域に位置',
  0, NULL, NULL,
  3.5, 0,
  'OK', '通常融資可能',
  '幸手市都市計画情報・国土交通省ハザードマップ',
  'https://www.city.satte.lg.jp/',
  'high', 'verified', 'AI Assistant', CURRENT_TIMESTAMP
);

-- ===== 2. detailed_address_hazards =====
INSERT OR IGNORE INTO detailed_address_hazards (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, data_source_url,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '埼玉県', '幸手市', '北', '2', 1, 99, '埼玉県幸手市北二丁目1-99番地',
  0, NULL, NULL,
  1, '中川', 500, '中川流域に位置',
  0, NULL, NULL,
  3.5, 0,
  'OK', '通常融資可能(浸水深3.5m以下)',
  '幸手市都市計画情報・国土交通省ハザードマップ',
  'https://www.city.satte.lg.jp/',
  'high', 'verified', 'AI Assistant', CURRENT_TIMESTAMP
);

-- ===== 3. building_regulations =====
-- Based on property document: 建蔽率80%, 容積率200%
-- This indicates 準住居地域 or 近隣商業地域
INSERT OR IGNORE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  shadow_regulation, shadow_regulation_note,
  fire_prevention_area,
  district_plan, district_plan_note,
  local_ordinance, local_ordinance_note,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, data_source_url,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '埼玉県', '幸手市', '北', '2', 1, 99, '埼玉県幸手市北二丁目1-99番地',
  '準住居地域', '住居と商業が混在する地域',
  80, 200,
  NULL, NULL,
  0, NULL,
  '準防火地域',
  NULL, NULL,
  '幸手市建築基準法施行細則', '一般的な建築制限',
  NULL, NULL,
  0, NULL,
  '幸手市都市計画情報・物件概要書',
  'https://www.city.satte.lg.jp/',
  'high', 'verified', 'AI Assistant', CURRENT_TIMESTAMP
);

-- Verify the addition
SELECT '=== Satte City Data Addition Complete ===' as status;
SELECT 
  'geography_risks' as table_name,
  COUNT(*) as satte_city_count
FROM geography_risks
WHERE city = '幸手市'
UNION ALL
SELECT 
  'detailed_address_hazards',
  COUNT(*)
FROM detailed_address_hazards
WHERE city = '幸手市'
UNION ALL
SELECT 
  'building_regulations',
  COUNT(*)
FROM building_regulations
WHERE city = '幸手市';

-- Total count after addition
SELECT '=== Total Data Count ===' as status;
SELECT 
  COUNT(*) as total_geography_risks
FROM geography_risks
UNION ALL
SELECT 
  COUNT(*)
FROM detailed_address_hazards
UNION ALL
SELECT 
  COUNT(*)
FROM building_regulations;
