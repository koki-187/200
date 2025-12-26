-- 千葉県3市 + 埼玉県9市のデータ統合用SQLスクリプト
-- 生成日時: 2025-12-26
-- 対象: 八千代市、市原市、佐倉市（千葉県）+ 熊谷市、春日部市、上尾市、戸田市、蕨市、朝霞市、和光市、新座市、久喜市（埼玉県）

-- 千葉県: 八千代市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '千葉県', '八千代市', '', '', NULL, NULL,
  '千葉県八千代市', '',
  'ワンルーム規制情報なし（検索結果0件）', '', 'なし（検索結果0件）',
  NULL, NULL, 1,
  '八千代市公式サイト・条例/要綱確認 (検索結果なし)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 千葉県: 市原市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '千葉県', '市原市', '', '', NULL, NULL,
  '千葉県市原市', '',
  '25㎡未満・8戸以上（ワンルーム形式共同住宅）', '近隣通知: 事前説明要', 'あり（中高層建築物等の紛争予防調整条例）',
  NULL, NULL, 1,
  '市原市公式サイト・条例/要綱確認 (https://www.city.ichihara.chiba.jp/article?articleId=602380bdece4651c88c193e2)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 千葉県: 佐倉市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '千葉県', '佐倉市', '', '', NULL, NULL,
  '千葉県佐倉市', '',
  'ワンルーム指導要綱併用', '近隣通知: 中高層建築物指導要綱', 'あり（開発事業の手続及び基準に関する条例、平成23年10月施行）',
  NULL, NULL, 1,
  '佐倉市公式サイト・条例/要綱確認 (https://www.city.sakura.lg.jp/soshiki/shigaichiseibika/gyomu_syokai/88/307/2616.html)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 埼玉県: 熊谷市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '埼玉県', '熊谷市', '', '', NULL, NULL,
  '埼玉県熊谷市', '',
  '15戸以上の集合住宅が対象', '近隣通知: 中高層建築物紛争防止条例', 'あり（集合住宅の建築に関する指導要綱、平成24年12月改正）',
  NULL, NULL, 1,
  '熊谷市公式サイト・条例/要綱確認 (https://www.city.kumagaya.lg.jp/kurashi/kankyo_sumai/etc/shugoujutaku_shidou.html)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 埼玉県: 春日部市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '埼玉県', '春日部市', '', '', NULL, NULL,
  '埼玉県春日部市', '',
  'ワンルーム規制は開発事業条例に統合', '近隣通知: 開発行為等指導要綱廃止（条例施行前）', 'あり（開発事業の手続及び基準に関する条例）',
  NULL, NULL, 1,
  '春日部市公式サイト・条例/要綱確認 (https://www.city.kasukabe.lg.jp/soshikikarasagasu/kaihatsuchoseika/gyomuannai/1/1/3695.html)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 埼玉県: 上尾市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '埼玉県', '上尾市', '', '', NULL, NULL,
  '埼玉県上尾市', '',
  'ワンルームマンション事前協議書の提出要', '近隣通知: 要綱ベース', 'あり（上尾市要綱に基づくワンルーム事前協議）',
  NULL, NULL, 1,
  '上尾市公式サイト・条例/要綱確認 (https://www.city.ageo.lg.jp/page/04711708228.html)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 埼玉県: 戸田市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '埼玉県', '戸田市', '', '', NULL, NULL,
  '埼玉県戸田市', '',
  'ワンルーム規制あり（宅地開発事業等指導条例）', '近隣通知: 宅地開発事業等指導条例', 'あり（宅地開発事業等指導条例、平成29年1月施行）',
  NULL, NULL, 1,
  '戸田市公式サイト・条例/要綱確認 (https://www.city.toda.saitama.jp/soshiki/272/matidukuri-kaihatsushidoutop.html)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 埼玉県: 蕨市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '埼玉県', '蕨市', '', '', NULL, NULL,
  '埼玉県蕨市', '',
  'ワンルーム形式集合住宅指導要綱廃止（まちづくり指導要綱に統合）', '近隣通知: まちづくり指導要綱', 'あり（まちづくり指導要綱、平成17年9月）',
  NULL, NULL, 1,
  '蕨市公式サイト・条例/要綱確認 (https://www.city.warabi.saitama.jp/shisei/machidukuri/todokede/1003050.html)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 埼玉県: 朝霞市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '埼玉県', '朝霞市', '', '', NULL, NULL,
  '埼玉県朝霞市', '',
  '主たる居室が1の共同住宅（ワンルーム形式）、最低室面積25㎡', '近隣通知: 開発事業等条例', 'あり（開発事業等の手続及び基準等に関する条例）',
  NULL, NULL, 1,
  '朝霞市公式サイト・条例/要綱確認 (https://www.city.asaka.lg.jp/uploaded/attachment/103183.pdf)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 埼玉県: 和光市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '埼玉県', '和光市', '', '', NULL, NULL,
  '埼玉県和光市', '',
  '専用面積35㎡以上の住戸に対して義務化（令和6年4月改正）', '近隣通知: まちづくり条例', 'あり（まちづくり条例、令和6年4月改正）',
  NULL, NULL, 1,
  '和光市公式サイト・条例/要綱確認 (https://www.city.wako.lg.jp/machizukuri/jyutaku/1005894/1005895/1005908/index.html)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 埼玉県: 新座市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '埼玉県', '新座市', '', '', NULL, NULL,
  '埼玉県新座市', '',
  '25㎡未満・10戸以上（ワンルーム形式集合住宅指導要綱）', '近隣通知: 指導要綱ベース', 'あり（ワンルーム形式集合住宅に関する指導要綱）',
  NULL, NULL, 1,
  '新座市公式サイト・条例/要綱確認 (https://www.city.niiza.lg.jp/uploaded/attachment/49058.pdf)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 埼玉県: 久喜市
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end,
  normalized_address, zoning_type,
  apartment_restrictions_note, building_restrictions_note, development_guideline,
  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,
  data_source, verification_status, verified_at, last_updated, created_at
) VALUES (
  '埼玉県', '久喜市', '', '', NULL, NULL,
  '埼玉県久喜市', '',
  '計画戸数4戸以上でゴミ集積場設置（集合住宅建築物指導指針）', '近隣通知: 集合住宅建築物指導指針', 'あり（集合住宅建築物の建築に関する指導指針）',
  NULL, NULL, 1,
  '久喜市公式サイト・条例/要綱確認 (https://www.city.kuki.lg.jp/_res/projects/default_project/_page_/001/005/228/1005228_001.pdf)', 'VERIFIED', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
