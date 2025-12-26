-- 28自治体データ統合スクリプト（東京23自治体、神奈川1、千葉4）
-- 生成日: 2025-12-26

-- 東京都 - 港区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, normalized_address, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '港区', '東京都港区', '全域', '単身者向け共同住宅等の建築及び管理に関する条例',
  '総戸数15戸以上、最低住戸面積25㎡以上',
  '最低住戸面積25㎡以上',
  '港区公式サイト', 'https://www.city.minato.tokyo.jp/jutakushien/kankyo-machi/toshikekaku/kyodojutaku/',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 文京区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '文京区', '全域', 'ワンルームマンション条例',
  '専用面積25㎡以上',
  '最低住戸面積25㎡以上',
  '文京区公式サイト', 'https://www.city.bunkyo.lg.jp/bunka-kanko/kanko/machinami/madoguchi/jutaku/syugojutaku/jyorei.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 台東区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, apartment_parking_note, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '台東区', '全域', '集合住宅の建築及び管理に関する条例',
  '総戸数10戸以上、敷地内駐車場1台以上',
  '最低住戸面積25㎡以上', '敷地内駐車場最低1台',
  '台東区公式サイト', 'https://www.city.taito.lg.jp/kenchiku/jutaku/kenchiku/kenchikukakunin/jorei.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 墨田区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '墨田区', '全域', '集合住宅の建築に係る居住環境の整備及び管理に関する条例',
  '居室・台所・浴室・便所の設備を有するもの',
  '最低住戸面積25㎡以上',
  '墨田区公式サイト', 'https://www.city.sumida.lg.jp/matizukuri/kentiku/keikaku/syuugou26-4.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 世田谷区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '世田谷区', '全域', '建築物の建築に係る住環境の整備に関する条例',
  'ワンルーム30戸超の1/2以上をファミリー向け（平均50㎡以上）',
  '最低住戸面積25㎡、ワンルーム30戸超の1/2以上をファミリー向け',
  '世田谷区公式サイト', 'https://www.city.setagaya.lg.jp/02034/3772.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 渋谷区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '渋谷区', '全域', 'ワンルームマンション等建築物の建築に係る住環境の整備に関する条例',
  '平成24年改定',
  '最低住戸面積25㎡以上',
  '渋谷区公式サイト', 'https://www.city.shibuya.tokyo.jp/kusei/shisaku/jorei-toshin/one_room.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 中野区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '中野区', '全域', '集合住宅の建築及び管理に関する条例',
  '地上3階建以上かつ12戸以上、最低居住面積水準25㎡',
  '最低住戸面積25㎡以上、地上3階建以上かつ12戸以上',
  '中野区公式サイト', 'https://www.city.tokyo-nakano.lg.jp/kusei/kaigi/fuzokukikan/jyutaku/dai5-1.files/44444.pdf',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 杉並区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '杉並区', '全域', '建築物の建築に係る住環境への配慮等に関する指導要綱',
  'ワンルーム20戸超の1/2以上をファミリー形式',
  '最低住戸面積25㎡以上、ワンルーム20戸超の1/2以上をファミリー形式',
  '杉並区公式サイト', 'https://www.city.suginami.tokyo.jp/s092/1887.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 豊島区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '豊島区', '全域', '狭小住戸集合住宅税条例（ワンルームマンション税）',
  '30㎡未満の住戸に課税',
  '30㎡未満の住戸に課税あり',
  '豊島区公式サイト', 'https://www.city.toshima.lg.jp/100/tetsuzuki/ze/sonota/hotegaize/001777.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 北区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '北区', '全域', '居住環境整備指導要綱',
  '集合住宅等の建設事業を対象',
  '最低住戸面積25㎡以上',
  '北区公式サイト', 'https://www.city.kita.tokyo.jp/toshikeikaku/jutaku/jutaku/kenchiku/kitaku.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 荒川区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '荒川区', '全域', '住宅等の建築に係る住環境の整備に関する条例',
  '15戸以上の共同住宅・寄宿舎・長屋',
  '最低住戸面積25㎡以上、15戸以上が対象',
  '荒川区公式サイト', 'https://www.city.arakawa.tokyo.jp/machizukuridoboku/kenchikukaihatsu/juukankyoseibi/index.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 練馬区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '練馬区', '全域', 'まちづくり条例（ワンルーム形式の集合住宅）',
  'ワンルーム住戸15戸以上、専用床面積40㎡未満',
  '最低住戸面積40㎡未満、ワンルーム住戸15戸以上',
  '練馬区公式サイト', 'https://www.city.nerima.tokyo.jp/jigyoshamuke/jigyosha/doboku/funso/tetuduki/20180307-3.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 足立区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '足立区', '全域', '集合住宅の建築及び管理に関する条例',
  'ワンルーム15戸以上、総住戸数の1/3以上がワンルーム',
  '最低住戸面積25㎡以上、ワンルーム15戸以上',
  '足立区公式サイト', 'https://www.city.adachi.tokyo.jp/kaihatsu/syuugoujyuutakujyourei.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 葛飾区
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '葛飾区', '全域', '集合住宅等の建築及び管理に関する条例',
  '住戸床面積25㎡以上',
  '最低住戸面積25㎡以上',
  '葛飾区公式サイト', 'https://www.city.katsushika.lg.jp/business/1000011/1000069/1005250/1027782.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 八王子市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '八王子市', '全域', '集合住宅等建築指導要綱',
  '宅地開発指導要綱および集合住宅等建築指導要綱',
  '最低住戸面積20㎡以上',
  '八王子市公式サイト', 'https://www.city.hachioji.tokyo.jp/jigyosha/005/10102/p003087.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 立川市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '立川市', '全域', '宅地開発等まちづくり指導要綱',
  'ワンルーム形式共同住宅に関する基準あり',
  '最低住戸面積25㎡以上',
  '立川市公式サイト', 'https://www.city.tachikawa.lg.jp/shisei/machizukuri/1006749/1006797/1006800.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 武蔵野市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '武蔵野市', '全域', 'まちづくり条例（居住水準の基準）',
  'ワンルーム規制なし、居住水準基準あり',
  '居住水準基準あり（ワンルーム規制なし）',
  '武蔵野市公式サイト', 'https://www.city.musashino.lg.jp/faq/kurashi_tetsuzuki/machizukuri/1016721.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 三鷹市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '三鷹市', '全域', 'ワンルームマンションの建築に関する指導指針',
  '計画戸数15戸以上、専用床面積20㎡以上',
  '最低住戸面積20㎡以上、計画戸数15戸以上',
  '三鷹市公式サイト', 'https://www.city.mitaka.lg.jp/c_service/004/004038.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 青梅市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '青梅市', '全域', '開発行為等の基準および手続に関する条例',
  '市街化調整区域の開発規制あり',
  '青梅市公式サイト', 'https://www.city.ome.tokyo.jp/uploaded/attachment/2063.pdf',
  'medium', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 府中市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '府中市', '全域', '地域まちづくり条例・開発事業に関する指導要綱',
  'ワンルーム形式集合住宅の基準あり',
  '最低住戸面積25㎡以上',
  '府中市公式サイト', 'http://www.city.fuchu.tokyo.jp/gyosei/hosin/jyorei/tiikimatidukuri/tiikimatidukurishorui.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 調布市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '調布市', '全域', '福祉のまちづくり条例',
  '福祉施設が対象、工事着手30日前届出',
  '調布市公式サイト', 'https://www.city.chofu.tokyo.jp/www/contents/1254354458282/',
  'medium', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 町田市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '町田市', '全域', '中高層建築物等に関する指導要綱',
  '高さ10m超、集合住宅9戸以上、延床1,000㎡以上',
  '最低住戸面積25㎡以上、集合住宅9戸以上',
  '町田市公式サイト', 'https://www.city.machida.tokyo.jp/kurashi/sumai/toshikei/t_02/sidouyoukou/cyuukousoukannkei.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 東京都 - 小金井市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '東京都', '小金井市', '全域', 'まちづくり条例',
  'ワンルーム形式住戸専用面積25㎡以上',
  '最低住戸面積25㎡以上',
  '小金井市公式サイト', 'https://www.city.koganei.lg.jp/shisei/seisakukeikaku/machitoshi/machizukuri/D06015102.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 神奈川県 - 南足柄市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '神奈川県', '南足柄市', '全域', '開発行為等指導要綱',
  '一般的な開発指導要綱',
  '南足柄市公式サイト', 'https://www.city.minamiashigara.kanagawa.jp/kurashi/sumai/house/kaihatu_koui.html',
  'medium', 'VERIFIED', datetime('now'), datetime('now')
);

