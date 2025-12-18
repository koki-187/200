-- Migration 0052: Expand building_regulations table for comprehensive regulation coverage
-- Target: Support ALL regulation points for 1 capital + 3 prefectures (212 municipalities)
-- Version: v3.153.136
-- Date: 2025-12-18

-- ========================================
-- Ⅰ. 都市計画・用途・ボリューム（集団規定＋ローカル上乗せ）
-- ========================================

-- 高度地区・高さ最高限度
ALTER TABLE building_regulations ADD COLUMN height_district TEXT;  -- 高度地区種別
ALTER TABLE building_regulations ADD COLUMN max_height_m REAL;  -- 最高高さ(m)
ALTER TABLE building_regulations ADD COLUMN max_floors INTEGER;  -- 最高階数

-- 日影規制
ALTER TABLE building_regulations ADD COLUMN shadow_regulation_area TEXT;  -- 日影規制対象区域
ALTER TABLE building_regulations ADD COLUMN shadow_measurement_height REAL;  -- 測定面の高さ(m)
ALTER TABLE building_regulations ADD COLUMN shadow_time_requirement TEXT;  -- 日影時間要件

-- 地区計画
ALTER TABLE building_regulations ADD COLUMN district_plan_detail TEXT;  -- 地区計画詳細
ALTER TABLE building_regulations ADD COLUMN min_site_area REAL;  -- 最低敷地面積(㎡)
ALTER TABLE building_regulations ADD COLUMN wall_setback REAL;  -- 壁面後退距離(m)
ALTER TABLE building_regulations ADD COLUMN building_color_restriction TEXT;  -- 色彩制限

-- 景観計画
ALTER TABLE building_regulations ADD COLUMN landscape_plan_area TEXT;  -- 景観計画区域
ALTER TABLE building_regulations ADD COLUMN landscape_届出_required INTEGER DEFAULT 0;  -- 景観届出要否
ALTER TABLE building_regulations ADD COLUMN landscape_restrictions TEXT;  -- 景観制限内容

-- 風致地区・緑地保全
ALTER TABLE building_regulations ADD COLUMN scenic_district TEXT;  -- 風致地区種別
ALTER TABLE building_regulations ADD COLUMN green_coverage_ratio REAL;  -- 緑化率要件(%)
ALTER TABLE building_regulations ADD COLUMN tree_preservation_required INTEGER DEFAULT 0;  -- 樹木保存要否

-- 航空法・文化財
ALTER TABLE building_regulations ADD COLUMN aviation_height_limit REAL;  -- 航空法高さ制限(m)
ALTER TABLE building_regulations ADD COLUMN cultural_property_area INTEGER DEFAULT 0;  -- 埋蔵文化財包蔵地フラグ

-- ========================================
-- Ⅱ. 敷地・道路・接道
-- ========================================

-- 接道義務
ALTER TABLE building_regulations ADD COLUMN road_frontage_requirement REAL;  -- 接道義務(m)
ALTER TABLE building_regulations ADD COLUMN road_type TEXT;  -- 道路種別(42条1項/2項等)
ALTER TABLE building_regulations ADD COLUMN setback_requirement REAL;  -- セットバック要件(m)
ALTER TABLE building_regulations ADD COLUMN road_widening_required INTEGER DEFAULT 0;  -- 道路拡幅要否

-- 消防活動空地
ALTER TABLE building_regulations ADD COLUMN fire_access_space_required INTEGER DEFAULT 0;  -- 消防活動空地要否
ALTER TABLE building_regulations ADD COLUMN fire_access_space_area REAL;  -- 消防活動空地面積(㎡)

-- 水道・下水道
ALTER TABLE building_regulations ADD COLUMN water_supply_condition TEXT;  -- 上水道接続条件
ALTER TABLE building_regulations ADD COLUMN sewerage_condition TEXT;  -- 下水道接続条件

-- 雨水排水・浸透
ALTER TABLE building_regulations ADD COLUMN rainwater_infiltration_required INTEGER DEFAULT 0;  -- 雨水浸透要否
ALTER TABLE building_regulations ADD COLUMN rainwater_storage_required INTEGER DEFAULT 0;  -- 雨水貯留要否
ALTER TABLE building_regulations ADD COLUMN rainwater_storage_volume REAL;  -- 雨水貯留容量(㎥)

-- ========================================
-- Ⅲ. 建物計画（共同住宅で自治体差が出る"上乗せ"）
-- ========================================

