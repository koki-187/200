#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== 案件作成機能テスト v2 ==="
echo ""

# 1. テストユーザー削除＆再作成
echo "1. テストユーザー再作成..."
npx wrangler d1 execute real-estate-200units-db --local --command="
DELETE FROM users WHERE email IN ('admin@test.com', 'seller@test.com');
"

# 実際のbcryptハッシュを生成するために、APIを使う
echo "   新規ユーザー登録..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "name": "テスト管理者",
    "role": "ADMIN"
  }')

echo "$SIGNUP_RESPONSE" | jq '.' 2>/dev/null || echo "$SIGNUP_RESPONSE"

# Seller作成
SIGNUP_SELLER=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@test.com",
    "password": "password123",
    "name": "テスト売主",
    "role": "AGENT"
  }')

# 2. ログイン
echo ""
echo "2. ログインテスト..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  echo "   レスポンス:"
  curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"password123"}'
  exit 1
fi

echo "✅ ログイン成功: ${TOKEN:0:30}..."

# 3. Seller IDを取得
SELLER_ID=$(curl -s "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN" \
  | grep -o '"email":"seller@test.com"[^}]*"id":"[^"]*"' \
  | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SELLER_ID" ]; then
  echo "❌ 売主ID取得失敗"
  exit 1
fi

echo "   売主ID: $SELLER_ID"

# 4. 案件作成
echo ""
echo "3. 案件作成テスト..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"テスト案件_案検作成確認_$(date +%H%M%S)\",
    \"seller_id\": \"$SELLER_ID\",
    \"location\": \"東京都渋谷区代々木1-1-1\",
    \"station\": \"新宿駅\",
    \"walk_minutes\": 5,
    \"land_area\": 200.5,
    \"zoning\": \"商業地域\",
    \"building_coverage\": 80,
    \"floor_area_ratio\": 600,
    \"desired_price\": 150000000
  }")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# 結果確認
if echo "$RESPONSE" | grep -q '"id"'; then
  echo ""
  echo "✅ 案件作成成功"
  
  # 作成された案件を確認
  DEAL_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   案件ID: $DEAL_ID"
  
  # データベース確認
  echo ""
  echo "4. データベース確認..."
  npx wrangler d1 execute real-estate-200units-db --local \
    --command="SELECT id, title, location, status FROM deals WHERE id='$DEAL_ID';"
    
  echo ""
  echo "✅ 全テスト成功: 案件作成機能は正常に動作しています"
else
  echo ""
  echo "❌ 案件作成失敗"
  exit 1
fi

echo ""
echo "=== テスト完了 ==="
