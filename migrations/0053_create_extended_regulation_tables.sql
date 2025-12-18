-- Migration 0053: Create extended regulation tables (normalized schema)
-- Target: Support ALL regulation points without hitting SQLite column limit
-- Strategy: Split into multiple related tables with foreign keys
-- Version: v3.153.136
-- Date: 2025-12-18

-- ========================================
-- 1. Urban Planning & Zoning Extensions
-- ========================================
CREATE TABLE IF NOT EXISTS urban_planning_regulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_regulation_id INTEGER NOT NULL,
  
  -- 高度地区・高さ制限
  height_district TEXT,
  max_height_m REAL,
  max_floors INTEGER,
  
  -- 日影規制
  shadow_regulation_area TEXT,
  shadow_measurement_height REAL,
  shadow_time_requirement TEXT,
  
  -- 地区計画詳細
  district_plan_detail TEXT,
  min_site_area REAL,
  wall_setback REAL,
  building_color_restriction TEXT,
  
  -- 景観計画
  landscape_plan_area TEXT,
  landscape_notification_required INTEGER DEFAULT 0,
  landscape_restrictions TEXT,
  
  -- 風致地区・緑化
  scenic_district TEXT,
  green_coverage_ratio REAL,
  tree_preservation_required INTEGER DEFAULT 0,
  
  -- 航空法・文化財
  aviation_height_limit REAL,
  cultural_property_area INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (building_regulation_id) REFERENCES building_regulations(id)
);

-- ========================================
-- 2. Site & Road Requirements
-- ========================================
CREATE TABLE IF NOT EXISTS site_road_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_regulation_id INTEGER NOT NULL,
  
  -- 接道義務
  road_frontage_requirement REAL,
  road_type TEXT,
  setback_requirement REAL,
  road_widening_required INTEGER DEFAULT 0,
  
  -- 消防活動空地
  fire_access_space_required INTEGER DEFAULT 0,
  fire_access_space_area REAL,
  
  -- 水道・下水道
  water_supply_condition TEXT,
  sewerage_condition TEXT,
  
  -- 雨水排水・浸透
  rainwater_infiltration_required INTEGER DEFAULT 0,
  rainwater_storage_required INTEGER DEFAULT 0,
  rainwater_storage_volume REAL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (building_regulation_id) REFERENCES building_regulations(id)
);

-- ========================================
-- 3. Building Design Requirements (共同住宅上乗せ)
-- ========================================
CREATE TABLE IF NOT EXISTS building_design_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_regulation_id INTEGER NOT NULL,
  
  -- 階段要件
  staircase_requirement TEXT,
  staircase_count_min INTEGER,
  outdoor_staircase_allowed INTEGER DEFAULT 1,
  
  -- 採光・換気・天井高
  lighting_requirement TEXT,
  ventilation_requirement TEXT,
  ceiling_height_min REAL DEFAULT 2.1,
  
  -- 界壁・遮音
  sound_insulation_requirement TEXT,
  partition_wall_requirement TEXT,
  
  -- ごみ置場
  waste_storage_required INTEGER DEFAULT 1,
  waste_storage_area_per_unit REAL,
  waste_storage_location TEXT,
  waste_separation_required INTEGER DEFAULT 1,
  
  -- 管理人室・管理体制
  manager_room_required INTEGER DEFAULT 0,
  manager_room_threshold INTEGER,
  management_system_required TEXT,
  
  -- 近隣説明・事前協議
  neighbor_explanation_required INTEGER DEFAULT 0,
  pre_consultation_required INTEGER DEFAULT 0,
  signboard_required INTEGER DEFAULT 0,
  signboard_period_days INTEGER,
  
  -- プライバシー配慮
  privacy_consideration_required INTEGER DEFAULT 0,
  privacy_measure_detail TEXT,
  
  -- 緊急連絡先表示板
  emergency_contact_board_required INTEGER DEFAULT 0,
  
  -- 自治会加入案内
  community_participation_guidance INTEGER DEFAULT 0,
  
  -- 住戸面積最低基準
  min_unit_area REAL,
  
  -- 宅配ボックス
  delivery_box_required INTEGER DEFAULT 0,
  delivery_box_ratio REAL,
  
  -- 防犯設備
  security_equipment_required INTEGER DEFAULT 0,
  auto_lock_required INTEGER DEFAULT 0,
  security_camera_required INTEGER DEFAULT 0,
  
  -- ワンルーム形式定義
  studio_definition TEXT,
  studio_ratio_threshold REAL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (building_regulation_id) REFERENCES building_regulations(id)
);

