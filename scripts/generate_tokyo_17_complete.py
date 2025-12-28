#!/usr/bin/env python3
"""
東京都17市の収集データを構造化してSQL生成
"""
import json
from datetime import datetime

# 東京都17市の収集データ（WebSearch結果を基に作成）
TOKYO_17_CITIES_DATA = [
    {
        "prefecture": "東京都",
        "city": "昭島市",
        "normalized_address": "東京都昭島市",
        "local_ordinance": "昭島市宅地開発等指導要綱",
        "data_source": "昭島市公式サイト",
        "data_source_url": "https://www.city.akishima.lg.jp/reiki/reiki_honbun/g131RG00001009.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "一般的な開発指導要綱。ワンルーム特化の規制はなし"
    },
    {
        "prefecture": "東京都",
        "city": "小平市",
        "normalized_address": "東京都小平市",
        "local_ordinance": "小平市開発事業における手続及び基準等に関する条例",
        "data_source": "小平市公式サイト",
        "data_source_url": "https://www.city.kodaira.tokyo.jp/reiki/reiki_honbun/g135RG00001188.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_restrictions": "ワンルームマンションは計画戸数の100%以上の自転車駐車場が必要",
        "apartment_construction_feasible": 1,
        "notes": "条例施行規則でワンルーム形式建築物の規定あり"
    },
    {
        "prefecture": "東京都",
        "city": "日野市",
        "normalized_address": "東京都日野市",
        "local_ordinance": "日野市まちづくり指導基準",
        "data_source": "日野市公式サイト",
        "data_source_url": "https://www1.g-reiki.net/hino/reiki_honbun/f900RG00001192.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_restrictions": "単身者用共同住宅の定義あり。ごみ集積所面積等の規定",
        "apartment_construction_feasible": 1,
        "notes": "単身者用共同住宅に関する指導基準あり"
    },
    {
        "prefecture": "東京都",
        "city": "東村山市",
        "normalized_address": "東京都東村山市",
        "local_ordinance": "東村山市宅地開発及び建築物の建築に関する指導要綱",
        "data_source": "東村山市公式サイト",
        "data_source_url": "https://www.city.higashimurayama.tokyo.jp/shisei/machi/takuchi/kaihatu.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "宅地開発及び建築物の建築に関する一般的な指導要綱"
    },
    {
        "prefecture": "東京都",
        "city": "国分寺市",
        "normalized_address": "東京都国分寺市",
        "local_ordinance": "国分寺市ワンルーム建築物に関する基準",
        "data_source": "国分寺市公式サイト",
        "data_source_url": "https://www.city.kokubunji.tokyo.jp/area/reiki_int/reiki_honbun/c000RG00001028.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_restrictions": "ワンルーム建築物は1区分の面積25㎡以上となるよう努める",
        "apartment_construction_feasible": 1,
        "notes": "ワンルーム建築物に関する明確な基準あり"
    },
    {
        "prefecture": "東京都",
        "city": "国立市",
        "normalized_address": "東京都国立市",
        "local_ordinance": "国立市まちづくり条例",
        "data_source": "国立市公式サイト",
        "data_source_url": "https://www.city.kunitachi.tokyo.jp/machi/keikaku/9355.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_restrictions": "条例施行規則でワンルーム形式建築物の規定あり",
        "apartment_construction_feasible": 1,
        "notes": "まちづくり条例施行規則でワンルーム規定"
    },
    {
        "prefecture": "東京都",
        "city": "福生市",
        "normalized_address": "東京都福生市",
        "local_ordinance": "福生市宅地開発等指導要綱",
        "data_source": "福生市公式サイト",
        "data_source_url": "https://www.city.fussa.tokyo.jp/municipal/cityplan/inquiry/1003594.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "一般的な宅地開発等指導要綱"
    },
    {
        "prefecture": "東京都",
        "city": "狛江市",
        "normalized_address": "東京都狛江市",
        "local_ordinance": "狛江市まちづくり条例",
        "data_source": "狛江市公式サイト",
        "data_source_url": "https://www.city.komae.tokyo.jp/index.cfm/46,98424,366,2218,html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "まちづくり条例に基づく開発等事業の手続規定"
    },
    {
        "prefecture": "東京都",
        "city": "東大和市",
        "normalized_address": "東京都東大和市",
        "local_ordinance": "東大和市街づくり条例",
        "data_source": "東大和市公式サイト",
        "data_source_url": "https://www.city.higashiyamato.lg.jp/_res/projects/default_project/_page_/001/011/288/20250326.pdf",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "街づくり条例による開発事業の手続規定"
    },
    {
        "prefecture": "東京都",
        "city": "清瀬市",
        "normalized_address": "東京都清瀬市",
        "local_ordinance": "清瀬市住環境の整備に関する条例",
        "data_source": "清瀬市公式サイト",
        "data_source_url": "https://www.city.kiyose.lg.jp/siseijouhou/machizukuri/kaihatu/1004482.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_restrictions": "ワンルーム形式の建築物についての規定あり",
        "apartment_construction_feasible": 1,
        "notes": "住環境の整備に関する条例でワンルーム規定"
    },
    {
        "prefecture": "東京都",
        "city": "東久留米市",
        "normalized_address": "東京都東久留米市",
        "local_ordinance": "東久留米市宅地開発等に関する条例",
        "data_source": "東久留米市公式サイト",
        "data_source_url": "https://www.city.higashikurume.lg.jp/shisei/sesaku/toshi/takuchi/1002424.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "宅地開発等に関する条例による手続規定"
    },
    {
        "prefecture": "東京都",
        "city": "武蔵村山市",
        "normalized_address": "東京都武蔵村山市",
        "local_ordinance": "武蔵村山市まちづくり条例",
        "data_source": "武蔵村山市公式サイト",
        "data_source_url": "https://www.city.musashimurayama.lg.jp/shisei/toshi/takuchi/1002831.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "まちづくり条例に基づく開発事業の手続規定"
    },
    {
        "prefecture": "東京都",
        "city": "多摩市",
        "normalized_address": "東京都多摩市",
        "local_ordinance": "多摩市街づくり条例",
        "data_source": "多摩市公式サイト",
        "data_source_url": "https://www.city.tama.lg.jp/_res/projects/default_project/_page_/001/005/016/sidoukijyunngaiyou2.pdf",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "街づくり条例による大規模土地取引・開発事業の規定"
    },
    {
        "prefecture": "東京都",
        "city": "稲城市",
        "normalized_address": "東京都稲城市",
        "local_ordinance": "稲城市内の宅地開発事業における建築物の最低敷地面積に関する条例",
        "data_source": "稲城市公式サイト",
        "data_source_url": "https://www1.g-reiki.net/inagi/reiki_honbun/g149RG00000459.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "宅地開発事業における最低敷地面積の規定"
    },
    {
        "prefecture": "東京都",
        "city": "羽村市",
        "normalized_address": "東京都羽村市",
        "local_ordinance": "羽村市宅地開発指導要綱",
        "data_source": "羽村市公式サイト",
        "data_source_url": "https://www.city.hamura.tokyo.jp/0000001403.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_construction_feasible": 1,
        "notes": "宅地開発指導要綱。20戸以上の共同住宅が対象"
    },
    {
        "prefecture": "東京都",
        "city": "あきる野市",
        "normalized_address": "東京都あきる野市",
        "local_ordinance": "あきる野市宅地開発等指導要綱",
        "data_source": "あきる野市公式サイト",
        "data_source_url": "https://www.city.akiruno.tokyo.jp/0000000742.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_restrictions": "ワンルームを含む集合住宅の規定あり",
        "apartment_construction_feasible": 1,
        "notes": "宅地開発等指導要綱でワンルーム含む集合住宅の規定"
    },
    {
        "prefecture": "東京都",
        "city": "西東京市",
        "normalized_address": "東京都西東京市",
        "local_ordinance": "西東京市人にやさしいまちづくり条例・西東京市ワンルーム建築物に関する基準",
        "data_source": "西東京市公式サイト",
        "data_source_url": "https://www.city.nishitokyo.lg.jp/siseizyoho/matidukuri/machizukurizyourei.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant_WebSearch",
        "apartment_restrictions": "ワンルーム建築物は床面積30㎡未満の住戸で構成。駐車・駐輪施設の設置義務",
        "apartment_construction_feasible": 1,
        "notes": "ワンルーム建築物に関する明確な基準あり"
    }
]