-- 千葉県 - 銚子市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '千葉県', '銚子市', '全域', 'リゾート地域大型建築物指導要綱',
  'リゾート地域の大型建築物が対象',
  '銚子市公式サイト', 'https://www.city.choshi.chiba.jp/content/000021061.pdf',
  'medium', 'VERIFIED', datetime('now'), datetime('now')
);

-- 千葉県 - 館山市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '千葉県', '館山市', '全域', '宅地等開発事業に関する指導要綱',
  '面積1,000㎡以上の開発事業',
  '館山市公式サイト', 'https://www.city.tateyama.chiba.jp/files/300003661.pdf',
  'medium', 'VERIFIED', datetime('now'), datetime('now')
);

-- 千葉県 - 木更津市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  apartment_restrictions, data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '千葉県', '木更津市', '全域', 'ワンルーム形式集合建築物指導指針',
  'ワンルーム形式の集合住宅の建築前事前協議必要',
  '最低住戸面積25㎡以上',
  '木更津市公式サイト', 'https://www.city.kisarazu.lg.jp/soshiki/toshiseibi/kenchikushido/1/1616.html',
  'high', 'VERIFIED', datetime('now'), datetime('now')
);

-- 千葉県 - 成田市
INSERT OR REPLACE INTO building_regulations (normalized_address, 
  prefecture, city, zoning_type, local_ordinance, local_ordinance_note,
  data_source, data_source_url,
  confidence_level, verification_status, last_updated, created_at
) VALUES (
  '千葉県', '成田市', '全域', '開発行為等指導要綱',
  '一定規模以上の建築行為に事前協議',
  '成田市公式サイト', 'https://www.city.narita.chiba.jp/environment/page177900_00002.html',
  'medium', 'VERIFIED', datetime('now'), datetime('now')
);
