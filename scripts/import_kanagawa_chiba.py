#!/usr/bin/env python3
"""
Import Kanagawa and Chiba VERIFIED cities data
Simplified direct database insertion script
"""

import sqlite3
import sys
from pathlib import Path

# Kanagawa and Chiba cities data
CITIES_DATA = [
    # Kanagawa (4 cities)
    {
        "prefecture": "神奈川県",
        "city": "藤沢市",
        "development_guideline": "あり（特定開発事業条例）",
        "development_guideline_url": "https://www.city.fujisawa.kanagawa.jp/kaihatsu/",
        "min_unit_area": 30,
        "studio_definition": "3階以上・10戸以上・30㎡未満の住戸",
        "signboard_period_days": 10,
        "notes": "掲示10日→説明会→縦覧10日の手続フローあり。駐車場・自転車駐輪場・ゴミ置場は条例で規定。"
    },
    {
        "prefecture": "神奈川県",
        "city": "茅ヶ崎市",
        "development_guideline": "あり（建築基準条例40条上乗せ）",
        "development_guideline_url": "https://www.city.chigasaki.kanagawa.jp/",
        "notes": "独自ワンルーム規制なし。建基法40条上乗せ（敷地内通路幅員）あり。手続条例・駐車場・自転車・ゴミは条例で規定。"
    },
    {
        "prefecture": "神奈川県",
        "city": "大和市",
        "development_guideline": "あり（建築基準条例）",
        "development_guideline_url": "https://www.city.yamato.lg.jp/",
        "min_unit_area": 30,
        "studio_definition": "3階以上・10戸以上・30㎡未満の住戸",
        "notes": "条例手続あり。駐車場・自転車駐輪場・ゴミ置場は条例で規定。"
    },
    {
        "prefecture": "神奈川県",
        "city": "横須賀市",
        "development_guideline": "あり（建築基準条例・駐車条例）",
        "development_guideline_url": "https://www.city.yokosuka.kanagawa.jp/",
        "notes": "独自ワンルーム規制なし（建基法のみ）。条例手続・駐車条例・自転車・ゴミは条例で規定。"
    },
    # Chiba (5 cities)
    {
        "prefecture": "千葉県",
        "city": "千葉市",
        "development_guideline": "あり（ワンルーム建築指導）",
        "development_guideline_url": "https://www.city.chiba.jp/",
        "min_unit_area": 29,
        "studio_definition": "29㎡以下・6戸以上の住戸",
        "studio_ratio_threshold": 0.33,
        "notes": "29㎡以下が6戸以上かつ全体の1/3以上の場合に適用。事前協議制度あり。駐車場・自転車・ゴミは条例で規定。"
    },
    {
        "prefecture": "千葉県",
        "city": "船橋市",
        "development_guideline": "あり（ワンルーム形式共同住宅指導）",
        "development_guideline_url": "https://www.city.funabashi.lg.jp/",
        "min_unit_area": 25,
        "studio_definition": "25㎡未満・8戸以上の住戸",
        "notes": "25㎡未満・8戸以上が対象。説明要。駐車場・自転車・ゴミは条例で規定。"
    },
    {
        "prefecture": "千葉県",
        "city": "市川市",
        "development_guideline": "あり（集合住宅管理指針）",
        "development_guideline_url": "https://www.city.ichikawa.lg.jp/",
        "manager_room_threshold": 30,
        "notes": "独自ワンルーム規制なし。30戸以上で管理体制が必要。表示要。駐車場・自転車・ゴミは条例で規定。"
    },
    {
        "prefecture": "千葉県",
        "city": "松戸市",
        "development_guideline": "あり（ワンルーム指導要綱）",
        "development_guideline_url": "https://www.city.matsudo.chiba.jp/",
        "signboard_period_days": 14,
        "notes": "事前公開板14日の掲示期間あり。説明要。駐車場・自転車・ゴミは条例で規定。"
    },
    {
        "prefecture": "千葉県",
        "city": "柏市",
        "development_guideline": "あり（開発事業条例統合）",
        "development_guideline_url": "https://www.city.kashiwa.lg.jp/",
        "notes": "独自ワンルーム規制なし（旧要綱廃止・開発事業条例に統合）。条例手続あり。駐車場・自転車・ゴミは条例で規定。"
    }
]


