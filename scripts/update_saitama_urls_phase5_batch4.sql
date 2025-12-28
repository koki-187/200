-- Phase 5-1: 埼玉県URL補完 バッチ4 (5自治体)
-- 生成日時: 2025-12-28
-- 対象自治体: 羽生市、蓮田市、行田市、越生町、飯能市

UPDATE building_regulations 
SET data_source_url = 'https://www.city.hanyu.lg.jp/docs/2015030300196/' 
WHERE prefecture = '埼玉県' AND city = '羽生市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.hasuda.saitama.jp/kenchiku/machi/kenchiku/yoko/shidoyoko.html' 
WHERE prefecture = '埼玉県' AND city = '蓮田市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.gyoda.lg.jp/soshiki/toshiseibibu/kenchiku_kaihatsu/kaihatsu/1296.html' 
WHERE prefecture = '埼玉県' AND city = '行田市';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.ogose.saitama.jp/kamei/machi/toshi/gyomuannai/1519964804083.html' 
WHERE prefecture = '埼玉県' AND city = '越生町';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.hanno.lg.jp/soshikikarasagasu/kensetsubu/toshikeikakuka/702.html' 
WHERE prefecture = '埼玉県' AND city = '飯能市';
