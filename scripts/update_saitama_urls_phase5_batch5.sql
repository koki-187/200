-- Phase 5-1: 埼玉県URL補完 バッチ5 (最終バッチ - 4自治体)
-- 生成日時: 2025-12-28
-- 対象自治体: 鳩山町、鴻巣市、鶴ヶ島市、長瀞町

UPDATE building_regulations 
SET data_source_url = 'https://www.town.hatoyama.saitama.jp/jigyousha/kaihaut_kenitku/page003541.html' 
WHERE prefecture = '埼玉県' AND city = '鳩山町';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.kounosu.saitama.jp/page/3748.html' 
WHERE prefecture = '埼玉県' AND city = '鴻巣市';

UPDATE building_regulations 
SET data_source_url = 'https://www.city.tsurugashima.lg.jp/shigoto-sangyou/toshikeikaku/kaihatsu/page001324.html' 
WHERE prefecture = '埼玉県' AND city = '鶴ヶ島市';

UPDATE building_regulations 
SET data_source_url = 'https://www.town.nagatoro.saitama.jp/sangyou-doboku-kenchiku/%E9%96%8B%E7%99%BA%E8%A1%8C%E7%82%BA%E7%AD%89%E3%81%AE%E4%BA%8B%E5%89%8D%E5%8D%94%E8%AD%B0%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6/' 
WHERE prefecture = '埼玉県' AND city = '長瀞町';
