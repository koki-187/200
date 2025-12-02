#!/bin/bash

# 新しいデプロイメントのテスト
BASE_URL="https://7725b697.real-estate-200units-v2.pages.dev"

echo "========================================="
echo "新デプロイメント テスト (v3.95.1)"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Test 1: Health Check
echo "✅ Test 1: Health Check"
RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$RESPONSE" | grep -q '"status":"healthy"'; then
  echo "   ✅ Health Check成功"
else
  echo "   ❌ Health Check失敗"
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
  echo "   ✅ ログイン成功"
  echo "   Token: ${TOKEN:0:40}..."
else
  echo "   ❌ ログイン失敗"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

# Test 3: 不動産情報ライブラリAPI（容積率・建蔽率）
echo "✅ Test 3: 不動産情報ライブラリAPI"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/property-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA%E7%A5%9E%E5%8D%971-1-1&year=2024&quarter=2")
if echo "$RESPONSE" | grep -q 'floor_area_ratio\|building_coverage\|error'; then
  echo "   ✅ Reinfolib API応答あり"
  echo "   Response preview: ${RESPONSE:0:100}..."
else
  echo "   ❌ Reinfolib API失敗"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 4: ハザード情報API
echo "✅ Test 4: ハザード情報API"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/hazard-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA%E7%A5%9E%E5%8D%971-1-1")
if echo "$RESPONSE" | grep -q 'flood_risk\|landslide_risk'; then
  echo "   ✅ Hazard API成功"
  echo "   Flood Risk: $(echo "$RESPONSE" | grep -o '"flood_risk":"[^"]*' | cut -d'"' -f4)"
else
  echo "   ❌ Hazard API失敗"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 5: 案件作成
echo "✅ Test 5: 案件作成"
DEAL_DATA='{
  "title": "テスト物件 - 新デプロイメント",
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
fi
echo ""

echo "========================================="
echo "テスト完了"
echo "========================================="
