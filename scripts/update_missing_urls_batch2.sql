-- Phase 4-2: URL未設定自治体のURL補完（千葉県バッチ2、埼玉県は別途実施）
-- 生成日時: 2025-12-28 05:58:00
-- 対象自治体数: 11件（千葉県のみ）

-- URL更新（千葉県バッチ2）

UPDATE building_regulations 
SET data_source_url = 'https://www.city.tomisato.lg.jp/0000001889.html',
    data_source = '千葉県公式サイト・富里市公式サイト'
WHERE prefecture = '千葉県' AND city = '富里市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.sammu.lg.jp/shisei/toshi/takuchi/page001976.html',
    data_source = '千葉県公式サイト・山武市公式サイト'
WHERE prefecture = '千葉県' AND city = '山武市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www1.g-reiki.net/tohnosho/reiki_honbun/g049RG00000626.html',
    data_source = '千葉県公式サイト・東庄町公式サイト'
WHERE prefecture = '千葉県' AND city = '東庄町' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.sakae.chiba.jp/page/page000200.html',
    data_source = '千葉県公式サイト・栄町公式サイト'
WHERE prefecture = '千葉県' AND city = '栄町' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.urayasu.lg.jp/todokede/machi/sumai/todokede/1000625.html',
    data_source = '千葉県公式サイト・浦安市公式サイト'
WHERE prefecture = '千葉県' AND city = '浦安市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.shiroi.chiba.jp/soshiki/kankyo/k05/tos001/tos009/tos010/1524190082093.html',
    data_source = '千葉県公式サイト・白井市公式サイト'
WHERE prefecture = '千葉県' AND city = '白井市' AND verification_status = 'VERIFIED';

-- 残りの千葉県（WebSearch結果を元に追記予定）
-- 神崎町、酒々井町、香取市は別途検索

-- 実行後の確認
SELECT prefecture, city, data_source_url 
FROM building_regulations 
WHERE verification_status='VERIFIED' 
  AND prefecture='千葉県'
  AND city IN ('富里市', '山武市', '東庄町', '栄町', '浦安市', '白井市')
ORDER BY city;
