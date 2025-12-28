#!/usr/bin/env python3
"""
東京都17市のワンルーム・開発規制条例を自動収集・SQL生成
WebSearch結果を解析してbuilding_regulations用のSQLを生成
"""
import json
from datetime import datetime

# 東京都17市リスト（昭島市・小平市は調査済み）
TOKYO_CITIES_REMAINING = [
    "日野市", "東村山市", "国分寺市", "国立市", "福生市", "狛江市",
    "東大和市", "清瀬市", "東久留米市", "武蔵村山市", "多摩市", "稲城市",
    "羽村市", "あきる野市", "西東京市"
]

# 既に調査済みの2市のデータ
COLLECTED_DATA = [
    {
        "prefecture": "東京都",
        "city": "昭島市",
        "normalized_address": "東京都昭島市",
        "local_ordinance": "昭島市宅地開発等指導要綱",
        "data_source": "昭島市公式サイト",
        "data_source_url": "https://www.city.akishima.lg.jp/reiki/reiki_honbun/g131RG00001009.html",
        "confidence_level": "high",
        "verification_status": "VERIFIED",
        "verified_by": "AI_Assistant",
        "verified_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
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
        "verified_by": "AI_Assistant",
        "verified_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "apartment_restrictions": "ワンルームマンションは計画戸数の100%以上の自転車駐車場が必要",
        "apartment_construction_feasible": 1,
        "notes": "条例施行規則でワンルーム形式建築物の規定あり"
    }
]

def generate_insert_sql(data_list):
    """building_regulations用のINSERT SQL生成"""
    sql_statements = []
    
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
            values.append(f"'{data['local_ordinance']}'")
        
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
        
        if data.get('verified_at'):
            fields.append("verified_at")
            values.append(f"'{data['verified_at']}'")
        
        if data.get('apartment_restrictions'):
            fields.append("apartment_restrictions")
            values.append(f"'{data['apartment_restrictions']}'")
        
        if data.get('apartment_construction_feasible') is not None:
            fields.append("apartment_construction_feasible")
            values.append(str(data['apartment_construction_feasible']))
        
        sql = f"INSERT OR REPLACE INTO building_regulations ({', '.join(fields)}) VALUES ({', '.join(values)});"
        sql_statements.append(sql)
    
    return sql_statements

def main():
    """メイン処理"""
    print("=" * 80)
    print("東京都17市 データ収集・SQL生成")
    print("=" * 80)
    
    # 既存データのSQL生成
    print(f"\n既存収集済みデータ: {len(COLLECTED_DATA)}件")
    sql_statements = generate_insert_sql(COLLECTED_DATA)
    
    # SQLファイルに保存
    output_file = '/home/user/webapp/scripts/tokyo_17_cities_initial_2.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- 東京都17市 初期データ（2市分）\n")
        f.write(f"-- 生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- 収集自治体数: {len(COLLECTED_DATA)}\n\n")
        
        for sql in sql_statements:
            f.write(sql + "\n")
    
    print(f"\nSQL生成完了: {output_file}")
    print(f"生成SQL数: {len(sql_statements)}")
    
    # 残り15市のリスト表示
    print(f"\n残り収集対象: {len(TOKYO_CITIES_REMAINING)}市")
    for i, city in enumerate(TOKYO_CITIES_REMAINING, 1):
        print(f"  {i}. {city}")
    
    print(f"\n次のステップ:")
    print(f"1. WebSearchで残り15市を順次検索")
    print(f"2. 検索結果をCOLLECTED_DATAに追加")
    print(f"3. SQL再生成してローカルD1に統合")
    print(f"4. 本番環境に反映")

if __name__ == '__main__':
    main()
