#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== 簡易案件作成テスト ==="

# 既存ユーザーでログイン試行
echo "1. 既存ユーザー確認..."
npx wrangler d1 execute real-estate-200units-db --local \
  --command="SELECT id, email, name, role FROM users LIMIT 3;"

echo ""
echo "2. 手動でユーザー作成..."

# Node.jsでbcryptハッシュ生成
node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('password123', 10);
console.log(hash);
" > /tmp/hash.txt

HASH=$(cat /tmp/hash.txt)

npx wrangler d1 execute real-estate-200units-db --local --command="
INSERT OR REPLACE INTO users (id, email, password_hash, name, role, created_at, updated_at) 
VALUES 
('test-admin-999', 'admin999@test.com', '$HASH', 'テスト管理者999', 'ADMIN', datetime('now'), datetime('now')),
('test-seller-999', 'seller999@test.com', '$HASH', 'テスト売主999', 'AGENT', datetime('now'), datetime('now'));
"

echo ""
echo "3. ログインテスト..."
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin999@test.com","password":"password123"}')

echo "$LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  exit 1
fi

echo ""
echo "✅ ログイン成功"

echo ""
echo "4. 案件作成テスト..."
DEAL_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/deals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "緊急テスト案件",
    "seller_id": "test-seller-999",
    "location": "東京都渋谷区代々木1-1-1",
    "station": "新宿駅",
    "walk_minutes": 5,
    "land_area": 200.5,
    "zoning": "商業地域",
    "building_coverage": 80,
    "floor_area_ratio": 600,
    "desired_price": 150000000
  }')

echo "$DEAL_RESPONSE"

if echo "$DEAL_RESPONSE" | grep -q '"id"'; then
  echo ""
  echo "✅✅✅ 案件作成成功！問題なし ✅✅✅"
  
  DEAL_ID=$(echo "$DEAL_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "案件ID: $DEAL_ID"
else
  echo ""
  echo "❌ 案件作成失敗"
  exit 1
fi

