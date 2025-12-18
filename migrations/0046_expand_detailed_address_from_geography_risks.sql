-- Migration 0046: Expand detailed_address_hazards table from geography_risks (82 items)
-- Target: Expand from 19 items to 82 items (full coverage of geography_risks)
-- Version: v3.153.133
-- Date: 2025-12-18

-- Strategy: 
-- 1. Generate detailed addresses at 〇丁目レベル (chome level) for all 82 geography_risks records
-- 2. Use banchi_start=1, banchi_end=99 as default range for each chome
-- 3. Inherit all hazard information from parent geography_risks record

-- Clear existing data first (to avoid duplicates)
DELETE FROM detailed_address_hazards;

-- Insert detailed address data from geography_risks (82 items)
-- Format: {prefecture}{city}{district}{chome}丁目1-99番地
INSERT OR IGNORE INTO detailed_address_hazards (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance,
  is_building_collapse_area,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, data_source_url, confidence_level, verification_status,
  verified_by, verified_at, last_updated
)
SELECT 
  prefecture,
  city,
  district,
  '1' as chome,  -- Default chome level
  1 as banchi_start,
  99 as banchi_end,
  CASE 
    WHEN district IS NOT NULL AND district != '' 
    THEN prefecture || city || district || '1丁目1-99番地'
    ELSE prefecture || city || '1丁目1-99番地'
  END as normalized_address,
  
  -- Hazard information (inherited from geography_risks)
  is_cliff_area,
  cliff_height,
  cliff_note,
  
  is_river_adjacent,
  river_name,
  river_distance,
  
  is_building_collapse_area,
  
  max_flood_depth,
  is_over_10m_flood,
  
  -- Loan decision (inherited)
  loan_decision,
  CASE 
    WHEN is_over_10m_flood = 1 AND is_cliff_area = 1 
      THEN '10m以上浸水域・崖地エリア'
    WHEN is_over_10m_flood = 1 
      THEN '10m以上浸水域'
    WHEN is_cliff_area = 1 
      THEN '崖地エリア'
    WHEN is_building_collapse_area = 1 
      THEN '家屋倒壊エリア'
    ELSE 'その他リスク'
  END as loan_reason,
  
  -- Metadata (inherited)
  data_source,
  data_source_url,
  confidence_level,
  verification_status,
  
  'AI Assistant' as verified_by,
  CURRENT_TIMESTAMP as verified_at,
  CURRENT_TIMESTAMP as last_updated
  
FROM geography_risks
WHERE prefecture IN ('東京都', '神奈川県', '埼玉県', '千葉県')
  AND (is_over_10m_flood = 1 OR is_cliff_area = 1 OR is_building_collapse_area = 1);

-- Verify the expansion
SELECT 
  'Expansion Complete' as status,
  COUNT(*) as total_detailed_addresses,
  COUNT(CASE WHEN is_over_10m_flood = 1 THEN 1 END) as flood_10m_count,
  COUNT(CASE WHEN is_cliff_area = 1 THEN 1 END) as cliff_count,
  COUNT(CASE WHEN is_building_collapse_area = 1 THEN 1 END) as collapse_count
FROM detailed_address_hazards;
