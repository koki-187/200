#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== 案件作成機能テスト ==="
echo ""

# 1. ユーザー作成（既存の場合はスキップされる）
echo "1. テストユーザー確認..."
npx wrangler d1 execute real-estate-200units-db --local --command="
INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES 
('test-admin-001', 'admin@test.com', '\$2a\$10\$dummyhash', 'テスト管理者', 'ADMIN'),
('test-seller-001', 'seller@test.com', '\$2a\$10\$dummyhash', 'テスト売主', 'AGENT');
"

# 2. ログイン
echo ""
echo "2. ログインテスト..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  exit 1
fi

echo "✅ ログイン成功: ${TOKEN:0:20}..."

# 3. 案件作成
echo ""
echo "3. 案件作成テスト..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "テスト案件_案検作成確認",
    "seller_id": "test-seller-001",
    "location": "東京都渋谷区代々木1-1-1",
    "station": "新宿駅",
    "walk_minutes": 5,
    "land_area": 200.5,
    "zoning": "商業地域",
    "building_coverage": 80,
    "floor_area_ratio": 600,
    "desired_price": 150000000
  }')

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
else
  echo ""
  echo "❌ 案件作成失敗"
  exit 1
fi

echo ""
echo "=== テスト完了 ==="
