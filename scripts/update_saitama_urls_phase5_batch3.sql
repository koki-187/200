-- Phase 5-1: 埼玉県URL補完 バッチ3 (5自治体)
-- 生成日時: 2025-12-28
-- 対象自治体: 深谷市、滑川町、狭山市、白岡市、皆野町

UPDATE building_regulations 
SET data_source_url = 'https://www.city.fukaya.saitama.jp/soshiki/toshiseibi/toshikeikaku/tanto/kaihatukyoka/14708.html' 
WHERE prefecture = '埼玉県' AND city = '深谷市';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.namegawa.saitama.jp/soshikikarasagasu/kensetsuka/kaihatsu_toshikeikaku/1/1295.html' 
WHERE prefecture = '埼玉県' AND city = '滑川町';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.sayama.saitama.jp/shinseisho/bunya/matizukuri/sidoyokojizenkyogi.html' 
WHERE prefecture = '埼玉県' AND city = '狭山市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.shiraoka.lg.jp/soshiki/toshiseibibu/kenchikuka/kaihatu/1151.html' 
WHERE prefecture = '埼玉県' AND city = '白岡市';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.minano.saitama.jp/section/kensetsu/167/' 
WHERE prefecture = '埼玉県' AND city = '皆野町';
