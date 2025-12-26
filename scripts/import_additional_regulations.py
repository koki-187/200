#!/usr/bin/env python3
"""
追加建築規制データのインポートスクリプト
v3.153.140で追加された神奈川・千葉のデータを既存building_regulationsテーブルに統合
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

# データベースパス
DB_PATH = Path("/home/user/webapp/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/c245e6b41993a6d31e3669641939c5ed983b53700180d7db28a7b6411734b23d.sqlite")

# CSVファイルパス  
CSV_PATH = Path("/home/user/uploaded_files/kanagawa_chiba_summary.csv")

def parse_csv_data():
    """CSVファイルを解析してデータを抽出"""
    import csv
    
    data_list = []
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data_list.append({
                'prefecture': row['prefecture'],
                'municipality': row['municipality'],
                'one_room_applies': row['one_room_applies'],
                'conditions_summary': row['conditions_summary'],
                'neighbor_notice': row['neighbor_notice'],
                'parking': row['parking'],
                'bike': row['bike'],
                'garbage': row['garbage'],
                'verified': row['verified']
            })
    
    return data_list

def map_to_building_regulations(csv_data):
    """CSVデータをbuilding_regulationsテーブル形式にマッピング"""
    
    # 既存データとの対応
    # v3.153.139で既に以下のデータが登録済み:
    # 神奈川県: 藤沢市(ID:63), 茅ヶ崎市(ID:64), 大和市(ID:65), 横須賀市(ID:66)
    # 千葉県: 千葉市(ID:67), 船橋市(ID:68), 市川市(ID:69), 松戸市(ID:70), 柏市(ID:71)
    
    # これらのデータは既に存在するため、UPDATE処理で情報を追加・補完する
    
    regulations = []
    
    for data in csv_data:
        prefecture = data['prefecture']
        city = data['municipality']
        
        # データソース情報の構築
        if prefecture == '神奈川県':
            if city == '藤沢市':
                data_source = '藤沢市公式サイト・条例/要綱確認'
                data_source_url = 'https://www.city.fujisawa.kanagawa.jp/kaihatsu/'
                development_guideline = 'あり（特定開発事業条例）'
                development_guideline_url = 'https://www.city.fujisawa.kanagawa.jp/kaihatsu/'
                
                # 詳細情報
                apartment_restrictions_note = data['conditions_summary']
                building_restrictions_note = f"近隣通知: {data['neighbor_notice']}"
                
            elif city == '茅ヶ崎市':
                data_source = '茅ヶ崎市公式サイト・条例/要綱確認'
                data_source_url = 'https://www.city.chigasaki.kanagawa.jp/'
                development_guideline = 'あり（建築基準条例40条上乗せ）'
                development_guideline_url = 'https://www.city.chigasaki.kanagawa.jp/'
                
                apartment_restrictions_note = data['conditions_summary']
                building_restrictions_note = '敷地内通路幅員の上乗せ規定'
                
            elif city == '大和市':
                data_source = '大和市公式サイト・条例/要綱確認'
                data_source_url = 'https://www.city.yamato.lg.jp/'
                development_guideline = 'あり（建築基準条例）'
                development_guideline_url = 'https://www.city.yamato.lg.jp/'
                
                apartment_restrictions_note = data['conditions_summary']
                building_restrictions_note = f"近隣通知: {data['neighbor_notice']}"
                
            elif city == '横須賀市':
                data_source = '横須賀市公式サイト・条例/要綱確認'
                data_source_url = 'https://www.city.yokosuka.kanagawa.jp/'
                development_guideline = 'あり（建築基準条例・駐車条例）'
                development_guideline_url = 'https://www.city.yokosuka.kanagawa.jp/'
                
                apartment_restrictions_note = data['conditions_summary']
                building_restrictions_note = f"駐車: {data['parking']}"
                
        elif prefecture == '千葉県':
            if city == '千葉市':
                data_source = '千葉市公式サイト・条例/要綱確認'
                data_source_url = 'https://www.city.chiba.jp/'
                development_guideline = 'あり（ワンルーム建築指導）'
                development_guideline_url = 'https://www.city.chiba.jp/'
                
                apartment_restrictions_note = data['conditions_summary']
                building_restrictions_note = f"近隣通知: {data['neighbor_notice']}"
                
            elif city == '船橋市':
                data_source = '船橋市公式サイト・条例/要綱確認'
                data_source_url = 'https://www.city.funabashi.lg.jp/'
                development_guideline = 'あり（ワンルーム形式共同住宅指導）'
                development_guideline_url = 'https://www.city.funabashi.lg.jp/'
                
                apartment_restrictions_note = data['conditions_summary']
                building_restrictions_note = f"近隣通知: {data['neighbor_notice']}"
                
            elif city == '市川市':
                data_source = '市川市公式サイト・条例/要綱確認'
                data_source_url = 'https://www.city.ichikawa.lg.jp/'
                development_guideline = 'あり（集合住宅管理指針）'
                development_guideline_url = 'https://www.city.ichikawa.lg.jp/'
                
                apartment_restrictions_note = data['conditions_summary']
                building_restrictions_note = f"表示要件: {data['neighbor_notice']}"
                
            elif city == '松戸市':
                data_source = '松戸市公式サイト・条例/要綱確認'
                data_source_url = 'https://www.city.matsudo.chiba.jp/'
                development_guideline = 'あり（ワンルーム指導要綱）'
                development_guideline_url = 'https://www.city.matsudo.chiba.jp/'
                
                apartment_restrictions_note = data['conditions_summary']
                building_restrictions_note = f"事前公開板: {data['neighbor_notice']}"
                
            elif city == '柏市':
                data_source = '柏市公式サイト・条例/要綱確認'
                data_source_url = 'https://www.city.kashiwa.lg.jp/'
                development_guideline = 'あり（開発事業条例統合）'
                development_guideline_url = 'https://www.city.kashiwa.lg.jp/'
                
                apartment_restrictions_note = data['conditions_summary']
                building_restrictions_note = '旧要綱廃止・条例統合'
        
        regulations.append({
            'prefecture': prefecture,
            'city': city,
            'data_source': data_source,
            'data_source_url': data_source_url,
            'development_guideline': development_guideline,
            'development_guideline_url': development_guideline_url,
            'apartment_restrictions_note': apartment_restrictions_note,
            'building_restrictions_note': building_restrictions_note,
            'verification_status': 'VERIFIED' if data['verified'] == 'VERIFIED' else 'verified',
            'confidence_level': 'HIGH',
            'last_updated': datetime.now().isoformat()
        })
    
    return regulations

def update_database(regulations):
    """データベースを更新"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    updated_count = 0
    skipped_count = 0
    
    for reg in regulations:
        try:
            # 既存レコードを検索
            cursor.execute("""
                SELECT id FROM building_regulations
                WHERE prefecture = ? AND city = ?
                ORDER BY verification_status = 'VERIFIED' DESC
                LIMIT 1
            """, (reg['prefecture'], reg['city']))
            
            result = cursor.fetchone()
            
            if result:
                # 既存レコードを更新（補完情報を追加）
                record_id = result[0]
                
                cursor.execute("""
                    UPDATE building_regulations
                    SET
                        apartment_restrictions_note = ?,
                        building_restrictions_note = ?,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (
                    reg['apartment_restrictions_note'],
                    reg['building_restrictions_note'],
                    record_id
                ))
                
                updated_count += 1
                print(f"✅ Updated: {reg['prefecture']} {reg['city']} (ID: {record_id})")
            else:
                skipped_count += 1
                print(f"⚠️ Skipped (not found): {reg['prefecture']} {reg['city']}")
                
        except Exception as e:
            print(f"❌ Error updating {reg['prefecture']} {reg['city']}: {e}")
            conn.rollback()
            raise
    
    conn.commit()
    conn.close()
    
    return updated_count, skipped_count

def main():
    """メイン処理"""
    print("=" * 60)
    print("追加建築規制データインポート開始")
    print("=" * 60)
    
    # CSVデータ解析
    print("\n1. CSVデータ解析...")
    csv_data = parse_csv_data()
    print(f"   解析完了: {len(csv_data)}件")
    
    # building_regulations形式へマッピング
    print("\n2. building_regulations形式へマッピング...")
    regulations = map_to_building_regulations(csv_data)
    print(f"   マッピング完了: {len(regulations)}件")
    
    # データベース更新
    print("\n3. データベース更新...")
    updated_count, skipped_count = update_database(regulations)
    
    # 結果サマリー
    print("\n" + "=" * 60)
    print("インポート完了")
    print("=" * 60)
    print(f"更新: {updated_count}件")
    print(f"スキップ: {skipped_count}件")
    print(f"合計: {len(regulations)}件")
    print("=" * 60)

if __name__ == "__main__":
    main()
