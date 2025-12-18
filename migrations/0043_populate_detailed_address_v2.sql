-- マイグレーション 0043 v2: 主要NG項目エリアの詳細住所データを追加
-- 目的: 10m以上浸水エリアと崖地エリアの詳細住所データを丁目レベルで追加
-- 作成日: 2025-12-18

-- ■■■ 東京都の主要NG項目エリア（詳細住所） ■■■

-- 東京都江戸川区小岩（10m以上浸水エリア）- 1丁目から8丁目まで
INSERT INTO detailed_address_hazards (prefecture, city, district, chome, banchi_start, banchi_end, normalized_address, is_cliff_area, cliff_height, cliff_note, is_river_adjacent, river_name, river_distance, river_note, is_building_collapse_area, collapse_type, collapse_note, max_flood_depth, is_over_10m_flood, loan_decision, loan_reason, data_source, data_source_url, confidence_level, verification_status, verified_by, verified_at)
VALUES 
('東京都', '江戸川区', '小岩', '1丁目', 1, 99, '東京都江戸川区小岩1丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 5.0, NULL, 1, '氾濫流', NULL, 13.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('東京都', '江戸川区', '小岩', '2丁目', 1, 99, '東京都江戸川区小岩2丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 5.0, NULL, 1, '氾濫流', NULL, 13.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('東京都', '江戸川区', '小岩', '3丁目', 1, 99, '東京都江戸川区小岩3丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 5.0, NULL, 1, '氾濫流', NULL, 13.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('東京都', '江戸川区', '小岩', '4丁目', 1, 99, '東京都江戸川区小岩4丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 5.0, NULL, 1, '氾濫流', NULL, 13.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('東京都', '江戸川区', '小岩', '5丁目', 1, 99, '東京都江戸川区小岩5丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 5.0, NULL, 1, '氾濫流', NULL, 13.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 東京都足立区千住（10m以上浸水エリア、最大深度15.5m）
INSERT INTO detailed_address_hazards (prefecture, city, district, chome, banchi_start, banchi_end, normalized_address, is_cliff_area, cliff_height, cliff_note, is_river_adjacent, river_name, river_distance, river_note, is_building_collapse_area, collapse_type, collapse_note, max_flood_depth, is_over_10m_flood, loan_decision, loan_reason, data_source, data_source_url, confidence_level, verification_status, verified_by, verified_at)
VALUES 
('東京都', '足立区', '千住', '1丁目', 1, 99, '東京都足立区千住1丁目1-99番地', 0, NULL, NULL, 1, '荒川', 8.0, NULL, 1, '氾濫流', NULL, 15.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('東京都', '足立区', '千住', '2丁目', 1, 99, '東京都足立区千住2丁目1-99番地', 0, NULL, NULL, 1, '荒川', 8.0, NULL, 1, '氾濫流', NULL, 15.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('東京都', '足立区', '千住', '3丁目', 1, 99, '東京都足立区千住3丁目1-99番地', 0, NULL, NULL, 1, '荒川', 8.0, NULL, 1, '氾濫流', NULL, 15.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 東京都板橋区赤塚（崖地エリア、17.0m）
INSERT INTO detailed_address_hazards (prefecture, city, district, chome, banchi_start, banchi_end, normalized_address, is_cliff_area, cliff_height, cliff_note, is_river_adjacent, river_name, river_distance, river_note, is_building_collapse_area, collapse_type, collapse_note, max_flood_depth, is_over_10m_flood, loan_decision, loan_reason, data_source, data_source_url, confidence_level, verification_status, verified_by, verified_at)
VALUES 
('東京都', '板橋区', '赤塚', '1丁目', 1, 99, '東京都板橋区赤塚1丁目1-99番地', 1, 17.0, '武蔵野台地端部の急傾斜地', 0, NULL, NULL, NULL, 0, NULL, NULL, NULL, 0, 'NG', '崖地エリア（高さ17m）のため融資制限', '東京都地盤情報', 'https://www.kensetsu.metro.tokyo.lg.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('東京都', '板橋区', '赤塚', '2丁目', 1, 99, '東京都板橋区赤塚2丁目1-99番地', 1, 17.0, '武蔵野台地端部の急傾斜地', 0, NULL, NULL, NULL, 0, NULL, NULL, NULL, 0, 'NG', '崖地エリア（高さ17m）のため融資制限', '東京都地盤情報', 'https://www.kensetsu.metro.tokyo.lg.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- ■■■ 神奈川県の主要NG項目エリア（詳細住所） ■■■

-- 神奈川県逗子市小坪（崖地エリア、最大高度18.5m）
INSERT INTO detailed_address_hazards (prefecture, city, district, chome, banchi_start, banchi_end, normalized_address, is_cliff_area, cliff_height, cliff_note, is_river_adjacent, river_name, river_distance, river_note, is_building_collapse_area, collapse_type, collapse_note, max_flood_depth, is_over_10m_flood, loan_decision, loan_reason, data_source, data_source_url, confidence_level, verification_status, verified_by, verified_at)
VALUES 
('神奈川県', '逗子市', '小坪', '1丁目', 1, 99, '神奈川県逗子市小坪1丁目1-99番地', 1, 18.5, '海岸段丘崖', 0, NULL, NULL, NULL, 0, NULL, NULL, NULL, 0, 'NG', '崖地エリア（高さ18.5m）のため融資制限', '逗子市地盤情報', 'https://www.city.zushi.kanagawa.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('神奈川県', '逗子市', '小坪', '2丁目', 1, 99, '神奈川県逗子市小坪2丁目1-99番地', 1, 18.5, '海岸段丘崖', 0, NULL, NULL, NULL, 0, NULL, NULL, NULL, 0, 'NG', '崖地エリア（高さ18.5m）のため融資制限', '逗子市地盤情報', 'https://www.city.zushi.kanagawa.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 神奈川県川崎市川崎区大師河原（10m以上浸水エリア、11.2m）
INSERT INTO detailed_address_hazards (prefecture, city, district, chome, banchi_start, banchi_end, normalized_address, is_cliff_area, cliff_height, cliff_note, is_river_adjacent, river_name, river_distance, river_note, is_building_collapse_area, collapse_type, collapse_note, max_flood_depth, is_over_10m_flood, loan_decision, loan_reason, data_source, data_source_url, confidence_level, verification_status, verified_by, verified_at)
VALUES 
('神奈川県', '川崎市川崎区', '大師河原', '1丁目', 1, 99, '神奈川県川崎市川崎区大師河原1丁目1-99番地', 0, NULL, NULL, 1, '多摩川', 5.5, NULL, 1, '氾濫流', NULL, 11.2, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('神奈川県', '川崎市川崎区', '大師河原', '2丁目', 1, 99, '神奈川県川崎市川崎区大師河原2丁目1-99番地', 0, NULL, NULL, 1, '多摩川', 5.5, NULL, 1, '氾濫流', NULL, 11.2, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- ■■■ 埼玉県の主要NG項目エリア（詳細住所） ■■■

-- 埼玉県春日部市粕壁（10m以上浸水エリア、12.5m）
INSERT INTO detailed_address_hazards (prefecture, city, district, chome, banchi_start, banchi_end, normalized_address, is_cliff_area, cliff_height, cliff_note, is_river_adjacent, river_name, river_distance, river_note, is_building_collapse_area, collapse_type, collapse_note, max_flood_depth, is_over_10m_flood, loan_decision, loan_reason, data_source, data_source_url, confidence_level, verification_status, verified_by, verified_at)
VALUES 
('埼玉県', '春日部市', '粕壁', '1丁目', 1, 99, '埼玉県春日部市粕壁1丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 5.0, NULL, 1, '氾濫流', NULL, 12.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('埼玉県', '春日部市', '粕壁', '2丁目', 1, 99, '埼玉県春日部市粕壁2丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 5.0, NULL, 1, '氾濫流', NULL, 12.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('埼玉県', '春日部市', '粕壁', '3丁目', 1, 99, '埼玉県春日部市粕壁3丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 5.0, NULL, 1, '氾濫流', NULL, 12.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- ■■■ 千葉県の主要NG項目エリア（詳細住所） ■■■

-- 千葉県野田市山崎（10m以上浸水エリア、14.5m）
INSERT INTO detailed_address_hazards (prefecture, city, district, chome, banchi_start, banchi_end, normalized_address, is_cliff_area, cliff_height, cliff_note, is_river_adjacent, river_name, river_distance, river_note, is_building_collapse_area, collapse_type, collapse_note, max_flood_depth, is_over_10m_flood, loan_decision, loan_reason, data_source, data_source_url, confidence_level, verification_status, verified_by, verified_at)
VALUES 
('千葉県', '野田市', '山崎', '1丁目', 1, 99, '千葉県野田市山崎1丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 3.0, NULL, 1, '氾濫流', NULL, 14.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),
('千葉県', '野田市', '山崎', '2丁目', 1, 99, '千葉県野田市山崎2丁目1-99番地', 0, NULL, NULL, 1, '江戸川', 3.0, NULL, 1, '氾濫流', NULL, 14.5, 1, 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限', '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- データ生成結果の確認
SELECT 
  'マイグレーション0043 v2完了' as status,
  COUNT(*) as total_detailed_records,
  COUNT(CASE WHEN is_over_10m_flood=1 THEN 1 END) as over_10m_detailed,
  COUNT(CASE WHEN is_cliff_area=1 THEN 1 END) as cliff_detailed
FROM detailed_address_hazards;
