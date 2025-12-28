-- Phase 5-1: 埼玉県URL補完 バッチ6 (最終バッチ - 3自治体)
-- 生成日時: 2025-12-28
-- 対象自治体: ふじみ野市、三郷市、秩父市（過去のチャットで収集済みURLを使用）

UPDATE building_regulations 
SET data_source_url = 'https://www.city.fujimino.saitama.jp/soshikiichiran/toshikeikakuka/keikaku_kaihatsukakari/6670.html' 
WHERE prefecture = '埼玉県' AND city = 'ふじみ野市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.misato.lg.jp/soshiki/machizukuri_suishin/kaihatsushido/3/1483.html' 
WHERE prefecture = '埼玉県' AND city = '三郷市';

UPDATE building_regulations 
SET data_source_url = 'https://www1.g-reiki.net/chichibu/reiki_honbun/r165RG00000697.html' 
WHERE prefecture = '埼玉県' AND city = '秩父市';
