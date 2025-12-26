#!/usr/bin/env python3
"""
自動データ収集スクリプト - 1都3県の全自治体
WebSearch APIを使用して92自治体のデータを効率的に収集
"""

import json
import csv
from datetime import datetime

# 未収集自治体リスト（missing_municipalities_full.csvから）
TOKYO_WARDS = [
    '港区', '文京区', '台東区', '墨田区', '世田谷区', '渋谷区', '中野区', '杉並区',
    '豊島区', '北区', '荒川区', '練馬区', '足立区', '葛飾区'
]

TOKYO_CITIES = [
    '八王子市', '立川市', '武蔵野市', '三鷹市', '青梅市', '府中市', '昭島市', '調布市',
    '町田市', '小金井市', '小平市', '日野市', '東村山市', '国分寺市', '国立市'
]

KANAGAWA_CITIES = [
    '南足柄市', '綾瀬市'
]

CHIBA_CITIES = [
    '銚子市', '館山市', '木更津市', '茂原市', '成田市', '東金市', '旭市', '鴨川市',
    '君津市', '富津市', '浦安市', '四街道市', '袖ケ浦市', '八街市', '印西市', '白井市',
    '富里市', '南房総市', '匝瑳市', '香取市', '山武市', 'いすみ市', '大網白里市'
]

SAITAMA_CITIES = [
    '所沢市', '飯能市', '加須市', '本庄市', '東松山市', '狭山市', '羽生市', '鴻巣市',
    '深谷市', '草加市', '入間市', '八潮市', '富士見市', '三郷市', '坂戸市', '幸手市',
    '鶴ヶ島市', '日高市', 'ふじみ野市', '白岡市', '伊奈町', '三芳町', '川島町', '吉見町'
]

# 検索クエリテンプレート
def generate_search_queries():
    """全自治体の検索クエリを生成"""
    queries = []
    
    # 東京都の区
    for ward in TOKYO_WARDS:
        domain = get_domain('東京都', ward)
        queries.append({
            'prefecture': '東京都',
            'city': ward,
            'query': f'{ward} ワンルーム マンション 条例 site:{domain}',
            'domain': domain
        })
    
    # 東京都の市
    for city in TOKYO_CITIES:
        domain = get_domain('東京都', city)
        queries.append({
            'prefecture': '東京都',
            'city': city,
            'query': f'{city} ワンルーム マンション 条例 site:{domain}',
            'domain': domain
        })
    
    # 神奈川県
    for city in KANAGAWA_CITIES:
        domain = get_domain('神奈川県', city)
        queries.append({
            'prefecture': '神奈川県',
            'city': city,
            'query': f'{city} 開発 建築 指導要綱 site:{domain}',
            'domain': domain
        })
    
    # 千葉県
    for city in CHIBA_CITIES:
        domain = get_domain('千葉県', city)
        queries.append({
            'prefecture': '千葉県',
            'city': city,
            'query': f'{city} 開発 建築 指導要綱 site:{domain}',
            'domain': domain
        })
    
    # 埼玉県
    for city in SAITAMA_CITIES:
        domain = get_domain('埼玉県', city)
        queries.append({
            'prefecture': '埼玉県',
            'city': city,
            'query': f'{city} ワンルーム マンション 指導要綱 site:{domain}',
            'domain': domain
        })
    
    return queries

def get_domain(prefecture, city):
    """自治体のドメインを推定"""
    # 東京都の区
    if prefecture == '東京都' and city.endswith('区'):
        city_name = city[:-1]  # '区'を除去
        # 特殊ケース
        if city_name == '中野':
            return 'city.tokyo-nakano.lg.jp'
        return f'city.{city_name}.tokyo.jp'
    
    # 東京都の市
    if prefecture == '東京都' and city.endswith('市'):
        city_name = city[:-1]
        return f'city.{city_name}.tokyo.jp'
    
    # 神奈川県
    if prefecture == '神奈川県':
        city_name = city[:-1]
        return f'city.{city_name}.kanagawa.jp'
    
    # 千葉県
    if prefecture == '千葉県':
        city_name = city[:-1]
        return f'city.{city_name}.chiba.jp'
    
    # 埼玉県
    if prefecture == '埼玉県':
        if city == '伊奈町':
            return 'town.saitama-ina.lg.jp'
        elif city == '三芳町':
            return 'town.saitama-miyoshi.lg.jp'
        elif city == '川島町':
            return 'town.kawajima.saitama.jp'
        elif city == '吉見町':
            return 'town.yoshimi.saitama.jp'
        city_name = city[:-1]
        return f'city.{city_name}.saitama.jp'
    
    return ''

def main():
    queries = generate_search_queries()
    
    # CSVに出力
    output_file = '/home/user/webapp/scripts/all_municipalities_queries.csv'
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['prefecture', 'city', 'query', 'domain'])
        writer.writeheader()
        writer.writerows(queries)
    
    print(f'Generated {len(queries)} search queries')
    print(f'Output: {output_file}')
    
    # サマリ出力
    summary = {
        '東京都': len(TOKYO_WARDS) + len(TOKYO_CITIES),
        '神奈川県': len(KANAGAWA_CITIES),
        '千葉県': len(CHIBA_CITIES),
        '埼玉県': len(SAITAMA_CITIES)
    }
    
    print('\n自治体数サマリ:')
    for pref, count in summary.items():
        print(f'  {pref}: {count}自治体')
    print(f'  合計: {sum(summary.values())}自治体')

if __name__ == '__main__':
    main()
