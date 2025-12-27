#!/usr/bin/env python3
"""
東京都17市のワンルーム・開発規制条例を段階的に収集
WebSearch API呼び出しは手動トリガー
"""
import json
import time
from pathlib import Path

TOKYO_CITIES = [
    "昭島市", "小平市", "日野市", "東村山市", "国分寺市", "国立市", "福生市", "狛江市",
    "東大和市", "清瀬市", "東久留米市", "武蔵村山市", "多摩市", "稲城市", "羽村市",
    "あきる野市", "西東京市"
]

def create_search_batch():
    """バッチ検索用のクエリを生成"""
    batches = []
    
    for city in TOKYO_CITIES:
        batch = {
            "city": city,
            "prefecture": "東京都",
            "queries": [
                f"{city} ワンルーム 条例",
                f"{city} 開発 指導要綱",
                f"{city} 集合住宅 規制"
            ],
            "status": "pending",
            "results": []
        }
        batches.append(batch)
    
    return batches

def save_batch_file(batches, filepath):
    """バッチファイルを保存"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(batches, f, ensure_ascii=False, indent=2)
    print(f"バッチファイルを保存しました: {filepath}")

def load_batch_file(filepath):
    """バッチファイルを読み込み"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def main():
    """メイン処理"""
    output_file = Path('/home/user/webapp/scripts/tokyo_17_cities_batch.json')
    
    # バッチファイルが存在する場合は読み込み
    if output_file.exists():
        print(f"既存のバッチファイルを読み込みます: {output_file}")
        batches = load_batch_file(output_file)
        
        # ステータスサマリ
        status_count = {}
        for batch in batches:
            status = batch.get('status', 'pending')
            status_count[status] = status_count.get(status, 0) + 1
        
        print(f"\nステータスサマリ:")
        for status, count in status_count.items():
            print(f"  {status}: {count}自治体")
        
    else:
        print(f"新規バッチファイルを作成します: {output_file}")
        batches = create_search_batch()
        save_batch_file(batches, output_file)
        
        print(f"\n合計 {len(batches)} 自治体のバッチを作成しました")
        print(f"\n次のステップ:")
        print(f"1. WebSearchツールを使用して各自治体のクエリを検索")
        print(f"2. 検索結果を tokyo_17_cities_batch.json に追記")
        print(f"3. すべての自治体のステータスが 'completed' になったら次のスクリプトへ")
        print(f"\nサンプルクエリ（最初の3自治体）:")
        for i, batch in enumerate(batches[:3], 1):
            print(f"\n{i}. {batch['city']}:")
            for query in batch['queries']:
                print(f"   - {query}")

if __name__ == '__main__':
    main()
