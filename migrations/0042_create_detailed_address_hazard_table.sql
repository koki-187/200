-- マイグレーション 0042: 詳細住所ハザード情報テーブルの作成
-- 目的: 〇丁目・〇番地レベルのピンポイント判定用データベース構築
-- 作成日: 2025-12-18

-- 詳細住所ハザード情報テーブル
CREATE TABLE IF NOT EXISTS detailed_address_hazards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 住所情報（階層構造）
  prefecture TEXT NOT NULL,           -- 都道府県
  city TEXT NOT NULL,                 -- 市区町村
  district TEXT,                       -- 地区（〇丁目を含む）
  chome TEXT,                         -- 丁目（例: "1丁目"）
  banchi_start INTEGER,               -- 番地開始（例: 1）
  banchi_end INTEGER,                 --番地終了（例: 10）
  
  -- 正規化住所（検索用）
  normalized_address TEXT NOT NULL,   -- 正規化住所（例: "東京都江戸川区小岩1丁目1-10番地"）
  
  -- ハザード情報（geography_risksと同じ構造）
  is_cliff_area INTEGER DEFAULT 0,
  cliff_height REAL,
  cliff_note TEXT,
  
  is_river_adjacent INTEGER DEFAULT 0,
  river_name TEXT,
  river_distance REAL,
  river_note TEXT,
  
  is_building_collapse_area INTEGER DEFAULT 0,
  collapse_type TEXT,
  collapse_note TEXT,
  
  max_flood_depth REAL,
  is_over_10m_flood INTEGER DEFAULT 0,
  
  -- 融資判定
  loan_decision TEXT DEFAULT 'OK',
  loan_reason TEXT,
  
  -- メタデータ
  data_source TEXT,
  data_source_url TEXT,
  confidence_level TEXT DEFAULT 'high',
  verification_status TEXT DEFAULT 'verified',
  verified_by TEXT,
  verified_at DATETIME,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- ユニーク制約
  UNIQUE(prefecture, city, district, chome, banchi_start, banchi_end)
);

-- インデックス作成（高速検索用）
CREATE INDEX IF NOT EXISTS idx_detailed_address_prefecture_city ON detailed_address_hazards(prefecture, city);
CREATE INDEX IF NOT EXISTS idx_detailed_address_normalized ON detailed_address_hazards(normalized_address);
CREATE INDEX IF NOT EXISTS idx_detailed_address_chome ON detailed_address_hazards(prefecture, city, district, chome);
CREATE INDEX IF NOT EXISTS idx_detailed_address_loan_decision ON detailed_address_hazards(loan_decision);

-- 住所正規化関数用のビュー（検索支援）
CREATE VIEW IF NOT EXISTS v_detailed_address_search AS
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
  is_over_10m_flood,
  is_cliff_area,
  max_flood_depth,
  loan_decision,
  confidence_level
FROM detailed_address_hazards;