-- 階段要件
ALTER TABLE building_regulations ADD COLUMN staircase_requirement TEXT;  -- 直通階段要件
ALTER TABLE building_regulations ADD COLUMN staircase_count_min INTEGER;  -- 最小階段数
ALTER TABLE building_regulations ADD COLUMN outdoor_staircase_allowed INTEGER DEFAULT 1;  -- 屋外階段可否

-- 採光・換気
ALTER TABLE building_regulations ADD COLUMN lighting_requirement TEXT;  -- 採光要件
ALTER TABLE building_regulations ADD COLUMN ventilation_requirement TEXT;  -- 換気要件
ALTER TABLE building_regulations ADD COLUMN ceiling_height_min REAL DEFAULT 2.1;  -- 最低天井高(m)

-- 界壁・遮音
ALTER TABLE building_regulations ADD COLUMN sound_insulation_requirement TEXT;  -- 遮音要件
ALTER TABLE building_regulations ADD COLUMN partition_wall_requirement TEXT;  -- 界壁要件

-- ごみ置場
ALTER TABLE building_regulations ADD COLUMN waste_storage_required INTEGER DEFAULT 1;  -- ごみ置場設置要否
ALTER TABLE building_regulations ADD COLUMN waste_storage_area_per_unit REAL;  -- ごみ置場面積/戸(㎡)
ALTER TABLE building_regulations ADD COLUMN waste_storage_location TEXT;  -- ごみ置場位置要件
ALTER TABLE building_regulations ADD COLUMN waste_separation_required INTEGER DEFAULT 1;  -- 分別要否

-- 管理人室・管理体制
ALTER TABLE building_regulations ADD COLUMN manager_room_required INTEGER DEFAULT 0;  -- 管理人室要否
ALTER TABLE building_regulations ADD COLUMN manager_room_threshold INTEGER;  -- 管理人室要否の戸数閾値
ALTER TABLE building_regulations ADD COLUMN management_system_required TEXT;  -- 管理体制要件

-- 近隣説明・事前協議
ALTER TABLE building_regulations ADD COLUMN neighbor_explanation_required INTEGER DEFAULT 0;  -- 近隣説明要否
ALTER TABLE building_regulations ADD COLUMN pre_consultation_required INTEGER DEFAULT 0;  -- 事前協議要否
ALTER TABLE building_regulations ADD COLUMN signboard_required INTEGER DEFAULT 0;  -- 標識設置要否
ALTER TABLE building_regulations ADD COLUMN signboard_period_days INTEGER;  -- 標識設置期間(日)

-- プライバシー配慮
ALTER TABLE building_regulations ADD COLUMN privacy_consideration_required INTEGER DEFAULT 0;  -- プライバシー配慮要否
ALTER TABLE building_regulations ADD COLUMN privacy_措置_detail TEXT;  -- プライバシー配慮措置詳細

-- 緊急連絡先表示板
ALTER TABLE building_regulations ADD COLUMN emergency_contact_board_required INTEGER DEFAULT 0;  -- 緊急連絡先表示板要否

-- 自治会加入案内
ALTER TABLE building_regulations ADD COLUMN community_participation_guidance INTEGER DEFAULT 0;  -- 自治会加入案内要否

-- 住戸面積最低基準
ALTER TABLE building_regulations ADD COLUMN min_unit_area REAL;  -- 最低住戸面積(㎡)

-- 宅配ボックス
ALTER TABLE building_regulations ADD COLUMN delivery_box_required INTEGER DEFAULT 0;  -- 宅配ボックス要否
ALTER TABLE building_regulations ADD COLUMN delivery_box_ratio REAL;  -- 宅配ボックス設置比率

-- 防犯設備
ALTER TABLE building_regulations ADD COLUMN security_equipment_required INTEGER DEFAULT 0;  -- 防犯設備要否
ALTER TABLE building_regulations ADD COLUMN auto_lock_required INTEGER DEFAULT 0;  -- オートロック要否
ALTER TABLE building_regulations ADD COLUMN security_camera_required INTEGER DEFAULT 0;  -- 防犯カメラ要否

-- ワンルーム形式定義
ALTER TABLE building_regulations ADD COLUMN studio_definition TEXT;  -- ワンルーム形式の定義
ALTER TABLE building_regulations ADD COLUMN studio_ratio_threshold REAL;  -- ワンルーム比率閾値

-- ========================================
-- Ⅳ. 開発・造成・地盤
-- ========================================

