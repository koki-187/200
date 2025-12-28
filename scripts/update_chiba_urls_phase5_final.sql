-- Phase 5-1: 千葉県URL補完 最終バッチ (5自治体)
-- 生成日時: 2025-12-28
-- 対象自治体: 旭市、東金市、神崎町、酒々井町、香取市（Phase 4で収集済みURLを使用）

UPDATE building_regulations 
SET data_source_url = 'https://www.city.asahi.lg.jp/soshiki/11/2262.html' 
WHERE prefecture = '千葉県' AND city = '旭市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.togane.chiba.jp/0000002037.html' 
WHERE prefecture = '千葉県' AND city = '東金市';

UPDATE building_regulations 
SET data_source_url = 'https://www.pref.chiba.lg.jp/cs-katori/tetsuzuki/kenchikutakuchi/kaihatu.html' 
WHERE prefecture = '千葉県' AND city = '神崎町';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.shisui.chiba.jp/docs/2018101900011/' 
WHERE prefecture = '千葉県' AND city = '酒々井町';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.katori.lg.jp/living/sumai/20190313091203984.html' 
WHERE prefecture = '千葉県' AND city = '香取市';
