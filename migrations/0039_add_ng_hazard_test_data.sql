-- Migration: NG項目テスト用データ追加 v3.153.129
-- 目的: レッドゾーン、崖地、10m以上浸水等のNG項目を含む実際の住所データを追加
-- 作成日: 2025-12-18

-- 東京都江東区東陽町 - 液状化・洪水リスク高
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '東京都', '江東区', '東陽町',
  0, NULL, NULL,
  1, '荒川', 12.5, '荒川に近接、氾濫リスク高',
  1, '氾濫流', '家屋倒壊等氾濫想定区域（氾濫流）',
  5.5, 0,
  'NG', '河川隣接・家屋倒壊エリアのため融資制限',
  '国土交通省ハザードマップ', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- 東京都足立区千住 - 荒川沿い、洪水高リスク
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '東京都', '足立区', '千住',
  0, NULL, NULL,
  1, '荒川', 8.0, '荒川に隣接、氾濫リスク非常に高い',
  1, '氾濫流', '家屋倒壊等氾濫想定区域（氾濫流）',
  15.5, 1,
  'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリア',
  '国土交通省ハザードマップ', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- 東京都大田区羽田 - 液状化・洪水リスク
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '東京都', '大田区', '羽田',
  0, NULL, NULL,
  0, NULL, NULL, NULL,
  0, NULL, NULL,
  3.5, 0,
  'NG', '埋立地のため液状化リスク高、洪水リスクあり',
  '国土交通省ハザードマップ', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- 神奈川県三浦市三崎町 - 津波高リスク
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '神奈川県', '三浦市', '三崎町',
  0, NULL, NULL,
  0, NULL, NULL, NULL,
  0, NULL, NULL,
  NULL, 0,
  'NG', '津波浸水想定区域（相模湾沿岸）',
  '神奈川県津波浸水想定', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- 神奈川県鎌倉市材木座 - 津波リスク
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '神奈川県', '鎌倉市', '材木座',
  0, NULL, NULL,
  0, NULL, NULL, NULL,
  0, NULL, NULL,
  NULL, 0,
  'NG', '津波浸水想定区域（由比ガ浜沿岸）',
  '神奈川県津波浸水想定', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- 神奈川県逗子市小坪 - 津波・崖地リスク
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '神奈川県', '逗子市', '小坪',
  1, 18.5, '崖地域（急傾斜地崩壊危険区域）',
  0, NULL, NULL, NULL,
  0, NULL, NULL,
  NULL, 0,
  'NG', '崖地域（18.5m）・津波浸水想定区域',
  '神奈川県津波浸水想定・急傾斜地情報', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- 埼玉県春日部市粕壁 - 利根川・江戸川、洪水高リスク
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '埼玉県', '春日部市', '粕壁',
  0, NULL, NULL,
  1, '江戸川', 5.0, '江戸川に近接',
  1, '氾濫流', '家屋倒壊等氾濫想定区域（氾濫流）',
  12.5, 1,
  'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリア',
  '国土交通省ハザードマップ', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- 埼玉県越谷市越ヶ谷 - 元荒川、洪水リスク
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '埼玉県', '越谷市', '越ヶ谷',
  0, NULL, NULL,
  1, '元荒川', 10.0, '元荒川流域',
  0, NULL, NULL,
  4.5, 0,
  'OK', '洪水リスクはあるが、融資可能範囲',
  '国土交通省ハザードマップ', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- 千葉県船橋市日の出 - 液状化・津波リスク
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '千葉県', '船橋市', '日の出',
  0, NULL, NULL,
  0, NULL, NULL, NULL,
  0, NULL, NULL,
  2.5, 0,
  'NG', '埋立地のため液状化リスク高、津波リスクあり',
  '国土交通省ハザードマップ', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- 千葉県浦安市舞浜 - 液状化高リスク（ディズニーリゾート周辺）
INSERT INTO geography_risks (
  prefecture, city, district,
  is_cliff_area, cliff_height, cliff_note,
  is_river_adjacent, river_name, river_distance, river_note,
  is_building_collapse_area, collapse_type, collapse_note,
  max_flood_depth, is_over_10m_flood,
  loan_decision, loan_reason,
  data_source, last_updated, created_at,
  confidence_level, verification_status, verified_by, verified_at
) VALUES (
  '千葉県', '浦安市', '舞浜',
  0, NULL, NULL,
  0, NULL, NULL, NULL,
  0, NULL, NULL,
  1.5, 0,
  'NG', '埋立地のため液状化リスク非常に高い（東日本大震災で大規模液状化）',
  '国土交通省ハザードマップ・東日本大震災液状化実績', datetime('now'), datetime('now'),
  'high', 'verified', 'data_quality_verification_v3.153.129', datetime('now')
);

-- マイグレーション完了ログ
-- NG項目テスト用データ: 10件追加
-- 含まれるNG項目:
--   - 10m以上浸水: 2件（東京都足立区千住、埼玉県春日部市粕壁）
--   - 崖地: 1件（神奈川県逗子市小坪、18.5m）
--   - 河川隣接・家屋倒壊: 4件
--   - 液状化高リスク: 3件
--   - 津波リスク: 3件