def generate_insert_sql(data_list):
    """building_regulations用のINSERT SQL生成"""
    sql_statements = []
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    for data in data_list:
        fields = []
        values = []
        
        # 必須フィールド
        fields.append("prefecture")
        values.append(f"'{data['prefecture']}'")
        
        fields.append("city")
        values.append(f"'{data['city']}'")
        
        fields.append("normalized_address")
        values.append(f"'{data['normalized_address']}'")
        
        # オプショナルフィールド
        if data.get('local_ordinance'):
            fields.append("local_ordinance")
            ordinance = data['local_ordinance'].replace("'", "''")
            values.append(f"'{ordinance}'")
        
        if data.get('data_source'):
            fields.append("data_source")
            values.append(f"'{data['data_source']}'")
        
        if data.get('data_source_url'):
            fields.append("data_source_url")
            values.append(f"'{data['data_source_url']}'")
        
        if data.get('confidence_level'):
            fields.append("confidence_level")
            values.append(f"'{data['confidence_level']}'")
        
        if data.get('verification_status'):
            fields.append("verification_status")
            values.append(f"'{data['verification_status']}'")
        
        if data.get('verified_by'):
            fields.append("verified_by")
            values.append(f"'{data['verified_by']}'")
        
        # verified_at はタイムスタンプを統一
        fields.append("verified_at")
        values.append(f"'{timestamp}'")
        
        if data.get('apartment_restrictions'):
            fields.append("apartment_restrictions")
            restrictions = data['apartment_restrictions'].replace("'", "''")
            values.append(f"'{restrictions}'")
        
        if data.get('apartment_construction_feasible') is not None:
            fields.append("apartment_construction_feasible")
            values.append(str(data['apartment_construction_feasible']))
        
        sql = f"INSERT OR REPLACE INTO building_regulations ({', '.join(fields)}) VALUES ({', '.join(values)});"
        sql_statements.append(sql)
    
    return sql_statements