def find_db_path():
    """Find the local D1 database path"""
    wrangler_dir = Path("/home/user/webapp/.wrangler/state/v3/d1/miniflare-D1DatabaseObject")
    if wrangler_dir.exists():
        db_files = list(wrangler_dir.glob("*.sqlite"))
        if db_files:
            return str(db_files[0])
    return None


def insert_city_data(conn, city_data):
    """Insert city data into building_regulations and related tables"""
    cursor = conn.cursor()
    
    # Insert into building_regulations
    cursor.execute("""
        INSERT INTO building_regulations (
            prefecture, city, normalized_address,
            zoning_type, apartment_construction_feasible,
            development_guideline, development_guideline_url,
            data_source, confidence_level, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        city_data["prefecture"],
        city_data["city"],
        f"{city_data['prefecture']}{city_data['city']}",
        "要確認",
        1,
        city_data.get("development_guideline"),
        city_data.get("development_guideline_url"),
        f"{city_data['city']}公式サイト・条例/要綱確認",
        "HIGH",
        "VERIFIED"
    ))
    
    building_regulation_id = cursor.lastrowid
    print(f"✓ Inserted {city_data['prefecture']} {city_data['city']} (ID: {building_regulation_id})")
    
    # Insert into building_design_requirements if applicable
    if any(k in city_data for k in ["min_unit_area", "studio_definition", "signboard_period_days", "manager_room_threshold"]):
        cursor.execute("""
            INSERT INTO building_design_requirements (
                building_regulation_id,
                waste_storage_required, waste_separation_required,
                neighbor_explanation_required, pre_consultation_required,
                signboard_required, signboard_period_days,
                min_unit_area, studio_definition, studio_ratio_threshold,
                manager_room_required, manager_room_threshold,
                outdoor_staircase_allowed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            building_regulation_id,
            1, 1,  # waste_storage_required, waste_separation_required
            1, 1 if city_data.get("min_unit_area") or city_data.get("signboard_period_days") else 0,  # neighbor_explanation_required, pre_consultation_required
            1 if city_data.get("signboard_period_days") else 0,  # signboard_required
            city_data.get("signboard_period_days"),
            city_data.get("min_unit_area"),
            city_data.get("studio_definition"),
            city_data.get("studio_ratio_threshold"),
            1 if city_data.get("manager_room_threshold") else 0,  # manager_room_required
            city_data.get("manager_room_threshold"),
            1  # outdoor_staircase_allowed
        ))
        print(f"  ✓ Added building_design_requirements")
    
    # Insert into local_specific_requirements
    cursor.execute("""
        INSERT INTO local_specific_requirements (
            building_regulation_id,
            has_building_standards_act, has_prefecture_ordinance, has_municipal_ordinance, has_development_guideline,
            notes
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (
        building_regulation_id,
        1, 1, 1, 1 if city_data.get("development_guideline") else 0,
        city_data.get("notes", "")
    ))
    print(f"  ✓ Added local_specific_requirements")
    
    return building_regulation_id


def main():
    db_path = find_db_path()
    if not db_path:
        print("❌ Error: Could not find local D1 database")
        print("Please run 'npm run dev' first to create the database")
        sys.exit(1)
    
    print(f"📁 Using database: {db_path}")
    print(f"📊 Importing {len(CITIES_DATA)} cities...")
    print()
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        imported = 0
        for city_data in CITIES_DATA:
            try:
                insert_city_data(conn, city_data)
                imported += 1
            except sqlite3.IntegrityError as e:
                print(f"  ⚠️  Already exists or constraint violation: {e}")
            except Exception as e:
                print(f"  ❌ Error: {e}")
                conn.rollback()
                continue
        
        conn.commit()
        print()
        print(f"✅ Successfully imported {imported}/{len(CITIES_DATA)} cities")
        
        # Verify the data
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN verification_status='VERIFIED' THEN 1 ELSE 0 END) as verified
            FROM building_regulations
        """)
        stats = cursor.fetchone()
        print(f"📊 Database statistics:")
        print(f"   Total entries: {stats[0]}")
        print(f"   VERIFIED entries: {stats[1]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
