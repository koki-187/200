-- Migration 0051: Update Satte City apartment construction restrictions
-- Target: Add development guideline data for Satte City and major municipalities
-- Version: v3.153.135
-- Date: 2025-12-18

-- Strategy:
-- 1. Update Satte City data with apartment construction restrictions
-- 2. Add development guideline data for major municipalities in 1 capital + 3 prefectures

-- ===== 1. Update Satte City (幸手市) =====
UPDATE building_regulations
SET 
  apartment_restrictions = '開発行為等指導要綱による駐車場・駐輪場規制',
  apartment_restrictions_note = '集合住宅:駐車場0.5台/戸、駐輪場1台/戸。駐車場面積12.5㎡/台、駐輪場面積1.2㎡/台が必要',
  
  -- Parking requirements (幸手市開発行為等指導要綱 第16条)
  apartment_parking_ratio = 0.5,  -- 1/2 (計画戸数の半分)
  apartment_parking_area_per_space = 12.5,  -- 12.5㎡ (5m × 2.5m)
  apartment_parking_note = '開発行為等指導要綱第16条:集合住宅は計画戸数の1/2の駐車場が必要',
  
  -- Bicycle parking requirements
  apartment_bicycle_ratio = 1.0,  -- 1/1 (計画戸数と同数)
  apartment_bicycle_area_per_space = 1.2,  -- 1.2㎡ (0.6m × 2.0m)
  apartment_bicycle_note = '開発行為等指導要綱第16条:集合住宅は計画戸数の1/1の駐輪場が必要',
  
  -- Apartment construction feasibility
  apartment_construction_feasible = 0,  -- Not feasible
  apartment_infeasibility_reason = '駐車場・駐輪場面積要件により、標準的な敷地ではアパート建設が困難。必要駐車場面積(0.5台/戸×12.5㎡)と駐輪場面積(1台/戸×1.2㎡)の合計が大きく、採算が合わない',
  
  -- Development guideline information
  development_guideline = '幸手市開発行為等指導要綱',
  development_guideline_url = 'https://www.city.satte.lg.jp/',
  
  -- Update metadata
  last_updated = CURRENT_TIMESTAMP,
  verified_at = CURRENT_TIMESTAMP
WHERE city = '幸手市' AND district = '北';

-- ===== 2. Add apartment restrictions data for major municipalities =====

-- Tokyo (東京) - Add restrictions for existing building_regulations records
UPDATE building_regulations
SET 
  apartment_parking_ratio = 0.5,
  apartment_parking_area_per_space = 15.0,
  apartment_bicycle_ratio = 1.0,
  apartment_bicycle_area_per_space = 1.5,
  apartment_construction_feasible = 1,  -- Generally feasible
  development_guideline = '東京都駐車場条例・各区市駐車場附置義務条例',
  last_updated = CURRENT_TIMESTAMP
WHERE prefecture = '東京都' 
  AND apartment_parking_ratio IS NULL
  AND zoning_type NOT LIKE '%低層%';  -- Exclude low-rise exclusive residential zones

-- Kanagawa (神奈川) - Add restrictions
UPDATE building_regulations
SET 
  apartment_parking_ratio = 0.5,
  apartment_parking_area_per_space = 15.0,
  apartment_bicycle_ratio = 1.0,
  apartment_bicycle_area_per_space = 1.5,
  apartment_construction_feasible = 1,
  development_guideline = '神奈川県・各市駐車場条例',
  last_updated = CURRENT_TIMESTAMP
WHERE prefecture = '神奈川県' 
  AND apartment_parking_ratio IS NULL
  AND zoning_type NOT LIKE '%低層%';

-- Saitama (埼玉) - Add restrictions for other cities
UPDATE building_regulations
SET 
  apartment_parking_ratio = 0.5,
  apartment_parking_area_per_space = 15.0,
  apartment_bicycle_ratio = 1.0,
  apartment_bicycle_area_per_space = 1.5,
  apartment_construction_feasible = 1,
  development_guideline = '埼玉県・各市開発指導要綱',
  last_updated = CURRENT_TIMESTAMP
WHERE prefecture = '埼玉県' 
  AND city != '幸手市'
  AND apartment_parking_ratio IS NULL;

-- Chiba (千葉) - Add restrictions
UPDATE building_regulations
SET 
  apartment_parking_ratio = 0.5,
  apartment_parking_area_per_space = 15.0,
  apartment_bicycle_ratio = 1.0,
  apartment_bicycle_area_per_space = 1.5,
  apartment_construction_feasible = 1,
  development_guideline = '千葉県・各市開発指導要綱',
  last_updated = CURRENT_TIMESTAMP
WHERE prefecture = '千葉県' 
  AND apartment_parking_ratio IS NULL;

-- Low-rise exclusive residential zones - Generally more restrictive
UPDATE building_regulations
SET 
  apartment_parking_ratio = 1.0,  -- More strict: 1 space per unit
  apartment_parking_area_per_space = 15.0,
  apartment_bicycle_ratio = 1.0,
  apartment_bicycle_area_per_space = 1.5,
  apartment_construction_feasible = 0,  -- Often not feasible due to land constraints
  apartment_infeasibility_reason = '第一種低層住居専用地域では駐車場要件(1台/戸)により、小規模敷地でのアパート建設が困難',
  development_guideline = '各自治体建築条例・地区計画',
  last_updated = CURRENT_TIMESTAMP
WHERE zoning_type LIKE '%低層%' 
  AND apartment_parking_ratio IS NULL;

-- Verify the updates
SELECT '=== Apartment Restrictions Update Complete ===' as status;

SELECT 
  prefecture,
  city,
  COUNT(*) as updated_count,
  SUM(CASE WHEN apartment_construction_feasible = 0 THEN 1 ELSE 0 END) as infeasible_count
FROM building_regulations
WHERE apartment_parking_ratio IS NOT NULL
GROUP BY prefecture, city
ORDER BY prefecture, city;

-- Show Satte City specific data
SELECT '=== Satte City Apartment Restrictions Detail ===' as status;

SELECT 
  prefecture,
  city,
  district,
  zoning_type,
  apartment_parking_ratio,
  apartment_parking_area_per_space,
  apartment_bicycle_ratio,
  apartment_bicycle_area_per_space,
  apartment_construction_feasible,
  apartment_infeasibility_reason,
  development_guideline
FROM building_regulations
WHERE city = '幸手市';
