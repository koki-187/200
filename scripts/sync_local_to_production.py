#!/usr/bin/env python3
"""
ローカルD1から本番環境に存在しない自治体のデータをエクスポートしてSQLスクリプトを生成
"""
import subprocess
import json
import sys
from datetime import datetime

def execute_d1_command(db_type, sql):
    """D1コマンドを実行してJSONレスポンスを取得"""
    cmd = [
        "npx", "wrangler", "d1", "execute", "real-estate-200units-db",
        f"--{db_type}",
        f"--command={sql}"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, cwd="/home/user/webapp", timeout=60)
    
    if result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        return []
    
    # JSON解析
    try:
        # 最初の [  を見つける
        output = result.stdout
        start_idx = output.find('[')
        if start_idx < 0:
            return []
        
        # 最後の ] を見つける（ログ出力の後）
        json_str = output[start_idx:]
        # 複数のJSON objects が連結されている可能性があるため、最初のobjectのみ取得
        json_data = json.loads(json_str)
        
        if isinstance(json_data, list) and len(json_data) > 0:
            return json_data[0].get('results', [])
    except Exception as e:
        print(f"JSON parse error: {e}", file=sys.stderr)
    
    return []

def get_all_cities_by_db(db_type):
    """指定DBから全自治体のデータを取得"""
    sql = "SELECT * FROM building_regulations WHERE verification_status='VERIFIED' ORDER BY prefecture, city;"
    return execute_d1_command(db_type, sql)

def generate_insert_sql(record):
    """レコードからINSERT文を生成"""
    # 必須フィールド
    prefecture = record.get('prefecture', '')
    city = record.get('city', '')
    normalized_address = record.get('normalized_address', f"{prefecture}{city}")
    
    # 条例データ
    has_oneroom_regulation = record.get('has_oneroom_regulation', 0)
    oneroom_min_area = record.get('oneroom_min_area', 'NULL')
    oneroom_max_ratio = record.get('oneroom_max_ratio', 'NULL')
    parking_requirement = record.get('parking_requirement') or 'NULL'
    
    # データ品質フィールド
    confidence_level = record.get('confidence_level', 'high')
    verification_status = record.get('verification_status', 'VERIFIED')
    data_source_url = record.get('data_source_url', '')
    
    # oneroom_min_areaとoneroom_max_ratioはNUMBERなので、NULLの場合はそのまま、値がある場合は数値として扱う
    if oneroom_min_area == 'NULL' or oneroom_min_area is None:
        oneroom_min_area_str = 'NULL'
    else:
        oneroom_min_area_str = str(oneroom_min_area)
    
    if oneroom_max_ratio == 'NULL' or oneroom_max_ratio is None:
        oneroom_max_ratio_str = 'NULL'
    else:
        oneroom_max_ratio_str = str(oneroom_max_ratio)
    
    if parking_requirement == 'NULL' or not parking_requirement:
        parking_requirement_str = 'NULL'
    else:
        parking_requirement_str = f"'{parking_requirement}'"
    
    if not data_source_url:
        data_source_url_str = 'NULL'
    else:
        data_source_url_str = f"'{data_source_url}'"
    
    sql = f"""INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address,
    has_oneroom_regulation, oneroom_min_area, oneroom_max_ratio,
    parking_requirement,
    confidence_level, verification_status, data_source_url
) VALUES (
    '{prefecture}', '{city}', '{normalized_address}',
    {has_oneroom_regulation}, {oneroom_min_area_str}, {oneroom_max_ratio_str},
    {parking_requirement_str},
    '{confidence_level}', '{verification_status}', {data_source_url_str}
);"""
    
    return sql

def main():
    print("=" * 80)
    print("ローカルD1から本番環境へのデータ同期SQLスクリプト生成")
    print("=" * 80)
    
    print("\n📊 ローカルD1のデータを取得中...")
    local_data = get_all_cities_by_db("local")
    print(f"   取得: {len(local_data)}レコード")
    
    print("\n📊 本番環境のデータを取得中...")
    production_data = get_all_cities_by_db("remote")
    print(f"   取得: {len(production_data)}レコード")
    
    # 本番環境に存在する自治体のセット
    production_cities = set()
    for record in production_data:
        key = (record.get('prefecture'), record.get('city'))
        production_cities.add(key)
    
    # ローカルD1にあるが本番環境にない自治体
    missing_records = []
    for record in local_data:
        key = (record.get('prefecture'), record.get('city'))
        if key not in production_cities:
            missing_records.append(record)
    
    print(f"\n🔍 差分: {len(missing_records)}自治体が本番環境に存在しません")
    
    if missing_records:
        # 都道府県別に集計
        by_pref = {}
        for record in missing_records:
            pref = record.get('prefecture')
            if pref not in by_pref:
                by_pref[pref] = []
            by_pref[pref].append(record.get('city'))
        
        print("\n📋 本番環境に存在しない自治体:")
        for pref in sorted(by_pref.keys()):
            cities = by_pref[pref]
            print(f"   {pref}: {len(cities)}自治体 - {', '.join(sorted(cities))}")
        
        # SQLスクリプト生成
        output_file = f"scripts/sync_local_to_production_{datetime.now().strftime('%Y%m%d')}.sql"
        
        print(f"\n📝 SQLスクリプトを生成中: {output_file}")
        
        with open(f"/home/user/webapp/{output_file}", 'w', encoding='utf-8') as f:
            f.write("-- ========================================\n")
            f.write(f"-- ローカルD1から本番環境への同期スクリプト\n")
            f.write(f"-- 生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"-- 対象自治体数: {len(missing_records)}自治体\n")
            f.write("-- ========================================\n\n")
            
            for record in missing_records:
                sql = generate_insert_sql(record)
                f.write(sql + "\n\n")
        
        print(f"   ✅ 完了: {len(missing_records)}件のINSERT文を生成")
        print(f"\n📌 本番環境への適用コマンド:")
        print(f"   npx wrangler d1 execute real-estate-200units-db --remote --file={output_file}")
    else:
        print("\n✅ ローカルD1と本番環境のデータは一致しています")

if __name__ == "__main__":
    main()
