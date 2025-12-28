-- Phase 4-2: URL未設定自治体のURL補完（千葉県バッチ1）
-- 生成日時: 2025-12-28 05:56:00
-- 対象自治体数: 10件

-- 実行前の確認
SELECT prefecture, city, data_source_url 
FROM building_regulations 
WHERE verification_status='VERIFIED' 
  AND prefecture='千葉県'
  AND (data_source_url IS NULL OR data_source_url = '')
ORDER BY city;

-- URL更新（千葉県）

UPDATE building_regulations 
SET data_source_url = 'https://www.city.isumi.lg.jp/gyosei/kurashi_tetsuzuki/kankyo_seibi/2803.html',
    data_source = '千葉県公式サイト・いすみ市公式サイト'
WHERE prefecture = '千葉県' AND city = 'いすみ市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.yachimata.lg.jp/soshiki/24/13128.html',
    data_source = '千葉県公式サイト・八街市公式サイト'
WHERE prefecture = '千葉県' AND city = '八街市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.katsuura.lg.jp/page/1043.html',
    data_source = '千葉県公式サイト・勝浦市公式サイト'
WHERE prefecture = '千葉県' AND city = '勝浦市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www1.g-reiki.net/sosa/reiki_honbun/r325RG00000429.html',
    data_source = '千葉県公式サイト・匝瑳市公式サイト'
WHERE prefecture = '千葉県' AND city = '匝瑳市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.minamiboso.chiba.jp/0000001835.html',
    data_source = '千葉県公式サイト・南房総市公式サイト'
WHERE prefecture = '千葉県' AND city = '南房総市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.inzai.lg.jp/0000012485.html',
    data_source = '千葉県公式サイト・印西市公式サイト'
WHERE prefecture = '千葉県' AND city = '印西市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.kimitsu.lg.jp/soshiki/28/666.html',
    data_source = '千葉県公式サイト・君津市公式サイト'
WHERE prefecture = '千葉県' AND city = '君津市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.tako.chiba.jp/docs/2018011900262/',
    data_source = '千葉県公式サイト・多古町公式サイト'
WHERE prefecture = '千葉県' AND city = '多古町' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.oamishirasato.lg.jp/0000000738.html',
    data_source = '千葉県公式サイト・大網白里市公式サイト'
WHERE prefecture = '千葉県' AND city = '大網白里市' AND verification_status = 'VERIFIED';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.futtsu.lg.jp/0000000111.html',
    data_source = '千葉県公式サイト・富津市公式サイト'
WHERE prefecture = '千葉県' AND city = '富津市' AND verification_status = 'VERIFIED';

-- 実行後の確認
SELECT prefecture, city, data_source_url 
FROM building_regulations 
WHERE verification_status='VERIFIED' 
  AND prefecture='千葉県'
  AND city IN ('いすみ市', '八街市', '勝浦市', '匝瑳市', '南房総市', '印西市', '君津市', '多古町', '大網白里市', '富津市')
ORDER BY city;
