#!/bin/bash

# v3.96.0 本番環境テスト
BASE_URL="https://a2b11148.real-estate-200units-v2.pages.dev"

echo "========================================="
echo "v3.96.0 本番環境テスト"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Test 1: Health Check
echo "✅ Test 1: Health Check"
RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo "   ✅ PASS"
else
  echo "   ❌ FAIL"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 2: ログイン
echo "✅ Test 2: 管理者ログイン"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   ✅ PASS"
  echo "   Token: ${TOKEN:0:40}..."
else
  echo "   ❌ FAIL"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

# Test 3: ユーザー一覧API（管理者向け）
echo "✅ Test 3: ユーザー一覧API"
RESPONSE=$(curl -s "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q '"users"'; then
  COUNT=$(echo "$RESPONSE" | grep -o '"email"' | wc -l)
  echo "   ✅ PASS (ユーザー数: $COUNT)"
else
  echo "   ❌ FAIL"
  echo "   Response: ${RESPONSE:0:200}..."
fi
echo ""

# Test 4: 融資制限条件チェックAPI
echo "✅ Test 4: 融資制限条件チェックAPI"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/check-financing-restrictions?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q 'financing_available\|restrictions'; then
  echo "   ✅ PASS"
  echo "   Response: ${RESPONSE:0:200}..."
else
  echo "   ❌ FAIL"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 5: ハザード情報API
echo "✅ Test 5: ハザード情報API"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/hazard-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q 'hazards'; then
  echo "   ✅ PASS"
else
  echo "   ❌ FAIL"
  echo "   Response: ${RESPONSE:0:200}..."
fi
echo ""

# Test 6: 案件作成
echo "✅ Test 6: 案件作成"
DEAL_DATA='{
  "title": "テスト物件 - v3.96.0",
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
  echo "   ✅ PASS"
  echo "   Deal ID: $DEAL_ID"
else
  echo "   ❌ FAIL"
  echo "   Response: ${DEAL_RESPONSE:0:200}..."
fi
echo ""

echo "========================================="
echo "テスト完了"
echo "========================================="
