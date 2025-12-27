#!/usr/bin/env python3
"""
東京都17市のワンルーム・開発規制条例を自動収集
"""
import time
import json

# 東京都17市のリスト
TOKYO_CITIES = [
    "昭島市", "小平市", "日野市", "東村山市", "国分寺市", "国立市", "福生市", "狛江市",
    "東大和市", "清瀬市", "東久留米市", "武蔵村山市", "多摩市", "稲城市", "羽村市",
    "あきる野市", "西東京市"
]

def main():
    """東京都17市の検索クエリを生成"""
    print("=" * 80)
    print("東京都17市のワンルーム・開発規制条例検索")
    print("=" * 80)
    
    queries = []
    
    for city in TOKYO_CITIES:
        # 検索クエリパターン
        query_patterns = [
            f"{city} ワンルーム 条例 site:{city.replace('市', '')}.tokyo.jp",
            f"{city} 開発 指導要綱 site:{city.replace('市', '')}.tokyo.jp",
            f"{city} 集合住宅 ワンルーム 規制",
        ]
        
        for query in query_patterns:
            queries.append({
                "city": city,
                "query": query,
                "prefecture": "東京都"
            })
    
    # クエリリストをファイルに保存
    with open('/home/user/webapp/scripts/tokyo_17_cities_queries.json', 'w', encoding='utf-8') as f:
        json.dump(queries, f, ensure_ascii=False, indent=2)
    
    print(f"\n合計 {len(queries)} 件の検索クエリを生成しました")
    print(f"保存先: /home/user/webapp/scripts/tokyo_17_cities_queries.json")
    
    # 最初の5件を表示
    print(f"\n最初の5件:")
    for i, q in enumerate(queries[:5], 1):
        print(f"{i}. {q['city']}: {q['query']}")
    
    print(f"\n次のステップ:")
    print(f"1. WebSearch APIを使用して各クエリを検索")
    print(f"2. 検索結果を解析してデータを抽出")
    print(f"3. SQLスクリプトを生成")
    print(f"4. ローカルD1に統合")
    print(f"5. 本番環境に反映")

if __name__ == '__main__':
    main()
