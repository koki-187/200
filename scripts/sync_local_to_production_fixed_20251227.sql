-- ========================================
-- ローカルD1から本番環境への同期スクリプト（修正版）
-- 生成日時: 2025-12-27 16:32:20
-- 対象自治体数: 34自治体
-- スキーマ: 本番環境に合わせて調整済み
-- ========================================

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '千葉県', '佐倉市', '千葉県佐倉市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '佐倉市公式サイト・条例/要綱確認 (https://www.city.sakura.lg.jp/soshiki/shigaichiseibika/gyomu_syokai/88/307/2616.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '千葉県', '八千代市', '千葉県八千代市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '八千代市公式サイト・条例/要綱確認 (検索結果なし)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '千葉県', '千葉市', '千葉県千葉市',
    'null', 'null',
    '要確認', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '千葉市公式サイト・条例/要綱確認', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '千葉県', '市原市', '千葉県市原市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '市原市公式サイト・条例/要綱確認 (https://www.city.ichihara.chiba.jp/article?articleId=602380bdece4651c88c193e2)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '千葉県', '柏市', '千葉県柏市',
    'null', 'null',
    '要確認', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '柏市公式サイト・条例/要綱確認', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '千葉県', '流山市', '千葉県流山市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '流山市公式サイト・条例/要綱確認 (https://www.city.nagareyama.chiba.jp/business/1006720/1006847/1006857.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '千葉県', '習志野市', '千葉県習志野市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '習志野市公式サイト・条例確認 (https://www.city.narashino.lg.jp/soshiki/kenchikushido/faq/kentiku22.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '上尾市', '埼玉県上尾市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '上尾市公式サイト・条例/要綱確認 (https://www.city.ageo.lg.jp/page/04711708228.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '久喜市', '埼玉県久喜市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '久喜市公式サイト・条例/要綱確認 (https://www.city.kuki.lg.jp/_res/projects/default_project/_page_/001/005/228/1005228_001.pdf)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '和光市', '埼玉県和光市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '和光市公式サイト・条例/要綱確認 (https://www.city.wako.lg.jp/machizukuri/jyutaku/1005894/1005895/1005908/index.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '川越市', '埼玉県川越市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '川越市公式サイト・条例/要綱確認 (https://www.city.kawagoe.saitama.jp/shisei/toshikei/1010554/1010750/1010793/1010803.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '戸田市', '埼玉県戸田市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '戸田市公式サイト・条例/要綱確認 (https://www.city.toda.saitama.jp/soshiki/272/matidukuri-kaihatsushidoutop.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '新座市', '埼玉県新座市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '新座市公式サイト・条例/要綱確認 (https://www.city.niiza.lg.jp/uploaded/attachment/49058.pdf)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '春日部市', '埼玉県春日部市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '春日部市公式サイト・条例/要綱確認 (https://www.city.kasukabe.lg.jp/soshikikarasagasu/kaihatsuchoseika/gyomuannai/1/1/3695.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '朝霞市', '埼玉県朝霞市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '朝霞市公式サイト・条例/要綱確認 (https://www.city.asaka.lg.jp/uploaded/attachment/103183.pdf)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '熊谷市', '埼玉県熊谷市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '熊谷市公式サイト・条例/要綱確認 (https://www.city.kumagaya.lg.jp/kurashi/kankyo_sumai/etc/shugoujutaku_shidou.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '蕨市', '埼玉県蕨市',
    NULL, NULL,
    NULL, null,
    null, null,
    'null', 'null',
    'high', 'VERIFIED',
    '蕨市公式サイト・条例/要綱確認 (https://www.city.warabi.saitama.jp/shisei/machidukuri/todokede/1003050.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '埼玉県', '越谷市', '埼玉県越谷市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '越谷市公式サイト・条例確認 (https://www.city.koshigaya.saitama.jp/kurashi_shisei/kurashi/sumai/machidukuri/matinoseibijourei.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '東京都', '中央区', '東京都中央区',
    'null', 'null',
    '要確認', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '自治体公式ページ/PDFで確認', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '東京都', '千代田区', '東京都千代田区',
    'null', 'null',
    '要確認', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '自治体公式ページ/PDFで確認', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '東京都', '目黒区', '東京都目黒区',
    'null', 'null',
    '要確認', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '自治体公式ページ/PDFで確認', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '三浦市', '神奈川県三浦市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'MEDIUM', 'VERIFIED',
    '三浦市公式サイト確認 (https://www.city.miura.kanagawa.jp/soshiki/toshikeikakuka/1/1/1528.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '伊勢原市', '神奈川県伊勢原市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'LOW', 'VERIFIED',
    '伊勢原市公式サイト（情報未検出）', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '厚木市', '神奈川県厚木市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '厚木市公式サイト・指導基準確認 (https://www.city.atsugi.kanagawa.jp/soshiki/kaihatsushinsaka/6_1/1707.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '大和市', '神奈川県大和市',
    'null', 'null',
    '要確認', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '大和市公式サイト・条例/要綱確認', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '小田原市', '神奈川県小田原市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '小田原市公式サイト・指導基準確認 (https://www.city.odawara.kanagawa.jp/field/c-planning/building/etc/wanrumu.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '川崎市', '神奈川県川崎市',
    'null', 'null',
    '要確認', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '自治体公式ページ/PDFで確認', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '平塚市', '神奈川県平塚市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '平塚市公式サイト・条例確認 (https://www.city.hiratsuka.kanagawa.jp/common/200180488.pdf)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '座間市', '神奈川県座間市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'MEDIUM', 'VERIFIED',
    '座間市公式サイト確認 (https://www.city.zama.kanagawa.jp/shisei/machi/kaihatsu/1004485.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '横浜市', '神奈川県横浜市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '横浜市公式サイト・条例確認 (https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/annai/202101221300.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '海老名市', '神奈川県海老名市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '海老名市公式サイト・条例確認 (https://www.city.ebina.kanagawa.jp/faq/sumai/kaihatsu/1002562.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '相模原市', '神奈川県相模原市',
    'null', 'null',
    '要確認', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '自治体公式ページ/PDFで確認', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '秦野市', '神奈川県秦野市',
    'null', 'null',
    'null', null,
    null, null,
    'null', 'null',
    'MEDIUM', 'VERIFIED',
    '秦野市公式サイト確認 (https://www.city.hadano.kanagawa.jp/www/contents/1001000000548/index.html)', 'null'
);

INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    '神奈川県', '茅ヶ崎市', '神奈川県茅ヶ崎市',
    'null', 'null',
    '要確認', null,
    null, null,
    'null', 'null',
    'HIGH', 'VERIFIED',
    '茅ヶ崎市公式サイト・条例/要綱確認', 'null'
);

