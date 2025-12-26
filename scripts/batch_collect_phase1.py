#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
フェーズ1: 優先度最高の自治体データ収集（東京23区残り14区 + 神奈川2市）
WebSearch APIを使用して自動収集
"""

import csv
import json

# フェーズ1対象自治体（16自治体）
PHASE1_MUNICIPALITIES = [
    # 東京23区残り14区
    {"prefecture": "東京都", "city": "港区", "official_site": "https://www.city.minato.tokyo.jp"},
    {"prefecture": "東京都", "city": "文京区", "official_site": "https://www.city.bunkyo.lg.jp"},
    {"prefecture": "東京都", "city": "台東区", "official_site": "https://www.city.taito.lg.jp"},
    {"prefecture": "東京都", "city": "墨田区", "official_site": "https://www.city.sumida.lg.jp"},
    {"prefecture": "東京都", "city": "世田谷区", "official_site": "https://www.city.setagaya.lg.jp"},
    {"prefecture": "東京都", "city": "渋谷区", "official_site": "https://www.city.shibuya.tokyo.jp"},
    {"prefecture": "東京都", "city": "中野区", "official_site": "https://www.city.tokyo-nakano.lg.jp"},
    {"prefecture": "東京都", "city": "杉並区", "official_site": "https://www.city.suginami.tokyo.jp"},
    {"prefecture": "東京都", "city": "豊島区", "official_site": "https://www.city.toshima.lg.jp"},
    {"prefecture": "東京都", "city": "北区", "official_site": "https://www.city.kita.tokyo.jp"},
    {"prefecture": "東京都", "city": "荒川区", "official_site": "https://www.city.arakawa.tokyo.jp"},
    {"prefecture": "東京都", "city": "練馬区", "official_site": "https://www.city.nerima.tokyo.jp"},
    {"prefecture": "東京都", "city": "足立区", "official_site": "https://www.city.adachi.tokyo.jp"},
    {"prefecture": "東京都", "city": "葛飾区", "official_site": "https://www.city.katsushika.lg.jp"},
    # 神奈川県残り2市
    {"prefecture": "神奈川県", "city": "南足柄市", "official_site": "https://www.city.minamiashigara.kanagawa.jp"},
    {"prefecture": "神奈川県", "city": "綾瀬市", "official_site": "https://www.city.ayase.kanagawa.jp"},
]

def generate_search_queries():
    """検索クエリを生成"""
    queries = []
    for muni in PHASE1_MUNICIPALITIES:
        city = muni["city"]
        site = muni["official_site"].replace("https://", "").replace("http://", "")
        
        # ワンルーム規制の検索クエリ
        query_oneroom = f"{city} ワンルーム マンション 条例 site:{site}"
        
        # 開発指導要綱の検索クエリ
        query_development = f"{city} 開発 指導要綱 駐車場 駐輪場 site:{site}"
        
        queries.append({
            "prefecture": muni["prefecture"],
            "city": city,
            "query_oneroom": query_oneroom,
            "query_development": query_development,
            "official_site": muni["official_site"]
        })
    
    return queries

def save_queries_to_csv(queries, filename="phase1_search_queries.csv"):
    """検索クエリをCSVに保存"""
    with open(filename, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["prefecture", "city", "query_oneroom", "query_development", "official_site"])
        writer.writeheader()
        writer.writerows(queries)
    print(f"✅ 検索クエリを '{filename}' に保存しました")

def generate_sql_template():
    """SQLテンプレートを生成"""
    sql_lines = []
    sql_lines.append("-- フェーズ1: 東京23区残り14区 + 神奈川2市（16自治体）")
    sql_lines.append("-- 生成日時: 2025-12-26")
    sql_lines.append("")
    
    for muni in PHASE1_MUNICIPALITIES:
        sql_lines.append(f"-- {muni['prefecture']} {muni['city']}")
        sql_lines.append("INSERT INTO building_regulations (")
        sql_lines.append("  prefecture, city, district, chome, banchi_start, banchi_end,")
        sql_lines.append("  normalized_address, zoning_type,")
        sql_lines.append("  apartment_restrictions_note, building_restrictions_note, development_guideline,")
        sql_lines.append("  apartment_parking_ratio, apartment_bicycle_ratio, apartment_construction_feasible,")
        sql_lines.append("  data_source, verification_status, verified_at, last_updated, created_at")
        sql_lines.append(") VALUES (")
        sql_lines.append(f"  '{muni['prefecture']}', '{muni['city']}', '', '', NULL, NULL,")
        sql_lines.append(f"  '{muni['prefecture']}{muni['city']}', '',")
        sql_lines.append("  'データ収集中', 'データ収集中', 'データ収集中',")
        sql_lines.append("  NULL, NULL, 1,")
        sql_lines.append(f"  '{muni['official_site']}', 'PENDING', '2025-12-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP")
        sql_lines.append(");")
        sql_lines.append("")
    
    with open('scripts/insert_phase1_template.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))
    
    print("✅ SQLテンプレートを 'scripts/insert_phase1_template.sql' に保存しました")

if __name__ == "__main__":
    print("=" * 80)
    print("フェーズ1: 優先度最高自治体のデータ収集準備")
    print("=" * 80)
    print()
    print(f"対象自治体数: {len(PHASE1_MUNICIPALITIES)}")
    print("  - 東京23区残り14区")
    print("  - 神奈川県残り2市")
    print()
    
    queries = generate_search_queries()
    save_queries_to_csv(queries)
    generate_sql_template()
    
    print()
    print("📊 次のステップ:")
    print("  1. WebSearch APIで各自治体を検索（自動実行）")
    print("  2. 検索結果からデータを抽出")
    print("  3. SQLスクリプトを生成してD1統合")
