-- ========================================
-- 一都三県ハザード情報データベース
-- Migration: 0003_hazard_database.sql
-- Created: 2025-12-17
-- ========================================

-- ハザード情報マスタテーブル
CREATE TABLE IF NOT EXISTS hazard_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,           -- 都道府県（東京都、神奈川県、埼玉県、千葉県）
  city TEXT NOT NULL,                  -- 市区町村（例: 渋谷区、横浜市中区）
  hazard_type TEXT NOT NULL,           -- ハザード種別（flood/landslide/tsunami/liquefaction）
  risk_level TEXT NOT NULL,            -- リスクレベル（high/medium/low/none）
  description TEXT,                    -- 詳細説明
  affected_area TEXT,                  -- 影響範囲（例: 〇〇川周辺、〇〇地区）
  data_source TEXT,                    -- データソース（国交省API等）
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ローン制限情報テーブル
CREATE TABLE IF NOT EXISTS loan_restrictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  restriction_type TEXT NOT NULL,      -- 制限種別（flood_restricted/landslide_restricted）
  is_restricted INTEGER DEFAULT 0,     -- 制限あり: 1, なし: 0
  restriction_details TEXT,            -- 制限詳細
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_hazard_prefecture_city ON hazard_info(prefecture, city);
CREATE INDEX IF NOT EXISTS idx_hazard_type ON hazard_info(hazard_type);
CREATE INDEX IF NOT EXISTS idx_loan_prefecture_city ON loan_restrictions(prefecture, city);

-- ========================================
-- サンプルデータ（初期テスト用）
-- ========================================

-- 東京都渋谷区のサンプル
INSERT INTO hazard_info (prefecture, city, hazard_type, risk_level, description, affected_area, data_source)
VALUES 
  ('東京都', '渋谷区', 'flood', 'medium', '渋谷川周辺で浸水リスクあり（想定浸水深: 0.5-1.0m）', '渋谷川沿い', '国土交通省ハザードマップ'),
  ('東京都', '渋谷区', 'landslide', 'low', '土砂災害警戒区域の指定なし', 'なし', '国土交通省ハザードマップ'),
  ('東京都', '渋谷区', 'tsunami', 'none', '津波浸水想定区域外', 'なし', '国土交通省ハザードマップ'),
  ('東京都', '渋谷区', 'liquefaction', 'low', '液状化の可能性は低い', 'なし', '東京都建設局');

-- 東京都江東区のサンプル
INSERT INTO hazard_info (prefecture, city, hazard_type, risk_level, description, affected_area, data_source)
VALUES 
  ('東京都', '江東区', 'flood', 'high', '荒川氾濫時に広範囲で浸水の恐れ（想定浸水深: 3.0-5.0m）', '荒川沿い全域', '国土交通省ハザードマップ'),
  ('東京都', '江東区', 'landslide', 'none', '土砂災害警戒区域の指定なし', 'なし', '国土交通省ハザードマップ'),
  ('東京都', '江東区', 'tsunami', 'medium', '津波浸水想定区域に一部該当', '臨海部', '国土交通省ハザードマップ'),
  ('東京都', '江東区', 'liquefaction', 'high', '液状化の危険性が高い（埋立地）', '臨海部全域', '東京都建設局');

-- ローン制限情報サンプル
INSERT INTO loan_restrictions (prefecture, city, restriction_type, is_restricted, restriction_details)
VALUES 
  ('東京都', '渋谷区', 'flood_restricted', 0, '制限なし'),
  ('東京都', '渋谷区', 'landslide_restricted', 0, '制限なし'),
  ('東京都', '江東区', 'flood_restricted', 1, '荒川氾濫時の浸水想定区域につき、一部金融機関で融資制限の可能性あり'),
  ('東京都', '江東区', 'landslide_restricted', 0, '制限なし');

-- ========================================
-- 注意事項
-- ========================================
-- このマイグレーションは初期スキーマとサンプルデータのみを含みます。
-- 一都三県全域のデータは別途データ収集スクリプトで投入します。
