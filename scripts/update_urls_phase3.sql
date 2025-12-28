-- Phase 3-1: URL補完UPDATE文
-- 作成日時: 2025-12-28
-- 対象: 千葉県27自治体 + 埼玉県37自治体

-- Phase 3-1: 千葉県のURL補完
-- 対象: 6自治体

UPDATE building_regulations SET data_source_url = 'https://www.city.yotsukaido.chiba.jp/kurashi/sumai/sumai/kaihatu-koui.html' WHERE prefecture = '千葉県' AND city = '四街道市' AND verification_status = 'VERIFIED';
UPDATE building_regulations SET data_source_url = 'https://www.city.abiko.chiba.jp/jigyousha/kaihatsu_shinsei/koui/jorei_kijun.html' WHERE prefecture = '千葉県' AND city = '我孫子市' AND verification_status = 'VERIFIED';
UPDATE building_regulations SET data_source_url = 'https://www.city.mobara.chiba.jp/0000000359.html' WHERE prefecture = '千葉県' AND city = '茂原市' AND verification_status = 'VERIFIED';
UPDATE building_regulations SET data_source_url = 'https://www.city.sodegaura.lg.jp/soshiki/kaihatsu/kaihatsukyokanogaiyou.html' WHERE prefecture = '千葉県' AND city = '袖ケ浦市' AND verification_status = 'VERIFIED';
UPDATE building_regulations SET data_source_url = 'http://www.city.kamagaya.chiba.jp/sesakumidashi/soshiki-annai/toshikensetsu/toshikeikaku/kaihatsu.html' WHERE prefecture = '千葉県' AND city = '鎌ケ谷市' AND verification_status = 'VERIFIED';
UPDATE building_regulations SET data_source_url = 'https://www.city.kamogawa.lg.jp/soshiki/26/1182.html' WHERE prefecture = '千葉県' AND city = '鴨川市' AND verification_status = 'VERIFIED';

-- Phase 3-1: 埼玉県のURL補完
-- 対象: 0自治体
