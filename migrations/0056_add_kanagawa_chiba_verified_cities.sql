-- Migration: 0056_add_kanagawa_chiba_verified_cities.sql
-- Version: v3.153.139
-- Date: 2025-12-19
-- Description: Add VERIFIED data for Kanagawa (4 cities) and Chiba (5 cities)
-- Source: kanagawa_chiba_summary.csv and kanagawa_chiba_diff.sql

-- ============================================================================
-- 神奈川県 VERIFIED 4市
-- ============================================================================

-- 1. 藤沢市: ワンルーム規制あり（3階以上・10戸以上・30㎡未満）
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status, last_fact_checked
) VALUES (
  '神奈川県', '藤沢市', NULL, NULL, NULL, NULL,
  '神奈川県藤沢市',
  '要確認', NULL, NULL,
  1, NULL,
  'あり（特定開発事業条例）', 'https://www.city.fujisawa.kanagawa.jp/kaihatsu/',
  '藤沢市公式サイト・条例確認', 'HIGH', 'VERIFIED', '2025-12-19'
);

INSERT INTO building_design_requirements (
  building_regulation_id, prefecture, city,
  waste_storage_required, waste_separation_required,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required, signboard_period_days,
  min_unit_area,
  studio_definition,
  outdoor_staircase_allowed
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='神奈川県' AND city='藤沢市' AND verification_status='VERIFIED' LIMIT 1),
  '神奈川県', '藤沢市',
  1, 1,
  1, 1,
  1, 10,
  30,
  '3階以上・10戸以上・30㎡未満の住戸',
  1
);

INSERT INTO local_specific_requirements (
  building_regulation_id, prefecture, city,
  has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
  notes
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='神奈川県' AND city='藤沢市' AND verification_status='VERIFIED' LIMIT 1),
  '神奈川県', '藤沢市',
  1, 1, 1, 1,
  '掲示10日→説明会→縦覧10日の手続フローあり。駐車場・自転車駐輪場・ゴミ置場は条例で規定。'
);

-- 2. 茅ヶ崎市: 独自ワンルーム規制なし（建基法40条上乗せあり）
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status, last_fact_checked
) VALUES (
  '神奈川県', '茅ヶ崎市', NULL, NULL, NULL, NULL,
  '神奈川県茅ヶ崎市',
  '要確認', NULL, NULL,
  1, NULL,
  'あり（建築基準条例40条上乗せ）', 'https://www.city.chigasaki.kanagawa.jp/',
  '茅ヶ崎市公式サイト・条例確認', 'HIGH', 'VERIFIED', '2025-12-19'
);

INSERT INTO building_design_requirements (
  building_regulation_id, prefecture, city,
  waste_storage_required, waste_separation_required,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required,
  outdoor_staircase_allowed
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='神奈川県' AND city='茅ヶ崎市' AND verification_status='VERIFIED' LIMIT 1),
  '神奈川県', '茅ヶ崎市',
  1, 1,
  1, 0,
  0,
  1
);

INSERT INTO local_specific_requirements (
  building_regulation_id, prefecture, city,
  has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
  notes
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='神奈川県' AND city='茅ヶ崎市' AND verification_status='VERIFIED' LIMIT 1),
  '神奈川県', '茅ヶ崎市',
  1, 1, 1, 0,
  '独自ワンルーム規制なし。建基法40条上乗せ（敷地内通路幅員）あり。手続条例・駐車場・自転車・ゴミは条例で規定。'
);

-- 3. 大和市: ワンルーム規制あり（3階以上・10戸以上・30㎡未満）
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status, last_fact_checked
) VALUES (
  '神奈川県', '大和市', NULL, NULL, NULL, NULL,
  '神奈川県大和市',
  '要確認', NULL, NULL,
  1, NULL,
  'あり（建築基準条例）', 'https://www.city.yamato.lg.jp/',
  '大和市公式サイト・条例確認', 'HIGH', 'VERIFIED', '2025-12-19'
);