-- 開発許可
ALTER TABLE building_regulations ADD COLUMN development_permit_required INTEGER DEFAULT 0;  -- 開発許可要否
ALTER TABLE building_regulations ADD COLUMN development_permit_threshold REAL;  -- 開発許可要否の面積閾値(㎡)

-- 盛土・切土・擁壁
ALTER TABLE building_regulations ADD COLUMN embankment_regulation_area INTEGER DEFAULT 0;  -- 盛土規制区域フラグ
ALTER TABLE building_regulations ADD COLUMN embankment_permit_required INTEGER DEFAULT 0;  -- 盛土許可要否
ALTER TABLE building_regulations ADD COLUMN retaining_wall_standard TEXT;  -- 擁壁構造基準

-- がけ条例
ALTER TABLE building_regulations ADD COLUMN cliff_ordinance_applicable INTEGER DEFAULT 0;  -- がけ条例適用フラグ
ALTER TABLE building_regulations ADD COLUMN cliff_setback_distance REAL;  -- 崖からの離隔距離(m)

-- 土砂災害警戒区域
ALTER TABLE building_regulations ADD COLUMN sediment_disaster_area INTEGER DEFAULT 0;  -- 土砂災害警戒区域フラグ
ALTER TABLE building_regulations ADD COLUMN sediment_disaster_countermeasure TEXT;  -- 土砂災害対策要件

-- 液状化・浸水想定
ALTER TABLE building_regulations ADD COLUMN liquefaction_risk_area INTEGER DEFAULT 0;  -- 液状化リスク地域フラグ
ALTER TABLE building_regulations ADD COLUMN flood_countermeasure_required INTEGER DEFAULT 0;  -- 浸水対策要否

-- ========================================
-- Ⅴ. 環境・工事規制
-- ========================================

-- 工事車両動線
ALTER TABLE building_regulations ADD COLUMN construction_vehicle_route_designation INTEGER DEFAULT 0;  -- 工事車両動線指定要否
ALTER TABLE building_regulations ADD COLUMN construction_time_restriction TEXT;  -- 工事時間制限

-- 騒音・振動
ALTER TABLE building_regulations ADD COLUMN noise_regulation TEXT;  -- 騒音規制
ALTER TABLE building_regulations ADD COLUMN vibration_regulation TEXT;  -- 振動規制

-- 建設廃棄物
ALTER TABLE building_regulations ADD COLUMN construction_waste_management_required INTEGER DEFAULT 1;  -- 建設廃棄物管理要否

-- 雨水濁水対策
ALTER TABLE building_regulations ADD COLUMN muddy_water_countermeasure_required INTEGER DEFAULT 0;  -- 雨水濁水対策要否

-- ========================================
-- Ⅵ. その他ローカル必須項目
-- ========================================

-- ペット・民泊・用途制限
ALTER TABLE building_regulations ADD COLUMN pet_restriction TEXT;  -- ペット制限
ALTER TABLE building_regulations ADD COLUMN minpaku_restriction TEXT;  -- 民泊制限

-- 広告物条例
ALTER TABLE building_regulations ADD COLUMN outdoor_ad_regulation TEXT;  -- 屋外広告物規制

-- ========================================
-- メタデータ
-- ========================================

-- 適用開始日
ALTER TABLE building_regulations ADD COLUMN regulation_start_date DATE;  -- 規制適用開始日

-- 条例・要綱の種類フラグ
ALTER TABLE building_regulations ADD COLUMN has_building_standards_act INTEGER DEFAULT 1;  -- 建築基準法適用フラグ
ALTER TABLE building_regulations ADD COLUMN has_prefecture_ordinance INTEGER DEFAULT 0;  -- 都道府県条例適用フラグ
ALTER TABLE building_regulations ADD COLUMN has_municipal_ordinance INTEGER DEFAULT 0;  -- 市区町村条例適用フラグ
ALTER TABLE building_regulations ADD COLUMN has_development_guideline INTEGER DEFAULT 0;  -- 開発指導要綱適用フラグ

-- 更新履歴
ALTER TABLE building_regulations ADD COLUMN regulation_version TEXT;  -- 規制バージョン
ALTER TABLE building_regulations ADD COLUMN notes TEXT;  -- 備考・特記事項

-- Verify the schema update
SELECT 'Full regulation points schema expansion complete' as status;

-- Show table structure
PRAGMA table_info(building_regulations);
