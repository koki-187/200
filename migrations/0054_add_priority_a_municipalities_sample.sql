-- Migration 0054: Add Priority A municipalities sample data
-- Target: Register representative data for major municipalities
-- Focus: 東京23区 + 主要政令指定都市
-- Version: v3.153.136
-- Date: 2025-12-18

-- ========================================
-- 品川区 (Shinagawa Ward) - Full regulation data
-- ========================================

-- Main building regulation
INSERT OR REPLACE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  shadow_regulation, shadow_regulation_note,
  fire_prevention_area,
  district_plan, district_plan_note,
  local_ordinance, local_ordinance_note,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  apartment_construction_feasible,
  apartment_parking_ratio, apartment_parking_area_per_space,
  apartment_bicycle_ratio, apartment_bicycle_area_per_space,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status
) VALUES (
  '東京都', '品川区', '', NULL, NULL, NULL,
  '東京都品川区',
  '商業地域・準工業地域混在', '用途地域により異なる',
  80, 200,
  NULL, NULL,
  1, '日影規制あり(測定高4m/6.5m、5時間-3時間)',
  '防火地域・準防火地域',
  NULL, NULL,
  '中高層建築物の建築に係る紛争の予防と調整に関する条例', '高さ10m超又は3階建以上で適用',
  '近隣説明義務', '標識設置、近隣説明会、区への届出が必要',
  1, '中高層建築条例により近隣説明義務あり',
  1,
  0.333, 12.5,
  1.0, 1.2,
  '品川区開発指導要綱', 'https://www.city.shinagawa.tokyo.jp/',
  '品川区公式サイト', 'high', 'verified'
);

-- Urban planning regulations for Shinagawa
INSERT INTO urban_planning_regulations (
  building_regulation_id,
  height_district, max_height_m, max_floors,
  shadow_regulation_area, shadow_measurement_height, shadow_time_requirement,
  min_site_area, wall_setback,
  landscape_plan_area, landscape_notification_required,
  green_coverage_ratio
) SELECT 
  id, 
  '第2種高度地区（一部第3種）', NULL, NULL,
  '商業地域・準工業地域', 4.0, '5時間-3時間',
  NULL, 0.5,
  '品川区景観計画区域', 1,
  10.0
FROM building_regulations WHERE prefecture='東京都' AND city='品川区' AND district='';

-- Site & road requirements for Shinagawa
INSERT INTO site_road_requirements (
  building_regulation_id,
  road_frontage_requirement, road_type,
  setback_requirement, road_widening_required,
  fire_access_space_required,
  water_supply_condition, sewerage_condition,
  rainwater_infiltration_required
) SELECT 
  id,
  2.0, '42条1項道路',
  0.0, 0,
  1,
  '東京都水道局供給区域', '品川区公共下水道',
  1
FROM building_regulations WHERE prefecture='東京都' AND city='品川区' AND district='';

-- Building design requirements for Shinagawa
INSERT INTO building_design_requirements (
  building_regulation_id,
  staircase_count_min, ceiling_height_min,
  waste_storage_required, waste_storage_area_per_unit,
  manager_room_required, manager_room_threshold,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required, signboard_period_days,
  privacy_consideration_required,
  emergency_contact_board_required,
  min_unit_area,
  security_equipment_required
) SELECT 
  id,
  2, 2.1,
  1, 0.5,
  1, 30,
  1, 1,
  1, 14,
  1,
  1,
  16.0,
  1
FROM building_regulations WHERE prefecture='東京都' AND city='品川区' AND district='';

-- ========================================
-- 川崎市 (Kawasaki City) - Comprehensive guideline example
-- ========================================

INSERT OR REPLACE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible,
  apartment_parking_ratio, apartment_parking_area_per_space,
  apartment_bicycle_ratio, apartment_bicycle_area_per_space,
  development_guideline, development_guideline_url,
  data_source, confidence_level
) VALUES (
  '神奈川県', '川崎市', '', NULL, NULL, NULL,
  '神奈川県川崎市',
  '住居地域・商業地域混在', 60, 200,
  1,
  0.5, 12.5,
  1.0, 2.0,
  '川崎市ワンルーム形式集合建築物に関する指導要綱', 'https://www.city.kawasaki.jp/',
  '川崎市公式サイト', 'high'
);

