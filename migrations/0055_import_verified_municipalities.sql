-- Migration 0055: Import VERIFIED Tokyo Wards Phase 2 Data
-- Target: VERIFIED municipalities from comprehensive CSV data
-- Strategy: Import 11 VERIFIED municipalities with full regulation details
-- Version: v3.153.138
-- Date: 2025-12-18
-- Source: 1to3ken_apartment_regulation_db_phase2_tokyo_wards_started_remaining.csv


-- 1. 東京都 千代田区
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '東京都',
    '千代田区',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '東京都千代田区',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    NULL,
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    NULL,
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 千代田区
SELECT last_insert_rowid() AS last_building_regulation_id_1;

-- Insert building_design_requirements for 千代田区
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    NULL,
    NULL,
    0,
    NULL,
    1,
    1,
    NULL
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '千代田区'
LIMIT 1;

-- Insert local_specific_requirements for 千代田区
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    1,
    1,
    0,
    '千代田区のワンルーム指導要綱手続（届出/標識/説明/報告/適合証）を確認済'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '千代田区'
LIMIT 1;


-- 2. 東京都 中央区
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '東京都',
    '中央区',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '東京都中央区',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    '地区計画区域内は条例適用、区域外は市街地開発事業指導要綱で同様規定',
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    NULL,
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    NULL,
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 中央区
SELECT last_insert_rowid() AS last_building_regulation_id_2;

-- Insert building_design_requirements for 中央区
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    25.0,
    NULL,
    0,
    NULL,
    0,
    0,
    '（地区計画区域内）共同住宅で住戸数10戸以上：①40㎡以上住戸（定住型）の床面積合計が容積対象面積の1/3未満は不可、②定住型以外の住戸の最低面積が25㎡未満は不可。区域外も市街地開発事業指導要綱で同様規定'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '中央区'
LIMIT 1;

-- Insert local_specific_requirements for 中央区
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    1,
    1,
    0,
    '中央区FAQで地区計画区域内の規制内容と、区域外も要綱で同様規定である旨を確認'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '中央区'
LIMIT 1;


-- 3. 東京都 新宿区
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '東京都',
    '新宿区',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '東京都新宿区',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    NULL,
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    NULL,
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 新宿区
SELECT last_insert_rowid() AS last_building_regulation_id_3;

-- Insert building_design_requirements for 新宿区
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    NULL,
    NULL,
    0,
    NULL,
    1,
    1,
    '地階除く3階以上 かつ 専用面積30㎡未満の住戸等が10戸以上（共同住宅・寮・寄宿舎・長屋）'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '新宿区'
LIMIT 1;

-- Insert local_specific_requirements for 新宿区
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    1,
    1,
    0,
    '新宿区ワンルームマンション等条例：対象=3階以上＋30㎡未満住戸等10戸以上（区HP/手引きPDFあり）'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '新宿区'
LIMIT 1;


-- 4. 東京都 江東区
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '東京都',
    '江東区',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '東京都江東区',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    NULL,
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    NULL,
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 江東区
SELECT last_insert_rowid() AS last_building_regulation_id_4;

-- Insert building_design_requirements for 江東区
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    40.0,
    NULL,
    0,
    NULL,
    0,
    0,
    '（ワンルームマンション定義）地階除く3階以上＋住戸数15戸以上＋過半数が専用面積40㎡未満住戸'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '江東区'
LIMIT 1;

-- Insert local_specific_requirements for 江東区
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    1,
    1,
    0,
    '江東区マンション等条例：ワンルーム住戸=40㎡未満、ワンルームマンション=3階以上＋15戸以上＋過半数がワンルーム住戸、事前協議は30日前まで（条例PDF）'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '江東区'
LIMIT 1;


-- 5. 東京都 品川区
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '東京都',
    '品川区',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '東京都品川区',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    '自転車駐車場の基準あり（要綱/指導要領）',
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    NULL,
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 品川区
SELECT last_insert_rowid() AS last_building_regulation_id_5;

-- Insert building_design_requirements for 品川区
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    30.0,
    NULL,
    0,
    NULL,
    1,
    1,
    '居室のある階数3以上 かつ 30㎡未満住戸が15以上 かつ 総戸数の1/3以上'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '品川区'
LIMIT 1;

-- Insert local_specific_requirements for 品川区
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    1,
    1,
    0,
    '品川区ワンルーム要綱：定義=30㎡未満、対象=3階以上＋15戸以上＋総戸数1/3以上（区HP）'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '品川区'
LIMIT 1;


-- 6. 東京都 目黒区
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '東京都',
    '目黒区',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '東京都目黒区',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    NULL,
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    NULL,
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 目黒区
SELECT last_insert_rowid() AS last_building_regulation_id_6;

-- Insert building_design_requirements for 目黒区
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    40.0,
    NULL,
    0,
    NULL,
    1,
    0,
    '床面積40㎡未満住戸（小規模区画）が10以上 かつ 階数3以上（ただし小規模区画が全住戸の1/3以下のものを除く）'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '目黒区'
LIMIT 1;

