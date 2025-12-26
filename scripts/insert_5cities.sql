-- 優先度A自治体5市のデータ統合SQL

-- 1. 横浜市（ワンルーム規制廃止済み）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '神奈川県', '横浜市', '神奈川県横浜市',
    'ワンルーム指導基準は令和3年4月1日廃止',
    '建築基準条例による規制',
    'あり（自転車駐車場附置義務条例、駐車場条例）',
    '横浜市公式サイト・条例確認 (https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/annai/202101221300.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'HIGH', 'WebSearch-2025-12-23'
);

-- 2. 川越市（ワンルーム規制あり）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '埼玉県', '川越市', '埼玉県川越市',
    '25㎡以下・7戸以上',
    '標識設置・事前協議必須',
    'あり（小規模住戸形式集合住宅指導要綱、駐車場附置義務条例）',
    '川越市公式サイト・条例/要綱確認 (https://www.city.kawagoe.saitama.jp/shisei/toshikei/1010554/1010750/1010793/1010803.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'HIGH', 'WebSearch-2025-12-23'
);

-- 3. 越谷市（まちの整備条例に統合）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '埼玉県', '越谷市', '埼玉県越谷市',
    'ワンルーム規制あり（まちの整備条例に統合）',
    '中高層建築物:高さ10m超または延床1000㎡以上で事前協議',
    'あり（まちの整備に関する条例、駐輪場附置義務）',
    '越谷市公式サイト・条例確認 (https://www.city.koshigaya.saitama.jp/kurashi_shisei/kurashi/sumai/machidukuri/matinoseibijourei.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'HIGH', 'WebSearch-2025-12-23'
);

-- 4. 流山市（開発事業許可基準等条例）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '千葉県', '流山市', '千葉県流山市',
    '専ら単身者用住戸（ワンルーム建築物）',
    '中高層・ワンルーム・特定用途は事前協議必須',
    'あり（開発事業許可基準等条例、整備基準）',
    '流山市公式サイト・条例/要綱確認 (https://www.city.nagareyama.chiba.jp/business/1006720/1006847/1006857.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'HIGH', 'WebSearch-2025-12-23'
);

-- 5. 習志野市（特定建築行為条例）
INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    apartment_restrictions_note,
    building_restrictions_note,
    development_guideline,
    data_source,
    verification_status, verified_at,
    confidence_level, verified_by
) VALUES (
    '千葉県', '習志野市', '千葉県習志野市',
    '住戸面積16㎡以上',
    '高さ10m超の建築物は事前協議必須',
    'あり（特定建築行為条例、H25.5.1施行）',
    '習志野市公式サイト・条例確認 (https://www.city.narashino.lg.jp/soshiki/kenchikushido/faq/kentiku22.html)',
    'VERIFIED', '2025-12-23T00:00:00Z',
    'HIGH', 'WebSearch-2025-12-23'
);
