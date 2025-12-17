-- ========================================
-- 融資制限条件データベース（画像ベース要件）
-- Migration: 0004_loan_restriction_criteria.sql
-- Created: 2025-12-17
-- Purpose: 金融機関融資NG条件の管理
-- ========================================

-- 用途地域・防火・市街化調整区域制限テーブル
CREATE TABLE IF NOT EXISTS zoning_restrictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,                        -- 地区名（オプション）
  
  -- 市街化調整区域
  is_urbanization_control_area INTEGER DEFAULT 0,  -- 1: 市街化調整区域
  urbanization_note TEXT,                          -- 詳細説明
  
  -- 防火地域
  is_fire_prevention_area INTEGER DEFAULT 0,       -- 1: 防火地域, 2: 準防火地域
  fire_prevention_note TEXT,                       -- 詳細説明
  
  -- 融資判定
  loan_decision TEXT DEFAULT 'OK',                 -- OK/WARNING/NG
  loan_reason TEXT,                                -- 判定理由
  
  data_source TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 地理的リスクテーブル（崖地・河川隣接・家屋倒壊エリア）
CREATE TABLE IF NOT EXISTS geography_risks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,                        -- 町丁目レベル
  
  -- 崖地域
  is_cliff_area INTEGER DEFAULT 0,      -- 1: 崖地あり
  cliff_height REAL,                    -- 崖の高さ（m）
  cliff_note TEXT,
  
  -- 河川隣接
  is_river_adjacent INTEGER DEFAULT 0,  -- 1: 河川隣接（30m以内）
  river_name TEXT,                      -- 河川名
  river_distance REAL,                  -- 河川からの距離（m）
  river_note TEXT,
  
  -- 家屋倒壊エリア
  is_building_collapse_area INTEGER DEFAULT 0,  -- 1: 家屋倒壊等氾濫想定区域
  collapse_type TEXT,                           -- 氾濫流/河岸侵食
  collapse_note TEXT,
  
  -- 10m以上浸水
  max_flood_depth REAL,                 -- 最大浸水深（m）
  is_over_10m_flood INTEGER DEFAULT 0,  -- 1: 10m以上の浸水想定
  
  -- 融資判定
  loan_decision TEXT DEFAULT 'OK',      -- OK/WARNING/NG
  loan_reason TEXT,                     -- 判定理由
  
  data_source TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_zoning_prefecture_city ON zoning_restrictions(prefecture, city);
CREATE INDEX IF NOT EXISTS idx_zoning_loan_decision ON zoning_restrictions(loan_decision);
CREATE INDEX IF NOT EXISTS idx_geography_prefecture_city ON geography_risks(prefecture, city);
CREATE INDEX IF NOT EXISTS idx_geography_loan_decision ON geography_risks(loan_decision);
CREATE INDEX IF NOT EXISTS idx_geography_district ON geography_risks(prefecture, city, district);

-- ========================================
-- サンプルデータ（初期テスト用）
-- ========================================

-- 東京都渋谷区のサンプル（用途地域制限）
INSERT INTO zoning_restrictions (prefecture, city, is_urbanization_control_area, is_fire_prevention_area, loan_decision, loan_reason, data_source)
VALUES 
  ('東京都', '渋谷区', 0, 1, 'WARNING', '防火地域のため建築コストが高くなる可能性', '東京都都市計画情報'),
  ('東京都', '江東区', 0, 0, 'OK', '制限なし', '東京都都市計画情報'),
  ('東京都', '八王子市', 1, 0, 'NG', '市街化調整区域のため原則建築不可', '東京都都市計画情報');

-- 東京都江東区のサンプル（地理的リスク）
INSERT INTO geography_risks (
  prefecture, city, district, 
  is_river_adjacent, river_name, river_distance, 
  is_building_collapse_area, collapse_type,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason, data_source
)
VALUES 
  ('東京都', '江東区', '亀戸', 1, '荒川', 15.5, 1, '氾濫流', 3.5, 0, 'NG', '河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ'),
  ('東京都', '江東区', '豊洲', 0, NULL, NULL, 0, NULL, 1.2, 0, 'OK', '軽微な浸水リスクのみ', '国土交通省ハザードマップ'),
  ('東京都', '江東区', '東砂', 1, '荒川', 8.0, 1, '河岸侵食', 12.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリア', '国土交通省ハザードマップ');

-- 神奈川県横浜市のサンプル
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height,
  loan_decision, loan_reason, data_source
)
VALUES 
  ('神奈川県', '横浜市港北区', '綱島', 1, 15.0, 'NG', '崖地域（15m）のため擁壁工事費用が高額', '横浜市地盤情報');

-- ========================================
-- 注意事項
-- ========================================
-- このマイグレーションは融資制限条件の基本スキーマとサンプルデータのみ。
-- 一都三県全域のデータは別途データ収集スクリプトで投入します。
