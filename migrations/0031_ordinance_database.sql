-- ========================================
-- 自治体条例データベース（v3.153.123）
-- Purpose: 駐車場附置義務・ワンルーム条例等の管理
-- ========================================

-- 駐車場附置義務条例テーブル
CREATE TABLE IF NOT EXISTS parking_ordinance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  
  -- 適用条件
  applicable_use TEXT,                  -- 対象用途（共同住宅/事務所/店舗等）
  trigger_threshold TEXT,               -- 発動基準（例: 延床面積200㎡以上）
  calculation_basis TEXT,               -- 計算基準（戸数/延床面積）
  required_spaces_formula TEXT,         -- 必要台数計算式（例: 戸数÷3）
  
  -- 緩和規定
  has_relaxation INTEGER DEFAULT 0,    -- 緩和規定の有無
  relaxation_conditions TEXT,           -- 緩和条件
  can_offsite_parking INTEGER DEFAULT 0,  -- 敷地外駐車場可否
  offsite_distance_limit INTEGER,       -- 敷地外の距離制限（m）
  
  -- 備考
  notes TEXT,
  ordinance_name TEXT,                  -- 条例名
  ordinance_url TEXT,                   -- 条例URL
  article_number TEXT,                  -- 条文番号
  
  data_source TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ワンルーム条例テーブル
CREATE TABLE IF NOT EXISTS one_room_ordinance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  
  -- 基本要件
  min_unit_area REAL,                   -- 最低専有面積（㎡）
  max_unit_ratio REAL,                  -- ワンルーム比率上限（例: 0.3 = 30%）
  min_total_units INTEGER,              -- 適用戸数（例: 15戸以上）
  
  -- 施設要件
  requires_manager_room INTEGER DEFAULT 0,  -- 管理人室必要
  requires_meeting_room INTEGER DEFAULT 0,  -- 集会室必要
  requires_garbage_room INTEGER DEFAULT 0,  -- ゴミ置場必要
  garbage_room_area_formula TEXT,           -- ゴミ置場面積計算式
  
  -- 緑化・その他
  requires_greening INTEGER DEFAULT 0,      -- 緑化義務
  greening_ratio REAL,                      -- 緑化率
  requires_bicycle_parking INTEGER DEFAULT 0,  -- 駐輪場義務
  bicycle_parking_formula TEXT,             -- 駐輪場台数計算式
  
  -- 開発許可
  requires_development_permit INTEGER DEFAULT 0,  -- 開発許可要否
  development_permit_threshold TEXT,              -- 開発許可基準
  
  notes TEXT,
  ordinance_name TEXT,
  ordinance_url TEXT,
  article_number TEXT,
  
  data_source TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- その他条例テーブル（景観・福祉・地区計画等）
CREATE TABLE IF NOT EXISTS other_ordinance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,                        -- 地区名（地区計画等）
  
  ordinance_category TEXT NOT NULL,     -- 条例カテゴリ（landscape/welfare/district_plan/building_agreement）
  ordinance_name TEXT NOT NULL,         -- 条例名
  
  -- 適用条件
  applicable_area TEXT,                 -- 適用区域
  applicable_building_type TEXT,        -- 対象建物種別
  trigger_conditions TEXT,              -- 適用条件
  
  -- 要求事項
  requirements TEXT,                    -- 主な要求事項（JSON形式）
  prohibited_items TEXT,                -- 禁止事項
  
  -- 手続き
  requires_prior_consultation INTEGER DEFAULT 0,  -- 事前協議要否
  consultation_timing TEXT,                       -- 協議タイミング
  approval_authority TEXT,                        -- 承認権者
  
  notes TEXT,
  ordinance_url TEXT,
  article_number TEXT,
  
  data_source TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_parking_prefecture_city ON parking_ordinance(prefecture, city);
CREATE INDEX IF NOT EXISTS idx_oneroom_prefecture_city ON one_room_ordinance(prefecture, city);
CREATE INDEX IF NOT EXISTS idx_other_prefecture_city ON other_ordinance(prefecture, city);
CREATE INDEX IF NOT EXISTS idx_other_category ON other_ordinance(ordinance_category);

-- ========================================
-- サンプルデータ（駐車場附置義務）
-- ========================================

-- 東京都渋谷区の駐車場附置義務
INSERT INTO parking_ordinance (
  prefecture, city, applicable_use, trigger_threshold, calculation_basis, 
  required_spaces_formula, has_relaxation, can_offsite_parking, offsite_distance_limit,
  ordinance_name, article_number, data_source
)
VALUES 
  ('東京都', '渋谷区', '共同住宅', '延床面積200㎡以上', '戸数', '戸数÷3（端数切上）', 1, 1, 300, 
   '渋谷区建築物における駐車施設の附置等に関する条例', '第3条', '渋谷区公式サイト'),
  ('東京都', '世田谷区', '共同住宅', '延床面積300㎡以上', '戸数', '戸数÷4（端数切上）', 1, 1, 500, 
   '世田谷区建築物における駐車施設の附置等に関する条例', '第4条', '世田谷区公式サイト');

-- ========================================
-- サンプルデータ（ワンルーム条例）
-- ========================================

-- 東京都渋谷区のワンルーム条例
INSERT INTO one_room_ordinance (
  prefecture, city, min_unit_area, max_unit_ratio, min_total_units,
  requires_manager_room, requires_meeting_room, requires_garbage_room,
  garbage_room_area_formula, requires_greening, greening_ratio,
  ordinance_name, article_number, data_source
)
VALUES 
  ('東京都', '渋谷区', 25.0, 0.5, 15, 1, 1, 1, '戸数×0.2㎡', 1, 0.1, 
   '渋谷区ワンルームマンション等の建築及び管理に関する条例', '第5条～第8条', '渋谷区公式サイト'),
  ('東京都', '豊島区', 25.0, NULL, 15, 1, 1, 1, '戸数×0.15㎡', 1, 0.05, 
   '豊島区ワンルームマンション等の建築及び管理に関する条例', '第6条～第9条', '豊島区公式サイト');

-- ========================================
-- サンプルデータ（その他条例）
-- ========================================

-- 景観条例のサンプル
INSERT INTO other_ordinance (
  prefecture, city, ordinance_category, ordinance_name, applicable_area,
  applicable_building_type, trigger_conditions, requirements, 
  requires_prior_consultation, consultation_timing, approval_authority,
  data_source
)
VALUES 
  ('東京都', '渋谷区', 'landscape', '渋谷区景観条例', '全域', '高さ15m以上または延床1,000㎡以上の建築物', 
   '建築確認申請前', '外観デザイン・色彩・高さの制限（JSON形式で詳細記載）', 
   1, '建築確認申請の30日前まで', '渋谷区都市整備部', '渋谷区公式サイト');
