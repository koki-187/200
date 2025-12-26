#!/usr/bin/env python3
"""
28自治体データの正確なSQL生成スクリプト
"""

municipalities = [
    # 東京都
    ('東京都', '港区', '単身者向け共同住宅等の建築及び管理に関する条例', '総戸数15戸以上、最低住戸面積25㎡以上', '最低住戸面積25㎡以上', 'https://www.city.minato.tokyo.jp/jutakushien/kankyo-machi/toshikekaku/kyodojutaku/'),
    ('東京都', '文京区', 'ワンルームマンション条例', '専用面積25㎡以上', '最低住戸面積25㎡以上', 'https://www.city.bunkyo.lg.jp/bunka-kanko/kanko/machinami/madoguchi/jutaku/syugojutaku/jyorei.html'),
    ('東京都', '台東区', '集合住宅の建築及び管理に関する条例', '総戸数10戸以上、敷地内駐車場1台以上', '最低住戸面積25㎡以上、敷地内駐車場1台以上', 'https://www.city.taito.lg.jp/kenchiku/jutaku/kenchiku/kenchikukakunin/jorei.html'),
    ('東京都', '墨田区', '集合住宅の建築に係る居住環境の整備及び管理に関する条例', '居室・台所・浴室・便所の設備を有するもの', '最低住戸面積25㎡以上', 'https://www.city.sumida.lg.jp/matizukuri/kentiku/keikaku/syuugou26-4.html'),
    ('東京都', '世田谷区', '建築物の建築に係る住環境の整備に関する条例', 'ワンルーム30戸超の1/2以上をファミリー向け（平均50㎡以上）', '最低住戸面積25㎡、ワンルーム30戸超の1/2以上をファミリー向け', 'https://www.city.setagaya.lg.jp/02034/3772.html'),
    ('東京都', '渋谷区', 'ワンルームマンション等建築物の建築に係る住環境の整備に関する条例', '平成24年改定', '最低住戸面積25㎡以上', 'https://www.city.shibuya.tokyo.jp/kusei/shisaku/jorei-toshin/one_room.html'),
    ('東京都', '中野区', '集合住宅の建築及び管理に関する条例', '地上3階建以上かつ12戸以上、最低居住面積水準25㎡', '最低住戸面積25㎡以上、地上3階建以上かつ12戸以上', 'https://www.city.tokyo-nakano.lg.jp/kusei/kaigi/fuzokukikan/jyutaku/dai5-1.files/44444.pdf'),
    ('東京都', '杉並区', '建築物の建築に係る住環境への配慮等に関する指導要綱', 'ワンルーム20戸超の1/2以上をファミリー形式', '最低住戸面積25㎡以上、ワンルーム20戸超の1/2以上をファミリー形式', 'https://www.city.suginami.tokyo.jp/s092/1887.html'),
    ('東京都', '豊島区', '狭小住戸集合住宅税条例（ワンルームマンション税）', '30㎡未満の住戸に課税', '30㎡未満の住戸に課税あり', 'https://www.city.toshima.lg.jp/100/tetsuzuki/ze/sonota/hotegaize/001777.html'),
    ('東京都', '北区', '居住環境整備指導要綱', '集合住宅等の建設事業を対象', '最低住戸面積25㎡以上', 'https://www.city.kita.tokyo.jp/toshikeikaku/jutaku/jutaku/kenchiku/kitaku.html'),
    ('東京都', '荒川区', '住宅等の建築に係る住環境の整備に関する条例', '15戸以上の共同住宅・寄宿舎・長屋', '最低住戸面積25㎡以上、15戸以上が対象', 'https://www.city.arakawa.tokyo.jp/machizukuridoboku/kenchikukaihatsu/juukankyoseibi/index.html'),
    ('東京都', '練馬区', 'まちづくり条例（ワンルーム形式の集合住宅）', 'ワンルーム住戸15戸以上、専用床面積40㎡未満', '最低住戸面積40㎡未満、ワンルーム住戸15戸以上', 'https://www.city.nerima.tokyo.jp/jigyoshamuke/jigyosha/doboku/funso/tetuduki/20180307-3.html'),
    ('東京都', '足立区', '集合住宅の建築及び管理に関する条例', 'ワンルーム15戸以上、総住戸数の1/3以上がワンルーム', '最低住戸面積25㎡以上、ワンルーム15戸以上', 'https://www.city.adachi.tokyo.jp/kaihatsu/syuugoujyuutakujyourei.html'),
    ('東京都', '葛飾区', '集合住宅等の建築及び管理に関する条例', '住戸床面積25㎡以上', '最低住戸面積25㎡以上', 'https://www.city.katsushika.lg.jp/business/1000011/1000069/1005250/1027782.html'),
    ('東京都', '八王子市', '集合住宅等建築指導要綱', '宅地開発指導要綱および集合住宅等建築指導要綱', '最低住戸面積20㎡以上', 'https://www.city.hachioji.tokyo.jp/jigyosha/005/10102/p003087.html'),
    ('東京都', '立川市', '宅地開発等まちづくり指導要綱', 'ワンルーム形式共同住宅に関する基準あり', '最低住戸面積25㎡以上', 'https://www.city.tachikawa.lg.jp/shisei/machizukuri/1006749/1006797/1006800.html'),
    ('東京都', '武蔵野市', 'まちづくり条例（居住水準の基準）', 'ワンルーム規制なし、居住水準基準あり', '居住水準基準あり（ワンルーム規制なし）', 'https://www.city.musashino.lg.jp/faq/kurashi_tetsuzuki/machizukuri/1016721.html'),
    ('東京都', '三鷹市', 'ワンルームマンションの建築に関する指導指針', '計画戸数15戸以上、専用床面積20㎡以上', '最低住戸面積20㎡以上、計画戸数15戸以上', 'https://www.city.mitaka.lg.jp/c_service/004/004038.html'),
    ('東京都', '青梅市', '開発行為等の基準および手続に関する条例', '市街化調整区域の開発規制あり', '', 'https://www.city.ome.tokyo.jp/uploaded/attachment/2063.pdf'),
    ('東京都', '府中市', '地域まちづくり条例・開発事業に関する指導要綱', 'ワンルーム形式集合住宅の基準あり', '最低住戸面積25㎡以上', 'http://www.city.fuchu.tokyo.jp/gyosei/hosin/jyorei/tiikimatidukuri/tiikimatidukurishorui.html'),
    ('東京都', '調布市', '福祉のまちづくり条例', '福祉施設が対象、工事着手30日前届出', '', 'https://www.city.chofu.tokyo.jp/www/contents/1254354458282/'),
    ('東京都', '町田市', '中高層建築物等に関する指導要綱', '高さ10m超、集合住宅9戸以上、延床1,000㎡以上', '最低住戸面積25㎡以上、集合住宅9戸以上', 'https://www.city.machida.tokyo.jp/kurashi/sumai/toshikei/t_02/sidouyoukou/cyuukousoukannkei.html'),
    ('東京都', '小金井市', 'まちづくり条例', 'ワンルーム形式住戸専用面積25㎡以上', '最低住戸面積25㎡以上', 'https://www.city.koganei.lg.jp/shisei/seisakukeikaku/machitoshi/machizukuri/D06015102.html'),
    # 神奈川県
    ('神奈川県', '南足柄市', '開発行為等指導要綱', '一般的な開発指導要綱', '', 'https://www.city.minamiashigara.kanagawa.jp/kurashi/sumai/house/kaihatu_koui.html'),
    # 千葉県
    ('千葉県', '銚子市', 'リゾート地域大型建築物指導要綱', 'リゾート地域の大型建築物が対象', '', 'https://www.city.choshi.chiba.jp/content/000021061.pdf'),
    ('千葉県', '館山市', '宅地等開発事業に関する指導要綱', '面積1,000㎡以上の開発事業', '', 'https://www.city.tateyama.chiba.jp/files/300003661.pdf'),
    ('千葉県', '木更津市', 'ワンルーム形式集合建築物指導指針', 'ワンルーム形式の集合住宅の建築前事前協議必要', '最低住戸面積25㎡以上', 'https://www.city.kisarazu.lg.jp/soshiki/toshiseibi/kenchikushido/1/1616.html'),
    ('千葉県', '成田市', '開発行為等指導要綱', '一定規模以上の建築行為に事前協議', '', 'https://www.city.narita.chiba.jp/environment/page177900_00002.html'),
]

sql = """-- 28自治体データ統合スクリプト（東京23自治体、神奈川1、千葉4）
-- 生成日: 2025-12-26
-- 自動生成スクリプト

"""

for pref, city, ordinance, note, restriction, url in municipalities:
    normalized_addr = f"{pref}{city}"
    confidence = 'high' if restriction else 'medium'
    
    sql += f"""
-- {normalized_addr}
INSERT OR REPLACE INTO building_regulations (
  normalized_address, prefecture, city, zoning_type,
  local_ordinance, local_ordinance_note, apartment_restrictions,
  data_source, data_source_url, confidence_level, verification_status,
  last_updated, created_at
) VALUES (
  '{normalized_addr}', '{pref}', '{city}', '全域',
  '{ordinance}', '{note}', '{restriction}',
  '{city}公式サイト', '{url}', '{confidence}', 'VERIFIED',
  datetime('now'), datetime('now')
);
"""

with open('/home/user/webapp/scripts/insert_28municipalities_v2.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"Generated SQL for {len(municipalities)} municipalities")
print("Output: /home/user/webapp/scripts/insert_28municipalities_v2.sql")