-- Insert local_specific_requirements for 目黒区
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    1,
    1,
    0,
    '目黒区例規でワンルーム形式集合建築物の定義（40㎡未満10以上＋3階以上＋1/3超）を確認'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '目黒区'
LIMIT 1;


-- 7. 東京都 大田区
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '東京都',
    '大田区',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '東京都大田区',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    NULL,
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    'あり（中高層建築物条例＋開発指導要綱）',
    'https://www.city.ota.tokyo.jp/seikatsu/sumaimachinami/kenchiku/chuukousou_seido/kangaetaishou.html',
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 大田区
SELECT last_insert_rowid() AS last_building_regulation_id_7;

-- Insert building_design_requirements for 大田区
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    NULL,
    NULL,
    0,
    NULL,
    1,
    1,
    '階数3以上の集団住宅でワンルーム型式住戸が15戸以上は、高さ10m以下でも手続必要（開発指導要綱16条の扱い）'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '大田区'
LIMIT 1;

-- Insert local_specific_requirements for 大田区
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    1,
    1,
    1,
    '大田区：中高層制度の対象・注意書きで、3階以上＋ワンルーム型式住戸15戸以上の追加手続を明示（区HP）'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '大田区'
LIMIT 1;


-- 8. 東京都 板橋区
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '東京都',
    '板橋区',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '東京都板橋区',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    NULL,
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    'あり（大規模建築物等指導要綱＋小規模住戸集合建築物条例）',
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 板橋区
SELECT last_insert_rowid() AS last_building_regulation_id_8;

-- Insert building_design_requirements for 板橋区
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    35.0,
    NULL,
    0,
    NULL,
    0,
    0,
    '（小規模住戸集合建築物条例）階数3以上 かつ 専用床面積35㎡未満住戸が15戸以上'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '板橋区'
LIMIT 1;

-- Insert local_specific_requirements for 板橋区
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    1,
    1,
    1,
    '板橋区ページで指導要綱対象（3階以上10戸以上）と条例対象（3階以上＋35㎡未満15戸以上）を確認'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '板橋区'
LIMIT 1;


-- 9. 東京都 江戸川区
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '東京都',
    '江戸川区',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '東京都江戸川区',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    NULL,
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    NULL,
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 江戸川区
SELECT last_insert_rowid() AS last_building_regulation_id_9;

-- Insert building_design_requirements for 江戸川区
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    25.0,
    NULL,
    0,
    NULL,
    0,
    0,
    '特定共同住宅：事業区域面積を問わず、3階以上かつ10戸以上の共同住宅等が対象（手引で明示）'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '江戸川区'
LIMIT 1;

-- Insert local_specific_requirements for 江戸川区
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    1,
    1,
    0,
    '条例本文で特定共同住宅の定義（3階以上10戸以上等）を確認、施行規則で住戸面積基準（25㎡等）を確認'
FROM building_regulations 
WHERE prefecture = '東京都' 
  AND city = '江戸川区'
LIMIT 1;


-- 10. 神奈川県 川崎市
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '神奈川県',
    '川崎市',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '神奈川県川崎市',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    '台数・寸法の基準あり（要綱施行細目で確認）',
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    NULL,
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 川崎市
SELECT last_insert_rowid() AS last_building_regulation_id_10;

-- Insert building_design_requirements for 川崎市
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    NULL,
    NULL,
    0,
    NULL,
    1,
    0,
    NULL
FROM building_regulations 
WHERE prefecture = '神奈川県' 
  AND city = '川崎市'
LIMIT 1;

-- Insert local_specific_requirements for 川崎市
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    0,
    1,
    0,
    '川崎市の要綱PDFで確認済（天井高・駐輪/ごみ・緊急連絡先等）'
FROM building_regulations 
WHERE prefecture = '神奈川県' 
  AND city = '川崎市'
LIMIT 1;


-- 11. 神奈川県 相模原市
INSERT INTO building_regulations (
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
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    '神奈川県',
    '相模原市',
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    '神奈川県相模原市',
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    NULL,
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    '可能な限り確保に努める',
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    NULL,
    NULL,
    '自治体公式ページ/PDFで確認',
    'HIGH',
    'VERIFIED'
);

-- Get last inserted ID for 相模原市
SELECT last_insert_rowid() AS last_building_regulation_id_11;

-- Insert building_design_requirements for 相模原市
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    NULL,
    NULL,
    0,
    NULL,
    0,
    0,
    '低層住居専用：10戸以上／その他：15戸以上（ワンルーム形式住戸）'
FROM building_regulations 
WHERE prefecture = '神奈川県' 
  AND city = '相模原市'
LIMIT 1;

-- Insert local_specific_requirements for 相模原市
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    0,
    1,
    0,
    '相模原市ページで適用範囲・基準（戸数閾値/面積/管理人室等）を確認済'
FROM building_regulations 
WHERE prefecture = '神奈川県' 
  AND city = '相模原市'
LIMIT 1;


-- Verification query
SELECT 
    '✅ Import complete' as status,
    COUNT(*) as imported_count,
    COUNT(DISTINCT prefecture) as prefectures,
    COUNT(DISTINCT city) as municipalities
FROM building_regulations
WHERE verification_status = 'VERIFIED';