INSERT INTO building_design_requirements (
  building_regulation_id, prefecture, city,
  waste_storage_required, waste_separation_required,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required,
  min_unit_area,
  studio_definition,
  outdoor_staircase_allowed
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='神奈川県' AND city='大和市' AND verification_status='VERIFIED' LIMIT 1),
  '神奈川県', '大和市',
  1, 1,
  1, 1,
  1,
  30,
  '3階以上・10戸以上・30㎡未満の住戸',
  1
);

INSERT INTO local_specific_requirements (
  building_regulation_id, prefecture, city,
  has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
  notes
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='神奈川県' AND city='大和市' AND verification_status='VERIFIED' LIMIT 1),
  '神奈川県', '大和市',
  1, 1, 1, 1,
  '条例手続あり。駐車場・自転車駐輪場・ゴミ置場は条例で規定。'
);

-- 4. 横須賀市: 独自規制なし（建基法のみ）
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status, last_fact_checked
) VALUES (
  '神奈川県', '横須賀市', NULL, NULL, NULL, NULL,
  '神奈川県横須賀市',
  '要確認', NULL, NULL,
  1, NULL,
  'あり（建築基準条例・駐車条例）', 'https://www.city.yokosuka.kanagawa.jp/',
  '横須賀市公式サイト・条例確認', 'HIGH', 'VERIFIED', '2025-12-19'
);

INSERT INTO building_design_requirements (
  building_regulation_id, prefecture, city,
  waste_storage_required, waste_separation_required,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required,
  outdoor_staircase_allowed
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='神奈川県' AND city='横須賀市' AND verification_status='VERIFIED' LIMIT 1),
  '神奈川県', '横須賀市',
  1, 1,
  1, 0,
  0,
  1
);

INSERT INTO local_specific_requirements (
  building_regulation_id, prefecture, city,
  has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
  notes
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='神奈川県' AND city='横須賀市' AND verification_status='VERIFIED' LIMIT 1),
  '神奈川県', '横須賀市',
  1, 1, 1, 0,
  '独自ワンルーム規制なし（建基法のみ）。条例手続・駐車条例・自転車・ゴミは条例で規定。'
);

-- ============================================================================
-- 千葉県 VERIFIED 5市
-- ============================================================================

-- 5. 千葉市: ワンルーム規制あり（29㎡以下・6戸以上・全体の1/3以上）
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status, last_fact_checked
) VALUES (
  '千葉県', '千葉市', NULL, NULL, NULL, NULL,
  '千葉県千葉市',
  '要確認', NULL, NULL,
  1, NULL,
  'あり（ワンルーム建築指導）', 'https://www.city.chiba.jp/',
  '千葉市公式サイト・要綱確認', 'HIGH', 'VERIFIED', '2025-12-19'
);

INSERT INTO building_design_requirements (
  building_regulation_id, prefecture, city,
  waste_storage_required, waste_separation_required,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required,
  min_unit_area,
  studio_definition,
  studio_ratio_threshold,
  outdoor_staircase_allowed
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='千葉市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '千葉市',
  1, 1,
  1, 1,
  1,
  29,
  '29㎡以下・6戸以上の住戸',
  0.33,
  1
);

INSERT INTO local_specific_requirements (
  building_regulation_id, prefecture, city,
  has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
  notes
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='千葉市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '千葉市',
  1, 1, 1, 1,
  '29㎡以下が6戸以上かつ全体の1/3以上の場合に適用。事前協議制度あり。駐車場・自転車・ゴミは条例で規定。'
);

-- 6. 船橋市: ワンルーム規制あり（25㎡未満・8戸以上）
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status, last_fact_checked
) VALUES (
  '千葉県', '船橋市', NULL, NULL, NULL, NULL,
  '千葉県船橋市',
  '要確認', NULL, NULL,
  1, NULL,
  'あり（ワンルーム形式共同住宅指導）', 'https://www.city.funabashi.lg.jp/',
  '船橋市公式サイト・要綱確認', 'HIGH', 'VERIFIED', '2025-12-19'
);

INSERT INTO building_design_requirements (
  building_regulation_id, prefecture, city,
  waste_storage_required, waste_separation_required,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required,
  min_unit_area,
  studio_definition,
  outdoor_staircase_allowed
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='船橋市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '船橋市',
  1, 1,
  1, 1,
  1,
  25,
  '25㎡未満・8戸以上の住戸',
  1
);

