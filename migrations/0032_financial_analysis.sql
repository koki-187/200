-- ========================================
-- 収支計算・融資判定データベース（v3.153.123）
-- Purpose: 利回り計算・融資適合性判定
-- ========================================

-- 賃料相場マスタテーブル
CREATE TABLE IF NOT EXISTS rent_market_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,                        -- 町丁目
  station_name TEXT,                    -- 最寄駅
  walk_minutes INTEGER,                 -- 徒歩分数
  
  -- 間取り別賃料相場
  studio_rent REAL,                     -- ワンルーム賃料（万円）
  one_ldk_rent REAL,                    -- 1LDK賃料（万円）
  two_ldk_rent REAL,                    -- 2LDK賃料（万円）
  three_ldk_rent REAL,                  -- 3LDK賃料（万円）
  
  -- データ品質
  sample_count INTEGER,                 -- サンプル数
  data_period TEXT,                     -- データ期間（例: 2024年10月～12月）
  
  data_source TEXT,                     -- データソース（SUUMO/HOME'S等）
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建築費マスタテーブル
CREATE TABLE IF NOT EXISTS construction_cost (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city_type TEXT NOT NULL,              -- 都心部/郊外/地方
  
  -- 構造別単価（万円/坪）
  structure_type TEXT NOT NULL,         -- RC/鉄骨/木造
  base_cost_per_tsubo REAL NOT NULL,    -- 本体工事費（万円/坪）
  additional_cost_ratio REAL,           -- 付帯工事費率（例: 0.15 = 15%）
  
  -- 規模別補正
  scale_adjustment TEXT,                -- 規模別補正（JSON形式）
  
  -- 地域補正
  regional_adjustment REAL DEFAULT 1.0, -- 地域補正係数（都心部: 1.05～1.10）
  
  notes TEXT,
  data_source TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 融資基準マスタテーブル
CREATE TABLE IF NOT EXISTS loan_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  financial_institution TEXT NOT NULL, -- 金融機関名
  loan_type TEXT,                       -- ローン種別（アパートローン/不動産投資ローン）
  
  -- 利回り基準
  min_yield_rate REAL NOT NULL,         -- 最低利回り（例: 7.0% = 0.07）
  preferred_yield_rate REAL,            -- 推奨利回り（例: 8.0%）
  
  -- 物件条件
  min_land_area REAL,                   -- 最低土地面積（坪）
  max_walk_minutes INTEGER,             -- 最大駅徒歩分数
  allowed_structure TEXT,               -- 対応構造（RC/鉄骨/木造）
  
  -- 融資条件
  max_ltv_ratio REAL,                   -- 最大融資比率（例: 0.8 = 80%）
  max_loan_term INTEGER,                -- 最長融資期間（年）
  interest_rate_range TEXT,             -- 金利レンジ（例: 2.5～3.5%）
  
  -- 除外条件
  ng_conditions TEXT,                   -- NG条件（JSON形式）
  
  notes TEXT,
  data_source TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 市場価格評価マスタテーブル
CREATE TABLE IF NOT EXISTS market_price_benchmark (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  
  -- 坪単価レンジ
  price_per_tsubo_min REAL,             -- 最低坪単価（万円）
  price_per_tsubo_max REAL,             -- 最高坪単価（万円）
  price_per_tsubo_median REAL,          -- 中央値坪単価（万円）
  
  -- 評価基準（5段階）
  bargain_threshold REAL,               -- 大幅割安（中央値の80%未満）
  discount_threshold REAL,              -- 割安（中央値の80～90%）
  fair_range_lower REAL,                -- 適正範囲下限（中央値の90～110%）
  fair_range_upper REAL,                -- 適正範囲上限
  premium_threshold REAL,               -- 割高（中央値の110～120%）
  excessive_threshold REAL,             -- 大幅割高（中央値の120%超）
  
  -- データ期間
  data_period TEXT,                     -- 例: 直近6ヶ月
  sample_count INTEGER,                 -- サンプル数
  
  data_source TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_rent_prefecture_city ON rent_market_data(prefecture, city);
CREATE INDEX IF NOT EXISTS idx_rent_station ON rent_market_data(station_name, walk_minutes);
CREATE INDEX IF NOT EXISTS idx_construction_structure ON construction_cost(structure_type, city_type);
CREATE INDEX IF NOT EXISTS idx_loan_institution ON loan_criteria(financial_institution);
CREATE INDEX IF NOT EXISTS idx_market_prefecture_city ON market_price_benchmark(prefecture, city);

-- ========================================
-- サンプルデータ（賃料相場）
-- ========================================

INSERT INTO rent_market_data (
  prefecture, city, district, station_name, walk_minutes,
  studio_rent, one_ldk_rent, two_ldk_rent, three_ldk_rent,
  sample_count, data_period, data_source
)
VALUES 
  ('東京都', '渋谷区', '恵比寿', '恵比寿駅', 5, 9.5, 14.0, 18.5, 23.0, 150, '2024年10月～12月', 'SUUMO'),
  ('東京都', '世田谷区', '三軒茶屋', '三軒茶屋駅', 7, 8.0, 11.5, 15.0, 19.0, 120, '2024年10月～12月', 'HOMES'),
  ('神奈川県', '横浜市西区', 'みなとみらい', '横浜駅', 10, 7.5, 10.5, 14.0, 18.0, 100, '2024年10月～12月', 'SUUMO');

-- ========================================
-- サンプルデータ（建築費）
-- ========================================

INSERT INTO construction_cost (
  prefecture, city_type, structure_type, base_cost_per_tsubo, 
  additional_cost_ratio, regional_adjustment, data_source
)
VALUES 
  ('東京都', '都心部', 'RC', 85.0, 0.15, 1.10, '建築費データベース2024'),
  ('東京都', '郊外', 'RC', 75.0, 0.15, 1.00, '建築費データベース2024'),
  ('東京都', '都心部', '木造', 65.0, 0.12, 1.05, '建築費データベース2024'),
  ('神奈川県', '都心部', 'RC', 78.0, 0.15, 1.05, '建築費データベース2024'),
  ('千葉県', '郊外', '木造', 55.0, 0.12, 0.95, '建築費データベース2024');

-- ========================================
-- サンプルデータ（融資基準）
-- ========================================

INSERT INTO loan_criteria (
  financial_institution, loan_type, min_yield_rate, preferred_yield_rate,
  min_land_area, max_walk_minutes, allowed_structure, max_ltv_ratio,
  max_loan_term, interest_rate_range, ng_conditions, data_source
)
VALUES 
  ('オリックス銀行', 'アパートローン', 0.07, 0.08, 45.0, 15, 'RC/鉄骨/木造', 0.80, 35, '2.5～3.5%', 
   '["市街化調整区域", "再建築不可", "旧耐震"]', 'オリックス銀行公式サイト'),
  ('スルガ銀行', '不動産投資ローン', 0.08, 0.09, 40.0, 10, 'RC/鉄骨', 0.75, 30, '3.0～4.5%', 
   '["市街化調整区域", "再建築不可", "築古木造"]', 'スルガ銀行公式サイト'),
  ('三井住友トラスト・ローン&ファイナンス', 'アパートローン', 0.065, 0.075, 50.0, 15, 'RC/鉄骨/木造', 0.85, 35, '2.0～3.0%', 
   '["市街化調整区域", "旧耐震", "土砂災害特別警戒区域"]', '三井住友トラスト公式サイト');

-- ========================================
-- サンプルデータ（市場価格評価）
-- ========================================

INSERT INTO market_price_benchmark (
  prefecture, city, district, 
  price_per_tsubo_min, price_per_tsubo_max, price_per_tsubo_median,
  bargain_threshold, discount_threshold, fair_range_lower, fair_range_upper,
  premium_threshold, excessive_threshold, data_period, sample_count, data_source
)
VALUES 
  ('東京都', '渋谷区', '恵比寿', 200.0, 350.0, 280.0, 224.0, 252.0, 252.0, 308.0, 308.0, 336.0, 
   '直近6ヶ月', 45, 'REINS成約データ'),
  ('東京都', '世田谷区', '三軒茶屋', 120.0, 200.0, 160.0, 128.0, 144.0, 144.0, 176.0, 176.0, 192.0, 
   '直近6ヶ月', 38, 'REINS成約データ'),
  ('神奈川県', '横浜市西区', 'みなとみらい', 150.0, 250.0, 200.0, 160.0, 180.0, 180.0, 220.0, 220.0, 240.0, 
   '直近6ヶ月', 30, 'REINS成約データ');
