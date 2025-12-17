-- ========================================
-- 買主別判定基準データベース（v3.153.123）
-- Purpose: フィリックス・GA Technologies等の買主別条件管理
-- ========================================

-- 買主マスタテーブル
CREATE TABLE IF NOT EXISTS buyer_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_name TEXT NOT NULL UNIQUE,      -- 買主名（例: フィリックス、GA Technologies）
  buyer_type TEXT,                      -- 買主タイプ（developer/investor/fund）
  
  -- 基本方針
  investment_strategy TEXT,             -- 投資戦略（例: ZEH基準アパート開発）
  target_exit TEXT,                     -- 出口戦略（例: 長期保有/転売）
  
  -- 連絡先
  contact_person TEXT,                  -- 担当者名
  contact_email TEXT,                   -- メールアドレス
  contact_phone TEXT,                   -- 電話番号
  
  is_active INTEGER DEFAULT 1,          -- 活動中フラグ
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 買主別購入条件テーブル
CREATE TABLE IF NOT EXISTS buyer_purchase_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL,
  
  -- 対象エリア
  target_prefectures TEXT NOT NULL,     -- 対象都道府県（JSON配列）
  target_cities TEXT,                   -- 特定市区町村（JSON配列、NULLなら全域）
  excluded_cities TEXT,                 -- 除外市区町村（JSON配列）
  
  -- 土地条件
  min_land_area REAL NOT NULL,          -- 最低土地面積（坪）
  max_land_area REAL,                   -- 最大土地面積（坪）
  min_frontage REAL,                    -- 最低間口（m）
  min_road_width REAL,                  -- 最低道路幅員（m）
  
  -- 駅距離
  max_walk_minutes INTEGER,             -- 最大駅徒歩分数
  
  -- 用途地域
  allowed_zoning TEXT,                  -- 許容用途地域（JSON配列）
  
  -- 建蔽率・容積率
  min_building_coverage REAL,           -- 最低建蔽率（例: 0.6 = 60%）
  min_floor_area_ratio REAL,            -- 最低容積率（例: 1.5 = 150%）
  
  -- 価格帯
  min_price_per_tsubo REAL,             -- 最低坪単価（万円）
  max_price_per_tsubo REAL,             -- 最高坪単価（万円）
  min_total_price REAL,                 -- 最低総額（万円）
  max_total_price REAL,                 -- 最高総額（万円）
  
  -- NG条件
  ng_conditions TEXT NOT NULL,          -- NG条件（JSON配列）
  
  -- 優先条件
  preferred_conditions TEXT,            -- 優先条件（JSON配列）
  
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (buyer_id) REFERENCES buyer_master(id)
);

-- 買主別成約実績テーブル（参考データ）
CREATE TABLE IF NOT EXISTS buyer_transaction_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL,
  
  -- 物件情報
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  land_area REAL,                       -- 土地面積（坪）
  building_coverage REAL,               -- 建蔽率
  floor_area_ratio REAL,                -- 容積率
  price_per_tsubo REAL,                 -- 坪単価（万円）
  total_price REAL,                     -- 総額（万円）
  
  -- 成約情報
  transaction_date DATE,                -- 成約日
  negotiation_duration INTEGER,         -- 交渉期間（日数）
  discount_rate REAL,                   -- 値引き率（例: 0.05 = 5%）
  
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (buyer_id) REFERENCES buyer_master(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_buyer_criteria_buyer_id ON buyer_purchase_criteria(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_history_buyer_id ON buyer_transaction_history(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_history_date ON buyer_transaction_history(transaction_date);

-- ========================================
-- サンプルデータ（買主マスタ）
-- ========================================

INSERT INTO buyer_master (buyer_name, buyer_type, investment_strategy, target_exit, is_active)
VALUES 
  ('フィリックス', 'developer', 'ZEH基準アパート開発（200棟プロジェクト）', '長期保有・賃貸運営', 1),
  ('GA Technologies', 'investor', '収益不動産投資・AI査定活用', '中期保有・転売', 1);

-- ========================================
-- サンプルデータ（フィリックス購入条件）
-- ========================================

INSERT INTO buyer_purchase_criteria (
  buyer_id, target_prefectures, excluded_cities, 
  min_land_area, min_frontage, min_road_width, max_walk_minutes,
  allowed_zoning, min_building_coverage, min_floor_area_ratio,
  min_price_per_tsubo, max_price_per_tsubo, ng_conditions, preferred_conditions
)
VALUES 
  (
    1, -- フィリックス
    '["東京都", "神奈川県", "埼玉県", "千葉県", "長野県", "愛知県"]',
    '["加須市"]',
    45.0, 7.5, 2.0, 15,
    '["第一種住居地域", "第二種住居地域", "準住居地域", "近隣商業地域"]',
    0.60, 1.50,
    30.0, 130.0,
    '["10m以上浸水想定区域", "家屋倒壊等氾濫想定区域", "土砂災害特別警戒区域", "私道のみ接道", "市街化調整区域", "防火地域"]',
    '["ZEH基準対応可能", "南向き", "角地"]'
  );

-- ========================================
-- サンプルデータ（GA Technologies購入条件）
-- ========================================

INSERT INTO buyer_purchase_criteria (
  buyer_id, target_prefectures, excluded_cities,
  min_land_area, min_frontage, min_road_width, max_walk_minutes,
  allowed_zoning, min_building_coverage, min_floor_area_ratio,
  min_price_per_tsubo, max_price_per_tsubo, min_total_price, max_total_price,
  ng_conditions, preferred_conditions
)
VALUES 
  (
    2, -- GA Technologies
    '["東京都", "神奈川県", "埼玉県", "千葉県", "茨城県", "栃木県", "群馬県", "山梨県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府"]',
    NULL,
    25.0, NULL, NULL, 10,
    '["第一種住居地域", "第二種住居地域", "準住居地域", "近隣商業地域", "商業地域"]',
    NULL, 1.50,
    80.0, 200.0, 1800.0, 13000.0,
    '["再建築不可", "旧耐震", "市街化調整区域"]',
    '["高利回り（8%以上）", "駅近（徒歩5分以内）", "新築・築浅"]'
  );

-- ========================================
-- サンプルデータ（成約実績）
-- ========================================

INSERT INTO buyer_transaction_history (
  buyer_id, prefecture, city, land_area, building_coverage, floor_area_ratio,
  price_per_tsubo, total_price, transaction_date, negotiation_duration, discount_rate
)
VALUES 
  (1, '東京都', '板橋区', 52.5, 0.60, 1.80, 95.0, 4987.5, '2024-11-15', 45, 0.03),
  (1, '神奈川県', '川崎市中原区', 48.0, 0.60, 2.00, 105.0, 5040.0, '2024-10-20', 38, 0.02),
  (2, '東京都', '練馬区', 28.3, 0.60, 1.50, 115.0, 3254.5, '2024-12-01', 30, 0.05),
  (2, '神奈川県', '横浜市鶴見区', 35.2, 0.60, 1.80, 98.0, 3449.6, '2024-11-10', 25, 0.04);