INSERT INTO local_specific_requirements (
  building_regulation_id, prefecture, city,
  has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
  notes
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='船橋市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '船橋市',
  1, 1, 1, 1,
  '25㎡未満・8戸以上が対象。説明要。駐車場・自転車・ゴミは条例で規定。'
);

-- 7. 市川市: 管理体制要件（30戸以上）
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status, last_fact_checked
) VALUES (
  '千葉県', '市川市', NULL, NULL, NULL, NULL,
  '千葉県市川市',
  '要確認', NULL, NULL,
  1, NULL,
  'あり（集合住宅管理指針）', 'https://www.city.ichikawa.lg.jp/',
  '市川市公式サイト・指針確認', 'HIGH', 'VERIFIED', '2025-12-19'
);

INSERT INTO building_design_requirements (
  building_regulation_id, prefecture, city,
  waste_storage_required, waste_separation_required,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required,
  manager_room_required, manager_room_threshold,
  outdoor_staircase_allowed
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='市川市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '市川市',
  1, 1,
  1, 0,
  1,
  1, 30,
  1
);

INSERT INTO local_specific_requirements (
  building_regulation_id, prefecture, city,
  has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
  notes
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='市川市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '市川市',
  1, 1, 1, 0,
  '独自ワンルーム規制なし。30戸以上で管理体制が必要。表示要。駐車場・自転車・ゴミは条例で規定。'
);

-- 8. 松戸市: ワンルーム規制あり（事前公開板14日）
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status, last_fact_checked
) VALUES (
  '千葉県', '松戸市', NULL, NULL, NULL, NULL,
  '千葉県松戸市',
  '要確認', NULL, NULL,
  1, NULL,
  'あり（ワンルーム指導要綱）', 'https://www.city.matsudo.chiba.jp/',
  '松戸市公式サイト・要綱確認', 'HIGH', 'VERIFIED', '2025-12-19'
);

INSERT INTO building_design_requirements (
  building_regulation_id, prefecture, city,
  waste_storage_required, waste_separation_required,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required, signboard_period_days,
  outdoor_staircase_allowed
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='松戸市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '松戸市',
  1, 1,
  1, 1,
  1, 14,
  1
);

INSERT INTO local_specific_requirements (
  building_regulation_id, prefecture, city,
  has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
  notes
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='松戸市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '松戸市',
  1, 1, 1, 1,
  '事前公開板14日の掲示期間あり。説明要。駐車場・自転車・ゴミは条例で規定。'
);

-- 9. 柏市: 独自規制なし（開発事業条例統合）
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address,
  zoning_type, building_coverage_ratio, floor_area_ratio,
  apartment_construction_feasible, apartment_infeasibility_reason,
  development_guideline, development_guideline_url,
  data_source, confidence_level, verification_status, last_fact_checked
) VALUES (
  '千葉県', '柏市', NULL, NULL, NULL, NULL,
  '千葉県柏市',
  '要確認', NULL, NULL,
  1, NULL,
  'あり（開発事業条例統合）', 'https://www.city.kashiwa.lg.jp/',
  '柏市公式サイト・条例確認', 'HIGH', 'VERIFIED', '2025-12-19'
);

INSERT INTO building_design_requirements (
  building_regulation_id, prefecture, city,
  waste_storage_required, waste_separation_required,
  neighbor_explanation_required, pre_consultation_required,
  signboard_required,
  outdoor_staircase_allowed
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='柏市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '柏市',
  1, 1,
  1, 1,
  1,
  1
);

INSERT INTO local_specific_requirements (
  building_regulation_id, prefecture, city,
  has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
  notes
) VALUES (
  (SELECT id FROM building_regulations WHERE prefecture='千葉県' AND city='柏市' AND verification_status='VERIFIED' LIMIT 1),
  '千葉県', '柏市',
  1, 1, 1, 1,
  '独自ワンルーム規制なし（旧要綱廃止・開発事業条例に統合）。条例手続あり。駐車場・自転車・ゴミは条例で規定。'
);
