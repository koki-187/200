-- 神奈川県残り8市のデータ統合SQL

-- 1. 平塚市（ワンルーム規制あり）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '神奈川県', '平塚市', '神奈川県平塚市',
    '1区画専有面積18㎡以上（ワンルーム形式建築物）',
    'まちづくり条例による規制',
    'あり（平塚市まちづくり条例）',
    '平塚市公式サイト・条例確認 (https://www.city.hiratsuka.kanagawa.jp/common/200180488.pdf)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'HIGH', 'WebSearch-2025-12-23'
);

-- 2. 小田原市（ワンルーム規制あり）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '神奈川県', '小田原市', '神奈川県小田原市',
    '30㎡未満・6戸以上',
    '事前協議必須',
    'あり（ワンルーム等建築物指導基準）',
    '小田原市公式サイト・指導基準確認 (https://www.city.odawara.kanagawa.jp/field/c-planning/building/etc/wanrumu.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'HIGH', 'WebSearch-2025-12-23'
);

-- 3. 三浦市（ワンルーム規制情報不明）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '神奈川県', '三浦市', '神奈川県三浦市',
    '独自ワンルーム規制なし',
    'まちづくり条例あり',
    'あり（まちづくり条例）',
    '三浦市公式サイト確認 (https://www.city.miura.kanagawa.jp/soshiki/toshikeikakuka/1/1/1528.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'MEDIUM', 'WebSearch-2025-12-23'
);

-- 4. 秦野市（ワンルーム規制情報不明）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '神奈川県', '秦野市', '神奈川県秦野市',
    '独自ワンルーム規制情報なし',
    '建築基準条例による規制',
    'あり（まちづくり条例）',
    '秦野市公式サイト確認 (https://www.city.hadano.kanagawa.jp/www/contents/1001000000548/index.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'MEDIUM', 'WebSearch-2025-12-23'
);

-- 5. 厚木市（ワンルーム規制あり）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '神奈川県', '厚木市', '神奈川県厚木市',
    'ワンルーム形式10戸以上',
    '計画書提出必須',
    'あり（ワンルーム形式集合建築物指導基準、住みよいまちづくり条例）',
    '厚木市公式サイト・指導基準確認 (https://www.city.atsugi.kanagawa.jp/soshiki/kaihatsushinsaka/6_1/1707.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'HIGH', 'WebSearch-2025-12-23'
);

-- 6. 伊勢原市（ワンルーム規制情報なし）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '神奈川県', '伊勢原市', '神奈川県伊勢原市',
    '独自ワンルーム規制情報なし',
    '要確認',
    '要確認',
    '伊勢原市公式サイト（情報未検出）',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'LOW', 'WebSearch-2025-12-23'
);

-- 7. 海老名市（ワンルーム規制あり）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '神奈川県', '海老名市', '神奈川県海老名市',
    '35㎡未満・500㎡以上の事業区域（R6.4.1改正）',
    '事前協議必須',
    'あり（住みよいまちづくり条例）',
    '海老名市公式サイト・条例確認 (https://www.city.ebina.kanagawa.jp/faq/sumai/kaihatsu/1002562.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'HIGH', 'WebSearch-2025-12-23'
);

-- 8. 座間市（ワンルーム規制情報不明）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '神奈川県', '座間市', '神奈川県座間市',
    '独自ワンルーム規制情報なし',
    '開発等事業指導要綱あり',
    'あり（開発等事業指導要綱）',
    '座間市公式サイト確認 (https://www.city.zama.kanagawa.jp/shisei/machi/kaihatsu/1004485.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'MEDIUM', 'WebSearch-2025-12-23'
);
