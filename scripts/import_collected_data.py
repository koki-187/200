#!/usr/bin/env python3
"""
収集済みCSVデータをbuilding_regulationsテーブルに統合
data_collection_template.csvから読み込み、D1データベースに挿入
"""

import sqlite3
import csv
import sys
from datetime import datetime

DB_PATH = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/fa61e3e96d5df2e3e583ca0d20d2ccafd7d9be0dd479a159db0c50cbb5b76a9d.sqlite'

def load_csv_data(csv_path):
    """CSVファイルからデータを読み込み"""
    data = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # TO_COLLECTはスキップ（未収集データ）
            if row.get('verification_status') == 'TO_COLLECT':
                continue
            
            # VERIFIEDまたはデータが入力されている行のみ処理
            if row.get('verification_status') == 'VERIFIED' or row.get('one_room_applies'):
                data.append(row)
    
    return data

def map_csv_to_db_schema(row):
    """CSVデータをDB用スキーマにマッピング"""
    # apartment_restrictions_note（ワンルーム規制）
    apartment_note = None
    if row.get('one_room_applies') == 'あり':
        conditions = row.get('one_room_conditions', '').strip()
        apartment_note = conditions if conditions else '規制あり（詳細不明）'
    elif row.get('one_room_applies') == 'なし':
        apartment_note = '独自ワンルーム規制なし'
    
    # building_restrictions_note（近隣説明義務）
    building_note = None
    if row.get('neighbor_notice_required') == 'あり':
        procedure = row.get('neighbor_notice_procedure', '').strip()
        building_note = f"近隣通知: {procedure}" if procedure else '近隣説明義務あり'
    elif row.get('neighbor_notice_required') == 'なし':
        building_note = '近隣説明義務なし'
    
    # development_guideline（開発指導要綱）
    dev_guideline = None
    if row.get('development_guideline') == 'あり':
        # 駐輪場・駐車場・ゴミの情報を組み合わせ
        parking = row.get('parking_standard', '').strip()
        bicycle = row.get('bicycle_standard', '').strip()
        garbage = row.get('garbage_required', '').strip()
        
        details = []
        if parking:
            details.append(f"駐車:{parking}")
        if bicycle:
            details.append(f"駐輪:{bicycle}")
        if garbage == 'あり':
            details.append("ゴミ集積所必須")
        
        dev_guideline = f"あり（{', '.join(details)}）" if details else 'あり'
    elif row.get('development_guideline') == 'なし':
        dev_guideline = 'なし'
    
    # data_source（データソース）
    sources = []
    if row.get('one_room_url'):
        sources.append(f"ワンルーム:{row['one_room_url']}")
    if row.get('neighbor_url'):
        sources.append(f"近隣説明:{row['neighbor_url']}")
    if row.get('development_url'):
        sources.append(f"開発指導:{row['development_url']}")
    
    data_source = row.get('data_source', '') or (', '.join(sources) if sources else None)
    
    # verified_at
    verified_at = row.get('checked_date', datetime.now().strftime('%Y-%m-%d'))
    verified_at_iso = f"{verified_at}T00:00:00Z"
    
    return {
        'prefecture': row['prefecture'],
        'city': row['city'],
        'apartment_restrictions_note': apartment_note,
        'building_restrictions_note': building_note,
        'development_guideline': dev_guideline,
        'data_source': data_source,
        'verification_status': 'VERIFIED',
        'verified_at': verified_at_iso,
        'confidence_level': 'HIGH',
        'verified_by': 'User-2025-12-23',
        'notes': row.get('notes', '')
    }

def insert_to_db(conn, mapped_data):
    """データベースに挿入（既存データは更新）"""
    cursor = conn.cursor()
    
    inserted = 0
    updated = 0
    skipped = 0
    
    for data in mapped_data:
        prefecture = data['prefecture']
        city = data['city']
        
        # 既存データ確認
        cursor.execute("""
            SELECT id, apartment_restrictions_note, building_restrictions_note, 
                   development_guideline
            FROM building_regulations
            WHERE prefecture = ? AND city = ? AND district IS NULL
            ORDER BY verification_status DESC, id DESC
            LIMIT 1
        """, (prefecture, city))
        
        existing = cursor.fetchone()
        
        if existing:
            # 既存データの更新
            existing_id = existing[0]
            
            # 既存情報と新情報をマージ（新情報を優先）
            cursor.execute("""
                UPDATE building_regulations
                SET apartment_restrictions_note = COALESCE(?, apartment_restrictions_note),
                    building_restrictions_note = COALESCE(?, building_restrictions_note),
                    development_guideline = COALESCE(?, development_guideline),
                    data_source = COALESCE(?, data_source),
                    verification_status = 'VERIFIED',
                    verified_at = ?,
                    confidence_level = 'HIGH',
                    verified_by = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                data['apartment_restrictions_note'],
                data['building_restrictions_note'],
                data['development_guideline'],
                data['data_source'],
                data['verified_at'],
                data['verified_by'],
                existing_id
            ))
            
            print(f"✅ 更新: {city} (ID:{existing_id})")
            updated += 1
        else:
            # 新規データの挿入
            cursor.execute("""
                INSERT INTO building_regulations (
                    prefecture, city,
                    apartment_restrictions_note, building_restrictions_note,
                    development_guideline, data_source,
                    verification_status, verified_at,
                    confidence_level, verified_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED', ?, 'HIGH', ?)
            """, (
                prefecture, city,
                data['apartment_restrictions_note'],
                data['building_restrictions_note'],
                data['development_guideline'],
                data['data_source'],
                data['verified_at'],
                data['verified_by']
            ))
            
            new_id = cursor.lastrowid
            print(f"✅ 新規追加: {city} (新ID:{new_id})")
            inserted += 1
    
    conn.commit()
    
    print(f"\n📊 統合結果:")
    print(f"  - 新規追加: {inserted}件")
    print(f"  - 更新: {updated}件")
    print(f"  - スキップ: {skipped}件")
    
    return inserted + updated

def main():
    """メイン処理"""
    csv_path = 'scripts/data_collection_template.csv'
    
    try:
        # CSVデータ読み込み
        print(f"📖 CSVファイル読み込み: {csv_path}")
        csv_data = load_csv_data(csv_path)
        
        if not csv_data:
            print("⚠️  VERIFIED済みデータが見つかりませんでした")
            print("💡 data_collection_template.csvにデータを記入してください")
            return 1
        
        print(f"✅ {len(csv_data)}件のVERIFIED済みデータを検出")
        
        # スキーママッピング
        print("\n🔄 データマッピング中...")
        mapped_data = [map_csv_to_db_schema(row) for row in csv_data]
        
        # データベース統合
        print(f"\n💾 データベースに統合中: {DB_PATH}")
        conn = sqlite3.connect(DB_PATH)
        count = insert_to_db(conn, mapped_data)
        conn.close()
        
        if count > 0:
            print(f"\n🎉 統合完了: {count}件の自治体データを処理しました")
            return 0
        else:
            print("\n⚠️  統合処理は完了しましたが、変更はありませんでした")
            return 1
            
    except FileNotFoundError:
        print(f"❌ エラー: ファイルが見つかりません: {csv_path}")
        print(f"💡 scripts/data_collection_template.csvを確認してください")
        return 1
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