-- ========================================
-- 4. Development & Ground Requirements
-- ========================================
CREATE TABLE IF NOT EXISTS development_ground_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_regulation_id INTEGER NOT NULL,
  
  -- 開発許可
  development_permit_required INTEGER DEFAULT 0,
  development_permit_threshold REAL,
  
  -- 盛土・切土・擁壁
  embankment_regulation_area INTEGER DEFAULT 0,
  embankment_permit_required INTEGER DEFAULT 0,
  retaining_wall_standard TEXT,
  
  -- がけ条例
  cliff_ordinance_applicable INTEGER DEFAULT 0,
  cliff_setback_distance REAL,
  
  -- 土砂災害警戒区域
  sediment_disaster_area INTEGER DEFAULT 0,
  sediment_disaster_countermeasure TEXT,
  
  -- 液状化・浸水想定
  liquefaction_risk_area INTEGER DEFAULT 0,
  flood_countermeasure_required INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (building_regulation_id) REFERENCES building_regulations(id)
);

-- ========================================
-- 5. Construction & Environmental Regulations
-- ========================================
CREATE TABLE IF NOT EXISTS construction_environmental_regulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_regulation_id INTEGER NOT NULL,
  
  -- 工事車両動線・時間
  construction_vehicle_route_designation INTEGER DEFAULT 0,
  construction_time_restriction TEXT,
  
  -- 騒音・振動
  noise_regulation TEXT,
  vibration_regulation TEXT,
  
  -- 建設廃棄物
  construction_waste_management_required INTEGER DEFAULT 1,
  
  -- 雨水濁水対策
  muddy_water_countermeasure_required INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (building_regulation_id) REFERENCES building_regulations(id)
);

-- ========================================
-- 6. Local Specific Requirements
-- ========================================
CREATE TABLE IF NOT EXISTS local_specific_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_regulation_id INTEGER NOT NULL,
  
  -- ペット・民泊・用途制限
  pet_restriction TEXT,
  minpaku_restriction TEXT,
  
  -- 広告物条例
  outdoor_ad_regulation TEXT,
  
  -- 適用開始日
  regulation_start_date DATE,
  
  -- 条例・要綱の種類フラグ
  has_building_standards_act INTEGER DEFAULT 1,
  has_prefecture_ordinance INTEGER DEFAULT 0,
  has_municipal_ordinance INTEGER DEFAULT 0,
  has_development_guideline INTEGER DEFAULT 0,
  
  -- 更新履歴
  regulation_version TEXT,
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (building_regulation_id) REFERENCES building_regulations(id)
);

-- ========================================
-- Create indexes for performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_urban_planning_building_reg_id ON urban_planning_regulations(building_regulation_id);
CREATE INDEX IF NOT EXISTS idx_site_road_building_reg_id ON site_road_requirements(building_regulation_id);
CREATE INDEX IF NOT EXISTS idx_building_design_building_reg_id ON building_design_requirements(building_regulation_id);
CREATE INDEX IF NOT EXISTS idx_development_ground_building_reg_id ON development_ground_requirements(building_regulation_id);
CREATE INDEX IF NOT EXISTS idx_construction_env_building_reg_id ON construction_environmental_regulations(building_regulation_id);
CREATE INDEX IF NOT EXISTS idx_local_specific_building_reg_id ON local_specific_requirements(building_regulation_id);

-- Verify tables created
SELECT 'Extended regulation tables created successfully' as status;

-- Show all regulation-related tables
SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%regulation%' OR name LIKE '%requirement%') ORDER BY name;
