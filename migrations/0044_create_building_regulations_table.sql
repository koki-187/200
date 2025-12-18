-- マイグレーション 0044: 建築規制情報テーブルの作成
-- 目的: 建築基準法・規則・条例・要綱のピンポイント判定用データベース構築
-- 作成日: 2025-12-18

-- 建築規制情報テーブル
CREATE TABLE IF NOT EXISTS building_regulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 住所情報（詳細住所と同じ階層構造）
  prefecture TEXT NOT NULL,           -- 都道府県
  city TEXT NOT NULL,                 -- 市区町村
  district TEXT,                       -- 地区（〇丁目を含む）
  chome TEXT,                         -- 丁目（例: "1丁目"）
  banchi_start INTEGER,               -- 番地開始（例: 1）
  banchi_end INTEGER,                 -- 番地終了（例: 99）
  
  -- 正規化住所（検索用）
  normalized_address TEXT NOT NULL,   -- 正規化住所（例: "東京都江戸川区小岩1丁目1-99番地"）
  
  -- 用途地域
  zoning_type TEXT,                   -- 用途地域種別（第一種低層住居専用地域、商業地域等）
  zoning_note TEXT,                   -- 用途地域の詳細説明
  
  -- 建ぺい率・容積率
  building_coverage_ratio INTEGER,    -- 建ぺい率（%）
  floor_area_ratio INTEGER,           -- 容積率（%）
  
  -- 高さ制限
  height_limit REAL,                  -- 高さ制限（m）
  height_limit_type TEXT,             -- 高さ制限の種別（絶対高さ、斜線制限等）
  
  -- 日影規制
  shadow_regulation INTEGER DEFAULT 0, -- 日影規制の有無（0: なし、1: あり）
  shadow_regulation_note TEXT,        -- 日影規制の詳細
  
  -- 防火地域
  fire_prevention_area TEXT,          -- 防火地域種別（防火地域、準防火地域、無指定）
  
  -- 地区計画
  district_plan TEXT,                 -- 地区計画の名称
  district_plan_note TEXT,            -- 地区計画の詳細
  
  -- 条例・要綱
  local_ordinance TEXT,               -- 地方自治体の条例名
  local_ordinance_note TEXT,          -- 条例の詳細
  
  -- 建築制限
  building_restrictions TEXT,         -- 建築制限の種別（崖条例、宅地造成規制等）
  building_restrictions_note TEXT,    -- 建築制限の詳細
  
  -- 融資判定への影響
  affects_loan INTEGER DEFAULT 0,     -- 融資判定への影響（0: なし、1: 注意、2: 制限あり）
  loan_impact_note TEXT,              -- 融資判定への影響の詳細
  
  -- メタデータ
  data_source TEXT,                   -- データソース
  data_source_url TEXT,               -- データソースURL
  confidence_level TEXT DEFAULT 'high', -- データ信頼度
  verification_status TEXT DEFAULT 'verified', -- 検証ステータス
  verified_by TEXT,                   -- 検証者
  verified_at DATETIME,               -- 検証日時
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- ユニーク制約
  UNIQUE(prefecture, city, district, chome, banchi_start, banchi_end, zoning_type)
);

-- インデックス作成（高速検索用）
CREATE INDEX IF NOT EXISTS idx_building_regs_prefecture_city ON building_regulations(prefecture, city);
CREATE INDEX IF NOT EXISTS idx_building_regs_normalized ON building_regulations(normalized_address);
CREATE INDEX IF NOT EXISTS idx_building_regs_chome ON building_regulations(prefecture, city, district, chome);
CREATE INDEX IF NOT EXISTS idx_building_regs_zoning ON building_regulations(zoning_type);
CREATE INDEX IF NOT EXISTS idx_building_regs_loan_impact ON building_regulations(affects_loan);

-- 建築規制検索ビュー（検索支援）
CREATE VIEW IF NOT EXISTS v_building_regulations_search AS
SELECT 
  id,
  prefecture || city || COALESCE(district, '') || COALESCE(chome, '') as search_key,
  prefecture,
  city,
  district,
  chome,
  banchi_start,
  banchi_end,
  normalized_address,
  zoning_type,
  building_coverage_ratio,
  floor_area_ratio,
  height_limit,
  fire_prevention_area,
  affects_loan,
  confidence_level
FROM building_regulations;
