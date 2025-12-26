#!/usr/bin/env python3
"""
部分収集データのSQL生成スクリプト
収集済み24自治体のデータをbuilding_regulationsテーブル用のSQLに変換
"""

collected_data = {
    '東京都': {
        '港区': {
            'url': 'https://www.city.minato.tokyo.jp/jutakushien/kankyo-machi/toshikekaku/kyodojutaku/',
            'regulation': '単身者向け共同住宅等の建築及び管理に関する条例',
            'min_area': 25.0,
            'notes': '総戸数15戸以上、最低住戸面積25㎡以上'
        },
        '文京区': {
            'url': 'https://www.city.bunkyo.lg.jp/bunka-kanko/kanko/machinami/madoguchi/jutaku/syugojutaku/jyorei.html',
            'regulation': 'ワンルームマンション条例',
            'min_area': 25.0,
            'notes': '専用面積25㎡以上'
        },
        '台東区': {
            'url': 'https://www.city.taito.lg.jp/kenchiku/jutaku/kenchiku/kenchikukakunin/jorei.html',
            'regulation': '集合住宅の建築及び管理に関する条例',
            'min_area': 25.0,
            'notes': '総戸数10戸以上、敷地内駐車場1台以上'
        },
        '墨田区': {
            'url': 'https://www.city.sumida.lg.jp/matizukuri/kentiku/keikaku/syuugou26-4.html',
            'regulation': '集合住宅の建築に係る居住環境の整備及び管理に関する条例',
            'min_area': 25.0,
            'notes': '居室・台所・浴室・便所の設備を有するもの'
        },
        '世田谷区': {
            'url': 'https://www.city.setagaya.lg.jp/02034/3772.html',
            'regulation': '建築物の建築に係る住環境の整備に関する条例',
            'min_area': 25.0,
            'notes': 'ワンルーム30戸超の1/2以上をファミリー向け（平均50㎡以上）'
        },
        '渋谷区': {
            'url': 'https://www.city.shibuya.tokyo.jp/kusei/shisaku/jorei-toshin/one_room.html',
            'regulation': 'ワンルームマンション等建築物の建築に係る住環境の整備に関する条例',
            'min_area': 25.0,
            'notes': '平成24年改定'
        },
        '中野区': {
            'url': 'https://www.city.tokyo-nakano.lg.jp/kusei/kaigi/fuzokukikan/jyutaku/dai5-1.files/44444.pdf',
            'regulation': '集合住宅の建築及び管理に関する条例',
            'min_area': 25.0,
            'notes': '地上3階建以上かつ12戸以上、最低居住面積水準25㎡'
        },
        '杉並区': {
            'url': 'https://www.city.suginami.tokyo.jp/s092/1887.html',
            'regulation': '建築物の建築に係る住環境への配慮等に関する指導要綱',
            'min_area': 25.0,
            'notes': 'ワンルーム20戸超の1/2以上をファミリー形式'
        },
        '豊島区': {
            'url': 'https://www.city.toshima.lg.jp/100/tetsuzuki/ze/sonota/hotegaize/001777.html',
            'regulation': '狭小住戸集合住宅税条例（ワンルームマンション税）',
            'min_area': 30.0,
            'notes': '30㎡未満の住戸に課税'
        },
        '北区': {
            'url': 'https://www.city.kita.tokyo.jp/toshikeikaku/jutaku/jutaku/kenchiku/kitaku.html',
            'regulation': '居住環境整備指導要綱',
            'min_area': 25.0,
            'notes': '集合住宅等の建設事業を対象'
        },
        '荒川区': {
            'url': 'https://www.city.arakawa.tokyo.jp/machizukuridoboku/kenchikukaihatsu/juukankyoseibi/index.html',
            'regulation': '住宅等の建築に係る住環境の整備に関する条例',
            'min_area': 25.0,
            'notes': '15戸以上の共同住宅・寄宿舎・長屋'
        },
        '練馬区': {
            'url': 'https://www.city.nerima.tokyo.jp/jigyoshamuke/jigyosha/doboku/funso/tetuduki/20180307-3.html',
            'regulation': 'まちづくり条例（ワンルーム形式の集合住宅）',
            'min_area': 40.0,
            'notes': 'ワンルーム住戸15戸以上、専用床面積40㎡未満'
        },
        '足立区': {
            'url': 'https://www.city.adachi.tokyo.jp/kaihatsu/syuugoujyuutakujyourei.html',
            'regulation': '集合住宅の建築及び管理に関する条例',
            'min_area': 25.0,
            'notes': 'ワンルーム15戸以上、総住戸数の1/3以上がワンルーム'
        },
        '葛飾区': {
            'url': 'https://www.city.katsushika.lg.jp/business/1000011/1000069/1005250/1027782.html',
            'regulation': '集合住宅等の建築及び管理に関する条例',
            'min_area': 25.0,
            'notes': '住戸床面積25㎡以上'
        },
        '八王子市': {
            'url': 'https://www.city.hachioji.tokyo.jp/jigyosha/005/10102/p003087.html',
            'regulation': '集合住宅等建築指導要綱',
            'min_area': 20.0,
            'notes': '宅地開発指導要綱および集合住宅等建築指導要綱'
        },
        '立川市': {
            'url': 'https://www.city.tachikawa.lg.jp/shisei/machizukuri/1006749/1006797/1006800.html',
            'regulation': '宅地開発等まちづくり指導要綱',
            'min_area': 25.0,
            'notes': 'ワンルーム形式共同住宅に関する基準あり'
        },
        '武蔵野市': {
            'url': 'https://www.city.musashino.lg.jp/faq/kurashi_tetsuzuki/machizukuri/1016721.html',
            'regulation': 'まちづくり条例（居住水準の基準）',
            'min_area': 25.0,
            'notes': 'ワンルーム規制なし、居住水準基準あり'
        },
        '三鷹市': {
            'url': 'https://www.city.mitaka.lg.jp/c_service/004/004038.html',
            'regulation': 'ワンルームマンションの建築に関する指導指針',
            'min_area': 20.0,
            'notes': '計画戸数15戸以上、専用床面積20㎡以上'
        }
    },
    '神奈川県': {
        '南足柄市': {
            'url': 'https://www.city.minamiashigara.kanagawa.jp/kurashi/sumai/house/kaihatu_koui.html',
            'regulation': '開発行為等指導要綱',
            'min_area': None,
            'notes': '一般的な開発指導要綱'
        }
    },
    '千葉県': {
        '銚子市': {
            'url': 'https://www.city.choshi.chiba.jp/content/000021061.pdf',
            'regulation': 'リゾート地域大型建築物指導要綱',
            'min_area': None,
            'notes': 'リゾート地域の大型建築物が対象'
        },
        '館山市': {
            'url': 'https://www.city.tateyama.chiba.jp/files/300003661.pdf',
            'regulation': '宅地等開発事業に関する指導要綱',
            'min_area': None,
            'notes': '面積1,000㎡以上の開発事業'
        },
        '木更津市': {
            'url': 'https://www.city.kisarazu.lg.jp/soshiki/toshiseibi/kenchikushido/1/1616.html',
            'regulation': 'ワンルーム形式集合建築物指導指針',
            'min_area': 25.0,
            'notes': 'ワンルーム形式の集合住宅の建築前事前協議必要'
        },
        '成田市': {
            'url': 'https://www.city.narita.chiba.jp/environment/page177900_00002.html',
            'regulation': '開発行為等指導要綱',
            'min_area': None,
            'notes': '一定規模以上の建築行為に事前協議'
        }
    }
}

