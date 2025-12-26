#!/usr/bin/env python3
"""
ChatGPT提供データをMAAアプリのbuilding_regulationsテーブルに統合
スキーマ不一致を吸収し、既存データとマージ
"""

import sqlite3
import sys
from datetime import datetime

# ChatGPT提供データ（01_building_regulations_inserts.sqlから抽出）
CHATGPT_DATA = [
    {
        'prefecture': '神奈川県',
        'municipality': '藤沢市',
        'regulation_type': 'DEVELOPMENT',
        'title': '藤沢市特定開発事業等に係る手続及び基準に関する条例（手引）',
        'url': 'https://www.city.fujisawa.kanagawa.jp/kaihatsu/machizukuri/kenchiku/kaihatsu/jore.html',
        'summary': '特定開発事業等に関する手続・基準。掲示・説明会・縦覧など手引あり。',
        'verified': 1,
        'checked_on': '2025-12-23'
    },
    {
        'prefecture': '神奈川県',
        'municipality': '茅ヶ崎市',
        'regulation_type': 'MIDRISE_DISPUTE',
        'title': '茅ヶ崎市中高層建築物の建築に係る紛争の調整に関する条例（PDF）',
        'url': 'https://www.city.chigasaki.kanagawa.jp/_res/projects/default_project/_page_/001/023/183/jyorei.pdf',
        'summary': '中高層建築物の紛争調整（あっせん・調停等）。公式PDF。',
        'verified': 1,
        'checked_on': '2025-12-23'
    },
    {
        'prefecture': '千葉県',
        'municipality': '千葉市',
        'regulation_type': 'ONE_ROOM',
        'title': '千葉市ワンルームマンション建築指導要綱（案内）',
        'url': 'https://www.city.chiba.jp/toshi/kenchiku/shido/oneroom.html',
        'summary': 'ワンルームマンション建築指導要綱の案内（閲覧・手続）。',
        'verified': 1,
        'checked_on': '2025-12-23'
    },
    {
        'prefecture': '千葉県',
        'municipality': '船橋市',
        'regulation_type': 'ONE_ROOM',
        'title': '船橋市ワンルーム形式共同住宅手続（案内）',
        'url': 'https://www.city.funabashi.lg.jp/jigyou/kenchiku_kaihatsu/003/04/p000290.html',
        'summary': 'ワンルーム形式共同住宅の手続案内（定義・対象・近隣説明等）。',
        'verified': 1,
        'checked_on': '2025-12-23'
    }
]

def map_regulation_type_to_columns(regulation_type, summary):
    """
    ChatGPTのregulation_typeをMAAアプリの複数カラムにマッピング
    """
    mapping = {
        'apartment_restrictions_note': None,
        'building_restrictions_note': None,
        'development_guideline': None
    }
    
    if regulation_type == 'ONE_ROOM':
        mapping['apartment_restrictions_note'] = summary
    elif regulation_type == 'MIDRISE_DISPUTE':
        mapping['building_restrictions_note'] = summary
    elif regulation_type == 'DEVELOPMENT':
        mapping['development_guideline'] = 'あり'
        mapping['building_restrictions_note'] = summary
    
    return mapping

def integrate_chatgpt_data():
    """
    ChatGPTデータを既存building_regulationsに統合
    """
    db_path = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/fa61e3e96d5df2e3e583ca0d20d2ccafd7d9be0dd479a159db0c50cbb5b76a9d.sqlite'
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    integrated_count = 0
    skipped_count = 0
    
    for data in CHATGPT_DATA:
        prefecture = data['prefecture']
        city = data['municipality']  # 'municipality' → 'city'
        
        # 既存データを確認（ID取得）
        cursor.execute("""
            SELECT id, apartment_restrictions_note, building_restrictions_note, 
                   development_guideline, data_source
            FROM building_regulations
            WHERE prefecture = ? AND city = ? AND district IS NULL
            ORDER BY verification_status DESC, id DESC
            LIMIT 1
        """, (prefecture, city))
        
        existing = cursor.fetchone()
        
        # スキーママッピング
        mapped = map_regulation_type_to_columns(data['regulation_type'], data['summary'])
        data_source = f"{data['title']} ({data['url']})"
        verified_at = f"{data['checked_on']}T00:00:00Z"
        
        if existing:
            # 既存データの更新（追記）
            existing_id = existing[0]
            existing_apartment = existing[1] or ''
            existing_building = existing[2] or ''
            existing_dev = existing[3] or ''
            existing_source = existing[4] or ''
            
            # 既存情報とChatGPT情報をマージ
            new_apartment = (existing_apartment + '\n' + mapped['apartment_restrictions_note']).strip() if mapped['apartment_restrictions_note'] else existing_apartment
            new_building = (existing_building + '\n' + mapped['building_restrictions_note']).strip() if mapped['building_restrictions_note'] else existing_building
            new_dev = mapped['development_guideline'] if mapped['development_guideline'] else existing_dev
            new_source = existing_source if existing_source else data_source
            
            cursor.execute("""
                UPDATE building_regulations
                SET apartment_restrictions_note = ?,
                    building_restrictions_note = ?,
                    development_guideline = ?,
                    data_source = COALESCE(data_source, ?),
                    verification_status = 'VERIFIED',
                    verified_at = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_apartment or None, new_building or None, new_dev or None, 
                  new_source, verified_at, existing_id))
            
            print(f"✅ 更新: {city} (ID:{existing_id})")
            integrated_count += 1
        else:
            # 新規データの挿入
            cursor.execute("""
                INSERT INTO building_regulations (
                    prefecture, city, 
                    apartment_restrictions_note, building_restrictions_note, 
                    development_guideline, data_source,
                    verification_status, verified_at, 
                    confidence_level, verified_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED', ?, 'HIGH', 'ChatGPT-2025-12-23')
            """, (
                prefecture, city,
                mapped['apartment_restrictions_note'], 
                mapped['building_restrictions_note'],
                mapped['development_guideline'],
                data_source,
                verified_at
            ))
            
            new_id = cursor.lastrowid
            print(f"✅ 新規追加: {city} (新ID:{new_id})")
            integrated_count += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n📊 統合結果: {integrated_count}件処理完了, {skipped_count}件スキップ")
    return integrated_count

if __name__ == '__main__':
    try:
        count = integrate_chatgpt_data()
        sys.exit(0 if count > 0 else 1)
    except Exception as e:
        print(f"❌ エラー: {e}", file=sys.stderr)
        sys.exit(1)
