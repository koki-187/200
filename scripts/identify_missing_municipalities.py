#!/usr/bin/env python3
"""
目標145自治体から本番環境の86自治体を差し引き、残り59自治体を特定
"""
import subprocess
import json

# 目標の1都3県145自治体リスト
TARGET_MUNICIPALITIES = {
    "東京都": [
        # 23区
        "千代田区", "中央区", "港区", "新宿区", "文京区", "台東区", "墨田区", "江東区",
        "品川区", "目黒区", "大田区", "世田谷区", "渋谷区", "中野区", "杉並区", "豊島区",
        "北区", "荒川区", "板橋区", "練馬区", "足立区", "葛飾区", "江戸川区",
        # 26市
        "八王子市", "立川市", "武蔵野市", "三鷹市", "青梅市", "府中市", "昭島市", "調布市",
        "町田市", "小金井市", "小平市", "日野市", "東村山市", "国分寺市", "国立市", "福生市",
        "狛江市", "東大和市", "清瀬市", "東久留米市", "武蔵村山市", "多摩市", "稲城市", "羽村市",
        "あきる野市", "西東京市"
    ],
    "神奈川県": [
        "横浜市", "川崎市", "相模原市", "横須賀市", "平塚市", "鎌倉市", "藤沢市", "小田原市",
        "茅ヶ崎市", "逗子市", "三浦市", "秦野市", "厚木市", "大和市", "伊勢原市", "海老名市",
        "座間市", "南足柄市", "綾瀬市"
    ],
    "千葉県": [
        "千葉市", "銚子市", "市川市", "船橋市", "館山市", "木更津市", "松戸市", "野田市",
        "茂原市", "成田市", "佐倉市", "東金市", "旭市", "習志野市", "柏市", "勝浦市",
        "市原市", "流山市", "八千代市", "我孫子市", "鴨川市", "鎌ケ谷市", "君津市", "富津市",
        "浦安市", "四街道市", "袖ケ浦市", "八街市", "印西市", "白井市", "富里市", "南房総市",
        "匝瑳市", "香取市", "山武市", "いすみ市", "大網白里市",
        "酒々井町", "栄町", "神崎町", "多古町", "東庄町"
    ],
    "埼玉県": [
        "さいたま市", "川越市", "熊谷市", "川口市", "行田市", "秩父市", "所沢市", "飯能市",
        "加須市", "本庄市", "東松山市", "春日部市", "狭山市", "羽生市", "鴻巣市", "深谷市",
        "上尾市", "草加市", "越谷市", "蕨市", "戸田市", "入間市", "朝霞市", "志木市",
        "和光市", "新座市", "桶川市", "久喜市", "北本市", "八潮市", "富士見市", "三郷市",
        "蓮田市", "坂戸市", "幸手市", "鶴ヶ島市", "日高市", "吉川市", "ふじみ野市", "白岡市",
        "伊奈町", "三芳町", "毛呂山町", "越生町", "滑川町", "嵐山町", "小川町", "川島町",
        "吉見町", "鳩山町", "ときがわ町", "横瀬町", "皆野町", "長瀞町"
    ]
}

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
        return {}
    
    try:
        data = json.loads(result.stdout)
        if isinstance(data, list) and len(data) > 0:
            results = data[0].get('results', [])
            
            # 都道府県別に整理
            by_prefecture = {}
            for record in results:
                pref = record['prefecture']
                city = record['city']
                if pref not in by_prefecture:
                    by_prefecture[pref] = set()
                # 市・区名を正規化（例: "千葉市中央区" -> "千葉市"）
                base_city = city.split('区')[0].split('市')[0] + ('区' if '区' in city and '市' not in city else '市' if '市' in city else '')
                by_prefecture[pref].add(base_city)
            
            return by_prefecture
        return {}
    except json.JSONDecodeError as e:
        print(f"JSONパースエラー: {e}")
        return {}

def normalize_city_name(city):
    """自治体名を正規化"""
    # 政令指定都市の区は市として扱う
    if '市' in city:
        return city.split('市')[0] + '市'
    return city

def main():
    production = get_production_municipalities()
    
    print("=" * 80)
    print("未収集自治体の特定")
    print("=" * 80)
    
    missing = {}
    total_target = 0
    total_collected = 0
    total_missing = 0
    
    for pref, target_cities in TARGET_MUNICIPALITIES.items():
        production_cities = production.get(pref, set())
        
        # 正規化して比較
        production_normalized = {normalize_city_name(c) for c in production_cities}
        
        missing_cities = []
        for city in target_cities:
            normalized = normalize_city_name(city)
            if normalized not in production_normalized:
                missing_cities.append(city)
        
        if missing_cities:
            missing[pref] = missing_cities
        
        total_target += len(target_cities)
        total_collected += len(target_cities) - len(missing_cities)
        total_missing += len(missing_cities)
        
        print(f"\n{pref}:")
        print(f"  目標: {len(target_cities)}自治体")
        print(f"  収集済: {len(target_cities) - len(missing_cities)}自治体")
        print(f"  未収集: {len(missing_cities)}自治体")
        
        if missing_cities:
            print(f"  未収集リスト:")
            for city in missing_cities:
                print(f"    - {city}")
    
    print(f"\n{'=' * 80}")
    print(f"全体サマリ:")
    print(f"  目標: {total_target}自治体")
    print(f"  収集済: {total_collected}自治体 ({total_collected/total_target*100:.1f}%)")
    print(f"  未収集: {total_missing}自治体 ({total_missing/total_target*100:.1f}%)")
    print(f"{'=' * 80}")
    
    # ファイルに保存
    with open('/home/user/webapp/MISSING_MUNICIPALITIES.md', 'w', encoding='utf-8') as f:
        f.write("# 未収集自治体リスト\n\n")
        f.write(f"**生成日時**: 2025-12-27\n\n")
        f.write(f"## サマリ\n\n")
        f.write(f"- 目標: {total_target}自治体\n")
        f.write(f"- 収集済: {total_collected}自治体 ({total_collected/total_target*100:.1f}%)\n")
        f.write(f"- **未収集: {total_missing}自治体 ({total_missing/total_target*100:.1f}%)**\n\n")
        
        for pref, missing_cities in missing.items():
            f.write(f"## {pref} ({len(missing_cities)}自治体)\n\n")
            for city in missing_cities:
                f.write(f"- {city}\n")
            f.write(f"\n")
    
    print(f"\n未収集自治体リストを MISSING_MUNICIPALITIES.md に保存しました")

if __name__ == '__main__':
    main()