# 東京都のさらなるデータ
additional_tokyo = {
    '青梅市': {
        'url': 'https://www.city.ome.tokyo.jp/uploaded/attachment/2063.pdf',
        'regulation': '開発行為等の基準および手続に関する条例',
        'min_area': None,
        'notes': '市街化調整区域の開発規制あり'
    },
    '府中市': {
        'url': 'http://www.city.fuchu.tokyo.jp/gyosei/hosin/jyorei/tiikimatidukuri/tiikimatidukurishorui.html',
        'regulation': '地域まちづくり条例・開発事業に関する指導要綱',
        'min_area': 25.0,
        'notes': 'ワンルーム形式集合住宅の基準あり'
    },
    '調布市': {
        'url': 'https://www.city.chofu.tokyo.jp/www/contents/1254354458282/',
        'regulation': '福祉のまちづくり条例',
        'min_area': None,
        'notes': '福祉施設が対象、工事着手30日前届出'
    },
    '町田市': {
        'url': 'https://www.city.machida.tokyo.jp/kurashi/sumai/toshikei/t_02/sidouyoukou/cyuukousoukannkei.html',
        'regulation': '中高層建築物等に関する指導要綱',
        'min_area': 25.0,
        'notes': '高さ10m超、集合住宅9戸以上、延床1,000㎡以上'
    },
    '小金井市': {
        'url': 'https://www.city.koganei.lg.jp/shisei/seisakukeikaku/machitoshi/machizukuri/D06015102.html',
        'regulation': 'まちづくり条例',
        'min_area': 25.0,
        'notes': 'ワンルーム形式住戸専用面積25㎡以上'
    }
}

collected_data['東京都'].update(additional_tokyo)

print(f"収集済み自治体数: {sum(len(cities) for cities in collected_data.values())}")
print("\n都道府県別内訳:")
for pref, cities in collected_data.items():
    print(f"  {pref}: {len(cities)}自治体")
