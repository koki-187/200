#!/usr/bin/env python3
"""
未統合25自治体のデータ収集用検索クエリ生成
各自治体のワンルーム規制、近隣説明義務、開発指導要綱を検索
"""

import csv
import json

# 未統合自治体リスト
MUNICIPALITIES = {
    '神奈川県': [
        '横浜市', '平塚市', '小田原市', '三浦市', '秦野市',
        '厚木市', '伊勢原市', '海老名市', '座間市'
    ],
    '千葉県': [
        '習志野市', '流山市', '八千代市', '市原市', '佐倉市'
    ],
    '埼玉県': [
        '川越市', '越谷市', '熊谷市', '春日部市', '上尾市',
        '戸田市', '蕨市', '朝霞市', '和光市', '新座市', '久喜市'
    ]
}

# 検索クエリテンプレート
SEARCH_TEMPLATES = {
    'one_room': '{city} ワンルーム マンション 条例',
    'one_room_alt': '{city} 共同住宅 指導要綱',
    'neighbor': '{city} 近隣説明 建築 条例',
    'development': '{city} 開発指導要綱',
    'parking': '{city} 駐車場 附置義務 条例',
    'bicycle': '{city} 駐輪場 設置基準',
    'garbage': '{city} ゴミ集積所 集合住宅'
}

def generate_queries():
    """検索クエリを生成してCSV出力"""
    output = []
    
    for pref, cities in MUNICIPALITIES.items():
        for city in cities:
            row = {
                'prefecture': pref,
                'city': city,
                'priority': 'A' if pref in ['神奈川県', '埼玉県'] else 'B',
                'status': 'TO_COLLECT'
            }
            
            # 各種検索クエリ生成
            for key, template in SEARCH_TEMPLATES.items():
                query = template.format(city=city)
                row[f'query_{key}'] = query
            
            # 公式サイトURL（推定）
            if city.endswith('市'):
                city_romaji_map = {
                    '横浜市': 'yokohama', '平塚市': 'hiratsuka', '小田原市': 'odawara',
                    '三浦市': 'miura', '秦野市': 'hadano', '厚木市': 'atsugi',
                    '伊勢原市': 'isehara', '海老名市': 'ebina', '座間市': 'zama',
                    '習志野市': 'narashino', '流山市': 'nagareyama', '八千代市': 'yachiyo',
                    '市原市': 'ichihara', '佐倉市': 'sakura',
                    '川越市': 'kawagoe', '越谷市': 'koshigaya', '熊谷市': 'kumagaya',
                    '春日部市': 'kasukabe', '上尾市': 'ageo', '戸田市': 'toda',
                    '蕨市': 'warabi', '朝霞市': 'asaka', '和光市': 'wako',
                    '新座市': 'niiza', '久喜市': 'kuki'
                }
                romaji = city_romaji_map.get(city, city.replace('市', ''))
                
                # 県別のURLパターン
                if pref == '神奈川県':
                    row['official_site'] = f'https://www.city.{romaji}.kanagawa.jp/'
                elif pref == '千葉県':
                    row['official_site'] = f'https://www.city.{romaji}.chiba.jp/'
                elif pref == '埼玉県':
                    row['official_site'] = f'https://www.city.{romaji}.saitama.jp/'
            
            output.append(row)
    
    return output

def save_to_csv(data, filename):
    """CSV形式で保存"""
    if not data:
        return
    
    fieldnames = list(data[0].keys())
    
    with open(filename, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"✅ 保存完了: {filename}")
    print(f"📊 生成件数: {len(data)}自治体")

def generate_simple_list(data):
    """シンプルなチェックリスト生成"""
    print("\n## 📋 データ収集チェックリスト\n")
    
    for row in data:
        city = row['city']
        pref = row['prefecture']
        official = row.get('official_site', '（URL不明）')
        
        print(f"### {pref} {city}")
        print(f"- 公式サイト: {official}")
        print(f"- [ ] ワンルーム規制（条例/要綱URL）")
        print(f"- [ ] 近隣説明義務（手続きフロー）")
        print(f"- [ ] 開発指導要綱（駐輪場・ゴミ・駐車場）")
        print()

if __name__ == '__main__':
    print("🔍 未統合25自治体の検索クエリ生成\n")
    
    # クエリ生成
    queries = generate_queries()
    
    # CSV保存
    save_to_csv(queries, 'data_collection_queries.csv')
    
    # チェックリスト表示
    generate_simple_list(queries)
    
    print("\n✅ 完了: 次は各自治体の公式サイトを検索してください")
    print("💡 ヒント: query_one_room, query_neighbor, query_developmentを使用")
