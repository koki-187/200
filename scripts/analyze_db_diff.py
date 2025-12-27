#!/usr/bin/env python3
"""
ローカルD1と本番環境のbuilding_regulationsテーブルの差分を分析
"""
import json
import subprocess
import sys

def get_municipalities(db_type):
    """指定されたDB（local or remote）から自治体リストを取得"""
    cmd = [
        "npx", "wrangler", "d1", "execute", "real-estate-200units-db",
        f"--{db_type}",
        "--command=SELECT prefecture, city FROM building_regulations WHERE verification_status='VERIFIED' ORDER BY prefecture, city;"
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd="/home/user/webapp", timeout=30)
        if result.returncode != 0:
            print(f"Error executing command for {db_type}:", file=sys.stderr)
            print(result.stderr, file=sys.stderr)
            return set()
        
        # JSONパースを試みる
        lines = result.stdout.strip().split('\n')
        municipalities = set()
        
        for line in lines:
            if '"prefecture"' in line and '"city"' in line:
                try:
                    # JSON形式の行をパース
                    data = json.loads(line.strip().rstrip(','))
                    if 'prefecture' in data and 'city' in data:
                        municipalities.add((data['prefecture'], data['city']))
                except:
                    continue
        
        return municipalities
    except Exception as e:
        print(f"Exception for {db_type}: {e}", file=sys.stderr)
        return set()

def main():
    print("ローカルD1と本番環境の差分分析")
    print("="*60)
    
    # データ取得
    print("\n📊 データ取得中...")
    local_municipalities = get_municipalities("local")
    production_municipalities = get_municipalities("remote")
    
    print(f"ローカルD1: {len(local_municipalities)}自治体")
    print(f"本番環境: {len(production_municipalities)}自治体")
    
    # 差分計算
    missing_in_production = local_municipalities - production_municipalities
    missing_in_local = production_municipalities - local_municipalities
    
    print(f"\n📋 差分結果:")
    print(f"ローカルにあるが本番にない: {len(missing_in_production)}自治体")
    print(f"本番にあるがローカルにない: {len(missing_in_local)}自治体")
    
    if missing_in_production:
        print("\n🔍 ローカルD1にあるが本番環境にない自治体:")
        print("-"*60)
        
        # 都道府県別に集計
        by_pref = {}
        for pref, city in sorted(missing_in_production):
            if pref not in by_pref:
                by_pref[pref] = []
            by_pref[pref].append(city)
        
        for pref in sorted(by_pref.keys()):
            cities = by_pref[pref]
            print(f"\n{pref} ({len(cities)}自治体):")
            for city in sorted(cities):
                print(f"  - {city}")
    
    if missing_in_local:
        print("\n🔍 本番環境にあるがローカルD1にない自治体:")
        print("-"*60)
        
        # 都道府県別に集計
        by_pref = {}
        for pref, city in sorted(missing_in_local):
            if pref not in by_pref:
                by_pref[pref] = []
            by_pref[pref].append(city)
        
        for pref in sorted(by_pref.keys()):
            cities = by_pref[pref]
            print(f"\n{pref} ({len(cities)}自治体):")
            for city in sorted(cities):
                print(f"  - {city}")
    
    # SQLスクリプト生成（本番環境に追加すべき自治体）
    if missing_in_production:
        print("\n\n📝 本番環境へ統合すべき自治体のSQLスクリプトを生成します...")
        print("（ローカルD1からデータをエクスポートして本番環境に適用）")

if __name__ == "__main__":
    main()
