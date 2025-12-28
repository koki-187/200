#!/usr/bin/env python3
"""
Phase 4-2: URL未設定自治体のURL収集スクリプト
千葉県21自治体、埼玉県37自治体の公式URLを収集
"""

import json
import time
from datetime import datetime

# URL未設定の自治体リスト
MISSING_URL_MUNICIPALITIES = {
    "千葉県": [
        "いすみ市", "八街市", "勝浦市", "匝瑳市", "南房総市", 
        "印西市", "君津市", "多古町", "大網白里市", "富津市",
        "富里市", "山武市", "旭市", "東庄町", "東金市",
        "栄町", "浦安市", "白井市", "神崎町", "酒々井町", "香取市"
    ],
    "埼玉県": [
        "ときがわ町", "ふじみ野市", "三芳町", "三郷市", "伊奈町",
        "入間市", "加須市", "北本市", "吉川市", "吉見町",
        "坂戸市", "富士見市", "小川町", "嵐山町", "川島町",
        "志木市", "日高市", "本庄市", "東松山市", "桶川市",
        "横瀬町", "毛呂山町", "深谷市", "滑川町", "狭山市",
        "白岡市", "皆野町", "秩父市", "羽生市", "蓮田市",
        "行田市", "越生町", "飯能市", "鳩山町", "鶴ヶ島市",
        "寄居町", "長瀞町"
    ]
}

def generate_search_queries():
    """WebSearch用のクエリを生成"""
    queries = []
    
    for prefecture, cities in MISSING_URL_MUNICIPALITIES.items():
        for city in cities:
            # 開発指導要綱または建築基準法に基づく条例のURL検索
            query = {
                "prefecture": prefecture,
                "city": city,
                "normalized_address": f"{prefecture}{city}",
                "search_query": f"{city} 開発指導要綱 公式サイト",
                "alternative_query": f"{city} 建築基準法 条例"
            }
            queries.append(query)
    
    return queries

def generate_update_sql_template():
    """UPDATE文のテンプレートを生成"""
    sql_template = """-- Phase 4-2: URL未設定自治体のURL補完
-- 生成日時: {timestamp}
-- 対象自治体数: {total_count}件（千葉県{chiba_count}件、埼玉県{saitama_count}件）

-- 実行前の確認
SELECT COUNT(*) as before_update_count 
FROM building_regulations 
WHERE verification_status='VERIFIED' 
  AND (data_source_url IS NULL OR data_source_url = '');

-- URL更新（千葉県）
{chiba_updates}

-- URL更新（埼玉県）
{saitama_updates}

-- 実行後の確認
SELECT 
  prefecture,
  COUNT(*) as total,
  SUM(CASE WHEN data_source_url IS NOT NULL AND data_source_url != '' THEN 1 ELSE 0 END) as with_url,
  ROUND(SUM(CASE WHEN data_source_url IS NOT NULL AND data_source_url != '' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as url_rate
FROM building_regulations 
WHERE verification_status='VERIFIED'
GROUP BY prefecture
ORDER BY prefecture;
"""
    return sql_template

def generate_manual_collection_list():
    """手動収集用のリストを生成（WebSearch APIを使用する場合）"""
    queries = generate_search_queries()
    
    output = "# Phase 4-2: URL手動収集リスト\n\n"
    output += f"生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    output += f"対象自治体数: {len(queries)}件\n\n"
    
    output += "## 千葉県（21自治体）\n\n"
    chiba_queries = [q for q in queries if q["prefecture"] == "千葉県"]
    for i, q in enumerate(chiba_queries, 1):
        output += f"{i}. **{q['city']}**\n"
        output += f"   - 検索クエリ: `{q['search_query']}`\n"
        output += f"   - 代替クエリ: `{q['alternative_query']}`\n"
        output += f"   - UPDATE文: `UPDATE building_regulations SET data_source_url='[収集したURL]' WHERE prefecture='{q['prefecture']}' AND city='{q['city']}';`\n\n"
    
    output += "\n## 埼玉県（37自治体）\n\n"
    saitama_queries = [q for q in queries if q["prefecture"] == "埼玉県"]
    for i, q in enumerate(saitama_queries, 1):
        output += f"{i}. **{q['city']}**\n"
        output += f"   - 検索クエリ: `{q['search_query']}`\n"
        output += f"   - 代替クエリ: `{q['alternative_query']}`\n"
        output += f"   - UPDATE文: `UPDATE building_regulations SET data_source_url='[収集したURL]' WHERE prefecture='{q['prefecture']}' AND city='{q['city']}';`\n\n"
    
    return output

if __name__ == "__main__":
    print("Phase 4-2: URL未設定自治体のURL収集スクリプト")
    print("=" * 60)
    
    # クエリ生成
    queries = generate_search_queries()
    print(f"対象自治体数: {len(queries)}件")
    print(f"- 千葉県: {len([q for q in queries if q['prefecture'] == '千葉県'])}件")
    print(f"- 埼玉県: {len([q for q in queries if q['prefecture'] == '埼玉県'])}件")
    
    # 手動収集リストを生成
    manual_list = generate_manual_collection_list()
    
    # ファイル出力
    output_file = "scripts/missing_urls_collection_list_phase4.md"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(manual_list)
    
    print(f"\n✅ 手動収集リストを生成しました: {output_file}")
    print("\n次のステップ:")
    print("1. WebSearch APIを使用してURLを収集")
    print("2. UPDATE文を生成")
    print("3. 本番環境に適用")
