-- Phase 5-1: 埼玉県URL補完 バッチ1 (10自治体)
-- 生成日時: 2025-12-28
-- 対象自治体: ときがわ町、三芳町、伊奈町、入間市、加須市、北本市、吉川市、吉見町、坂戸市、富士見市

UPDATE building_regulations 
SET data_source_url = 'https://www.town.tokigawa.lg.jp/info/2522' 
WHERE prefecture = '埼玉県' AND city = 'ときがわ町';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.saitama-miyoshi.lg.jp/town/toshikeikaku/shidou_youkou.html' 
WHERE prefecture = '埼玉県' AND city = '三芳町';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.saitama-ina.lg.jp/0000000114.html' 
WHERE prefecture = '埼玉県' AND city = '伊奈町';

UPDATE building_regulations 
SET data_source_url = 'https://www1.g-reiki.net/iruma/reiki_honbun/e326RG00000562.html' 
WHERE prefecture = '埼玉県' AND city = '入間市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.kazo.lg.jp/soshiki/kenchiku/kaihatsu/16309.html' 
WHERE prefecture = '埼玉県' AND city = '加須市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.kitamoto.lg.jp/soshiki/toshiseibi/kentiku/gyomu/g2_2/12981.html' 
WHERE prefecture = '埼玉県' AND city = '北本市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.yoshikawa.saitama.jp/index.cfm/27,473,179,914,html' 
WHERE prefecture = '埼玉県' AND city = '吉川市';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.yoshimi.saitama.jp/soshiki/machiseibika/4/717.html' 
WHERE prefecture = '埼玉県' AND city = '吉見町';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.sakado.lg.jp/soshiki/36/112.html' 
WHERE prefecture = '埼玉県' AND city = '坂戸市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.fujimi.saitama.jp/kurashi_tetsuzuki/sumai/jyuutaku/kaihatsukigen080331.html' 
WHERE prefecture = '埼玉県' AND city = '富士見市';
