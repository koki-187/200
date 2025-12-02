#!/bin/bash

# 本番環境案件作成テスト
BASE_URL="https://cf7da3bd.real-estate-200units-v2.pages.dev"

echo "========================================="
echo "本番環境案件作成テスト (v3.95.0)"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Step 1: 管理者ログイン
echo "🔑 Step 1: 管理者ログイン"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   ✅ ログイン成功"
  echo "   Token: ${TOKEN:0:40}..."
else
  echo "   ❌ ログイン失敗"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

# Step 2: 案件作成（最小限の必須項目のみ）
echo "📝 Step 2: 案件作成（最小限の必須項目）"
DEAL_DATA='{
  "title": "テスト物件 - 本番環境テスト",
  "location": "東京都渋谷区神南1-1-1",
  "land_area": 100,
  "zoning": "商業地域",
  "seller_id": "seller-001",
  "status": "PENDING"
}'

DEAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$DEAL_DATA")

if echo "$DEAL_RESPONSE" | grep -q '"id"'; then
  DEAL_ID=$(echo "$DEAL_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "   ✅ 案件作成成功"
  echo "   Deal ID: $DEAL_ID"
else
  echo "   ❌ 案件作成失敗"
  echo "   Response: $DEAL_RESPONSE"
  exit 1
fi
echo ""

# Step 3: 作成した案件を取得
echo "🔍 Step 3: 作成した案件の取得確認"
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/deals/$DEAL_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$GET_RESPONSE" | grep -q '"title"'; then
  echo "   ✅ 案件取得成功"
  echo "   Title: $(echo "$GET_RESPONSE" | grep -o '"title":"[^"]*' | cut -d'"' -f4)"
  echo "   Location: $(echo "$GET_RESPONSE" | grep -o '"location":"[^"]*' | cut -d'"' -f4)"
else
  echo "   ❌ 案件取得失敗"
  echo "   Response: $GET_RESPONSE"
  exit 1
fi
echo ""

echo "========================================="
echo "✅ 全てのテストが成功しました"
echo "========================================="