INSERT INTO building_design_requirements (
  building_regulation_id,
  ceiling_height_min,
  waste_storage_required, waste_storage_area_per_unit,
  manager_room_required, manager_room_threshold,
  neighbor_explanation_required,
  emergency_contact_board_required,
  min_unit_area,
  delivery_box_required,
  security_equipment_required
) SELECT 
  id,
  2.3,
  1, 0.8,
  1, 30,
  1,
  1,
  16.0,
  1,
  1
FROM building_regulations WHERE prefecture='神奈川県' AND city='川崎市' AND district='';

-- ========================================
-- 相模原市 (Sagamihara City) - Studio apartment regulations
-- ========================================

INSERT OR REPLACE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible,
  apartment_parking_ratio, apartment_parking_area_per_space,
  apartment_bicycle_ratio,
  development_guideline, development_guideline_url,
  data_source, confidence_level
) VALUES (
  '神奈川県', '相模原市', '', NULL, NULL, NULL,
  '神奈川県相模原市',
  '住居地域', 60, 200,
  1,
  0.5, 12.5,
  1.0,
  '相模原市ワンルーム形式建築物に関する指導要綱', 'https://www.city.sagamihara.kanagawa.jp/',
  '相模原市公式サイト', 'high'
);

INSERT INTO building_design_requirements (
  building_regulation_id,
  waste_storage_required,
  manager_room_required, manager_room_threshold,
  min_unit_area,
  studio_definition
) SELECT 
  id,
  1,
  1, 21,
  16.0,
  '専用面積25㎡未満の住戸'
FROM building_regulations WHERE prefecture='神奈川県' AND city='相模原市' AND district='';

-- ========================================
-- 千代田区 (Chiyoda Ward) - Strict regulations
-- ========================================

INSERT OR REPLACE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  apartment_parking_ratio, apartment_bicycle_ratio,
  development_guideline, development_guideline_url,
  data_source, confidence_level
) VALUES (
  '東京都', '千代田区', '', NULL, NULL, NULL,
  '東京都千代田区',
  '商業地域', 80, 600,
  0, 'ワンルームマンション等指導要綱により厳格な基準あり',
  1.0, 1.0,
  '千代田区ワンルームマンション等建築物に関する指導要綱', 'https://www.city.chiyoda.lg.jp/',
  '千代田区公式サイト', 'high'
);

INSERT INTO building_design_requirements (
  building_regulation_id,
  manager_room_required, manager_room_threshold,
  neighbor_explanation_required, pre_consultation_required,
  min_unit_area,
  studio_definition,
  studio_ratio_threshold
) SELECT 
  id,
  1, 15,
  1, 1,
  25.0,
  '専用面積40㎡未満の住戸',
  0.33
FROM building_regulations WHERE prefecture='東京都' AND city='千代田区' AND district='';

-- ========================================
-- さいたま市 (Saitama City) - Saitama Prefecture capital
-- ========================================

INSERT OR REPLACE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible,
  apartment_parking_ratio, apartment_bicycle_ratio,
  development_guideline,
  data_source, confidence_level
) VALUES (
  '埼玉県', 'さいたま市', '', NULL, NULL, NULL,
  '埼玉県さいたま市',
  '住居地域・商業地域混在', 60, 200,
  1,
  0.5, 1.0,
  'さいたま市開発行為等指導要綱',
  'さいたま市公式サイト', 'high'
);

-- ========================================
-- 千葉市 (Chiba City) - Chiba Prefecture capital
-- ========================================

INSERT OR REPLACE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible,
  apartment_parking_ratio, apartment_bicycle_ratio,
  development_guideline,
  data_source, confidence_level
) VALUES (
  '千葉県', '千葉市', '', NULL, NULL, NULL,
  '千葉県千葉市',
  '住居地域・商業地域混在', 60, 200,
  1,
  0.5, 1.0,
  '千葉市開発行為等指導要綱',
  '千葉市公式サイト', 'high'
);

-- Verify insertions
SELECT 'Priority A municipalities sample data registered' as status;

SELECT prefecture, city, COUNT(*) as regulation_count
FROM building_regulations
GROUP BY prefecture, city
ORDER BY prefecture, city;