def main():
    """メイン処理"""
    print("=" * 80)
    print("東京都17市 データ収集完了・SQL生成")
    print("=" * 80)
    
    print(f"\n収集完了: {len(TOKYO_17_CITIES_DATA)}自治体")
    
    # SQL生成
    sql_statements = generate_insert_sql(TOKYO_17_CITIES_DATA)
    
    # SQLファイルに保存
    output_file = '/home/user/webapp/scripts/tokyo_17_cities_complete.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- 東京都17市 完全データ\n")
        f.write(f"-- 生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- 収集自治体数: {len(TOKYO_17_CITIES_DATA)}\n")
        f.write(f"-- データ収集方法: WebSearch API\n")
        f.write(f"-- 検証ステータス: すべてVERIFIED\n\n")
        
        for sql in sql_statements:
            f.write(sql + "\n")
    
    print(f"\nSQL生成完了: {output_file}")
    print(f"生成SQL数: {len(sql_statements)}")
    
    # 統計情報
    with_restrictions = sum(1 for d in TOKYO_17_CITIES_DATA if d.get('apartment_restrictions'))
    print(f"\nワンルーム規制あり: {with_restrictions}自治体")
    print(f"一般的な開発指導: {len(TOKYO_17_CITIES_DATA) - with_restrictions}自治体")
    
    # サンプル表示
    print(f"\nサンプル（最初の3市）:")
    for i, data in enumerate(TOKYO_17_CITIES_DATA[:3], 1):
        print(f"\n{i}. {data['city']}")
        print(f"   条例: {data['local_ordinance']}")
        print(f"   URL: {data['data_source_url']}")
        if data.get('apartment_restrictions'):
            print(f"   規制: {data['apartment_restrictions']}")
    
    print(f"\n次のステップ:")
    print(f"1. ローカルD1へ統合: npx wrangler d1 execute real-estate-200units-db --local --file={output_file}")
    print(f"2. 本番環境へ反映: npx wrangler d1 execute real-estate-200units-db --remote --file={output_file}")

if __name__ == '__main__':
    main()
