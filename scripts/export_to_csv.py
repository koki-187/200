#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
データベースエクスポートスクリプト
building_regulationsテーブルのデータをCSVに変換
"""

import json
import csv
import sys
from datetime import datetime

def export_building_regulations_to_csv(json_file, csv_file):
    """
    JSONファイルからbuilding_regulationsデータを読み込み、CSVに変換
    
    Args:
        json_file: 入力JSONファイルパス
        csv_file: 出力CSVファイルパス
    """
    try:
        # JSONファイルを読み込み
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # wrangler出力形式から結果を抽出
        if isinstance(data, list) and len(data) > 0:
            results = data[0].get('results', [])
        else:
            print(f"エラー: 無効なJSON形式です", file=sys.stderr)
            return False
        
        if not results:
            print(f"警告: データが空です", file=sys.stderr)
            return False
        
        # CSVファイルに書き込み
        with open(csv_file, 'w', encoding='utf-8-sig', newline='') as f:
            # ヘッダーを取得（最初のレコードのキー）
            fieldnames = list(results[0].keys())
            
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            # 全レコードを書き込み
            for row in results:
                writer.writerow(row)
        
        print(f"✅ CSVエクスポート完了: {csv_file}")
        print(f"📊 エクスポート件数: {len(results)}件")
        
        # 統計情報を表示
        prefectures = {}
        for row in results:
            pref = row.get('prefecture', '不明')
            prefectures[pref] = prefectures.get(pref, 0) + 1
        
        print(f"\n📍 都道府県別統計:")
        for pref, count in sorted(prefectures.items()):
            print(f"  {pref}: {count}件")
        
        return True
        
    except FileNotFoundError:
        print(f"エラー: ファイルが見つかりません: {json_file}", file=sys.stderr)
        return False
    except json.JSONDecodeError as e:
        print(f"エラー: JSON解析に失敗しました: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"エラー: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    # デフォルトのファイルパス
    json_file = '/tmp/building_regulations_raw.json'
    csv_file = '/home/user/webapp/exports/building_regulations_export.csv'
    
    # コマンドライン引数がある場合は上書き
    if len(sys.argv) >= 2:
        json_file = sys.argv[1]
    if len(sys.argv) >= 3:
        csv_file = sys.argv[2]
    
    # エクスポート実行
    success = export_building_regulations_to_csv(json_file, csv_file)
    sys.exit(0 if success else 1)
