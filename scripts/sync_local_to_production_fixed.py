#!/usr/bin/env python3
"""
ローカルD1から本番環境に存在しない自治体のデータをエクスポート（スキーマ修正版）
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
        output = result.stdout
        start_idx = output.find('[')
        if start_idx < 0:
            return []
        
        json_str = output[start_idx:]
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
    """レコードからINSERT文を生成（本番環境のスキーマに合わせる）"""
    # 必須フィールド
    prefecture = record.get('prefecture', '')
    city = record.get('city', '')
    normalized_address = record.get('normalized_address', f"{prefecture}{city}")
    
    # オプションフィールド（本番環境のスキーマに存在するもののみ）
    district = record.get('district', '')
    chome = record.get('chome', '')
    zoning_type = record.get('zoning_type', '')
    building_coverage_ratio = record.get('building_coverage_ratio')
    floor_area_ratio = record.get('floor_area_ratio')
    height_limit = record.get('height_limit')
    local_ordinance = record.get('local_ordinance', '')
    apartment_restrictions = record.get('apartment_restrictions', '')
    
    # データ品質フィールド
    confidence_level = record.get('confidence_level', 'high')
    verification_status = record.get('verification_status', 'VERIFIED')
    data_source = record.get('data_source', '')
    data_source_url = record.get('data_source_url', '')
    
    # NULL処理
    def format_value(val, is_string=True):
        if val is None or val == '' or val == 'NULL':
            return 'NULL'
        if is_string:
            # SQLインジェクション対策：シングルクォートをエスケープ
            val_str = str(val).replace("'", "''")
            return f"'{val_str}'"
        return str(val)
    
    sql = f"""INSERT OR REPLACE INTO building_regulations (
    prefecture, city, normalized_address, district, chome,
    zoning_type, building_coverage_ratio, floor_area_ratio, height_limit,
    local_ordinance, apartment_restrictions,
    confidence_level, verification_status,
    data_source, data_source_url
) VALUES (
    {format_value(prefecture)}, {format_value(city)}, {format_value(normalized_address)},
    {format_value(district)}, {format_value(chome)},
    {format_value(zoning_type)}, {format_value(building_coverage_ratio, False)},
    {format_value(floor_area_ratio, False)}, {format_value(height_limit, False)},
    {format_value(local_ordinance)}, {format_value(apartment_restrictions)},
    {format_value(confidence_level)}, {format_value(verification_status)},
    {format_value(data_source)}, {format_value(data_source_url)}
);"""
    
    return sql

def main():
    print("=" * 80)
    print("ローカルD1から本番環境への同期SQLスクリプト生成（修正版）")
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
        output_file = f"scripts/sync_local_to_production_fixed_{datetime.now().strftime('%Y%m%d')}.sql"
        
        print(f"\n📝 SQLスクリプトを生成中: {output_file}")
        
        with open(f"/home/user/webapp/{output_file}", 'w', encoding='utf-8') as f:
            f.write("-- ========================================\n")
            f.write(f"-- ローカルD1から本番環境への同期スクリプト（修正版）\n")
            f.write(f"-- 生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"-- 対象自治体数: {len(missing_records)}自治体\n")
            f.write(f"-- スキーマ: 本番環境に合わせて調整済み\n")
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
