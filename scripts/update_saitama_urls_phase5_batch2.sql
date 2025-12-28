-- Phase 5-1: 埼玉県URL補完 バッチ2 (5自治体)
-- 生成日時: 2025-12-28
-- 対象自治体: 小川町、嵐山町、川島町、志木市、日高市、本庄市、東松山市、桶川市、横瀬町、毛呂山町

UPDATE building_regulations 
SET data_source_url = 'https://www.town.ogawa.saitama.jp/gyosei/sosiki/13/5/1/1492.html' 
WHERE prefecture = '埼玉県' AND city = '小川町';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.ranzan.saitama.jp/0000005447.html' 
WHERE prefecture = '埼玉県' AND city = '嵐山町';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.kawajima.saitama.jp/4161.htm' 
WHERE prefecture = '埼玉県' AND city = '川島町';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.shiki.lg.jp/soshiki/30/1763.html' 
WHERE prefecture = '埼玉県' AND city = '志木市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.hidaka.lg.jp/soshiki/toshiseibi/toshikeikaku/kenchikushidokaihatsushido/sumai/1626.html' 
WHERE prefecture = '埼玉県' AND city = '日高市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.honjo.lg.jp/soshiki/toshiseibi/kenchiku/shinseisho/1377760695957.html' 
WHERE prefecture = '埼玉県' AND city = '本庄市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.higashimatsuyama.lg.jp/soshiki/37/4131.html' 
WHERE prefecture = '埼玉県' AND city = '東松山市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.okegawa.lg.jp/soshiki/toshiseibi/kenchiku/machidukuri/kyoka/2222.html' 
WHERE prefecture = '埼玉県' AND city = '桶川市';

UPDATE building_regulations 
SET data_source_url = 'https://www1.g-reiki.net/yokoze/reiki_honbun/e360RG00000374.html' 
WHERE prefecture = '埼玉県' AND city = '横瀬町';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.moroyama.saitama.jp/soshikikarasagasu/machizukuriseibika/kenchiku/1584.html' 
WHERE prefecture = '埼玉県' AND city = '毛呂山町';
