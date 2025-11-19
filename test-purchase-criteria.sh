#!/bin/bash

echo "====================================="
echo "買取条件チェックAPI テスト"
echo "====================================="
echo ""

# テスト1: 埼玉県・全条件合格
echo "【テスト1】埼玉県・全条件合格"
curl -s -X POST http://localhost:3000/api/purchase-criteria/check \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1-pass",
    "location": "埼玉県さいたま市大宮区桜木町1-7-5",
    "station": "大宮",
    "walk_minutes": "5",
    "land_area": "200",
    "frontage": "8.5",
    "building_coverage": "60",
    "floor_area_ratio": "200",
    "zoning": "商業地域"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'結果: {data[\"data\"][\"overall_result\"]}'); print(f'スコア: {data[\"data\"][\"check_score\"]}'); print(f'合格条件数: {len(data[\"data\"][\"passed_conditions\"])}'); print(f'不合格条件数: {len(data[\"data\"][\"failed_conditions\"])}')"
echo ""

# テスト2: 千葉県西部・全条件合格
echo "【テスト2】千葉県西部（船橋市）・全条件合格"
curl -s -X POST http://localhost:3000/api/purchase-criteria/check \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-2-chiba-west",
    "location": "千葉県船橋市本町1-1-1",
    "station": "船橋",
    "walk_minutes": "3",
    "land_area": "180",
    "frontage": "10",
    "building_coverage": "60",
    "floor_area_ratio": "200",
    "zoning": "近隣商業地域"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'結果: {data[\"data\"][\"overall_result\"]}'); print(f'スコア: {data[\"data\"][\"check_score\"]}'); print(f'エリアチェック: {data[\"data\"][\"details\"][\"area_check\"][\"message\"]}')"
echo ""

# テスト3: 千葉県東部（対象外エリア）
echo "【テスト3】千葉県東部（銚子市）・エリア外"
curl -s -X POST http://localhost:3000/api/purchase-criteria/check \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-3-chiba-east",
    "location": "千葉県銚子市若宮町1-1",
    "station": "銚子",
    "walk_minutes": "10",
    "land_area": "200",
    "frontage": "8",
    "building_coverage": "60",
    "floor_area_ratio": "200",
    "zoning": "住居地域"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'結果: {data[\"data\"][\"overall_result\"]}'); print(f'スコア: {data[\"data\"][\"check_score\"]}'); print(f'特殊フラグ: {data[\"data\"][\"special_flags\"]}')"
echo ""

# テスト4: 調整区域（検討外）
echo "【テスト4】調整区域（検討外エリア）"
curl -s -X POST http://localhost:3000/api/purchase-criteria/check \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-4-chosei",
    "location": "埼玉県川越市大字○○",
    "station": "川越",
    "walk_minutes": "10",
    "land_area": "200",
    "frontage": "8",
    "building_coverage": "60",
    "floor_area_ratio": "200",
    "zoning": "市街化調整区域"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'結果: {data[\"data\"][\"overall_result\"]}'); print(f'スコア: {data[\"data\"][\"check_score\"]}'); print(f'不合格条件: {data[\"data\"][\"failed_conditions\"]}')"
echo ""

# テスト5: 防火地域（検討外）
echo "【テスト5】防火地域（検討外エリア）"
curl -s -X POST http://localhost:3000/api/purchase-criteria/check \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-5-bouka",
    "location": "東京都中央区銀座1-1-1",
    "station": "銀座",
    "walk_minutes": "5",
    "land_area": "150",
    "frontage": "8",
    "building_coverage": "80",
    "floor_area_ratio": "600",
    "zoning": "商業地域（防火地域）"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'結果: {data[\"data\"][\"overall_result\"]}'); print(f'スコア: {data[\"data\"][\"check_score\"]}'); print(f'不合格条件: {data[\"data\"][\"failed_conditions\"]}')"
echo ""

# テスト6: 条件不足（間口・面積不足）
echo "【テスト6】条件不足（間口6m、土地面積100m2=約30坪）"
curl -s -X POST http://localhost:3000/api/purchase-criteria/check \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-6-insufficient",
    "location": "神奈川県横浜市西区みなとみらい1-1-1",
    "station": "みなとみらい",
    "walk_minutes": "5",
    "land_area": "100",
    "frontage": "6",
    "building_coverage": "60",
    "floor_area_ratio": "200",
    "zoning": "商業地域"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'結果: {data[\"data\"][\"overall_result\"]}'); print(f'スコア: {data[\"data\"][\"check_score\"]}'); print(f'不合格条件: {[c for c in data[\"data\"][\"failed_conditions\"] if \"不合格\" in c]}')"
echo ""

# テスト7: 愛知県（対象エリア）
echo "【テスト7】愛知県名古屋市・全条件合格"
curl -s -X POST http://localhost:3000/api/purchase-criteria/check \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-7-aichi",
    "location": "愛知県名古屋市中区栄3-1-1",
    "station": "栄",
    "walk_minutes": "3",
    "land_area": "200",
    "frontage": "10",
    "building_coverage": "80",
    "floor_area_ratio": "400",
    "zoning": "商業地域"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'結果: {data[\"data\"][\"overall_result\"]}'); print(f'スコア: {data[\"data\"][\"check_score\"]}'); print(f'エリアチェック: {data[\"data\"][\"details\"][\"area_check\"][\"message\"]}')"
echo ""

# テスト8: 大阪府（エリア外）
echo "【テスト8】大阪府（対象エリア外）"
curl -s -X POST http://localhost:3000/api/purchase-criteria/check \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-8-osaka",
    "location": "大阪府大阪市北区梅田1-1-1",
    "station": "梅田",
    "walk_minutes": "3",
    "land_area": "200",
    "frontage": "10",
    "building_coverage": "80",
    "floor_area_ratio": "600",
    "zoning": "商業地域"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'結果: {data[\"data\"][\"overall_result\"]}'); print(f'スコア: {data[\"data\"][\"check_score\"]}'); print(f'特殊フラグ: {data[\"data\"][\"special_flags\"]}'); print(f'推奨事項: {data[\"data\"][\"recommendations\"]}')"
echo ""

echo "====================================="
echo "テスト完了"
echo "====================================="
