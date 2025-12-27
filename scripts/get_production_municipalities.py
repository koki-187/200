#!/usr/bin/env python3
"""
本番環境の全自治体リストを取得
"""
import subprocess
import json

def get_production_municipalities():
    """本番環境から全自治体リストを取得"""
    cmd = [
        'npx', 'wrangler', 'd1', 'execute',
        'real-estate-200units-db',
        '--remote',
        '--json',
        '--command=SELECT prefecture, city FROM building_regulations WHERE verification_status="VERIFIED" ORDER BY prefecture, city;'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, cwd='/home/user/webapp')
    
    if result.returncode != 0:
        print(f"エラー: {result.stderr}")
        return []
    
    try:
        data = json.loads(result.stdout)
        if isinstance(data, list) and len(data) > 0:
            results = data[0].get('results', [])
            return results
        return []
    except json.JSONDecodeError as e:
        print(f"JSONパースエラー: {e}")
        return []

def main():
    municipalities = get_production_municipalities()
    
    # 都道府県別に集計
    by_prefecture = {}
    for record in municipalities:
        pref = record['prefecture']
        city = record['city']
        if pref not in by_prefecture:
            by_prefecture[pref] = []
        if city not in by_prefecture[pref]:
            by_prefecture[pref].append(city)
    
    print("=" * 80)
    print("本番環境の自治体リスト")
    print("=" * 80)
    
    total = 0
    for pref in sorted(by_prefecture.keys()):
        cities = sorted(by_prefecture[pref])
        print(f"\n{pref}: {len(cities)}自治体")
        for city in cities:
            print(f"  - {city}")
        total += len(cities)
    
    print(f"\n合計: {total}自治体")
    
    # ファイルに保存
    with open('/tmp/production_municipalities_list.txt', 'w', encoding='utf-8') as f:
        for pref in sorted(by_prefecture.keys()):
            cities = sorted(by_prefecture[pref])
            f.write(f"\n{pref}: {len(cities)}自治体\n")
            for city in cities:
                f.write(f"  - {city}\n")
        f.write(f"\n合計: {total}自治体\n")
    
    print("\nリストを /tmp/production_municipalities_list.txt に保存しました")

if __name__ == '__main__':
    main()
