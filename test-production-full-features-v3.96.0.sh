#!/bin/bash

# v3.96.0 本番環境 全機能動作確認テスト
BASE_URL="https://a2b11148.real-estate-200units-v2.pages.dev"

echo "========================================="
echo "v3.96.0 本番環境 全機能動作確認"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# ログイン
echo "🔐 管理者ログイン..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  exit 1
fi
echo "✅ ログイン成功"
echo ""

# ============================================================
# コアAPI機能
# ============================================================
echo "========================================="
echo "コアAPI機能"
echo "========================================="
echo ""

# Health Check
echo "✅ Test 1: Health Check"
RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo "   ✅ PASS"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# 認証・ユーザー管理
# ============================================================
echo "========================================="
echo "認証・ユーザー管理"
echo "========================================="
echo ""

# ユーザー一覧取得
echo "✅ Test 2: ユーザー一覧取得"
RESPONSE=$(curl -s "$BASE_URL/api/users" -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"users"'; then
  USER_COUNT=$(echo "$RESPONSE" | grep -o '"email"' | wc -l)
  echo "   ✅ PASS - ユーザー数: $USER_COUNT"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL"
  ((FAIL_COUNT++))
fi
echo ""

# ユーザー詳細取得
echo "✅ Test 3: ユーザー詳細取得"
RESPONSE=$(curl -s "$BASE_URL/api/users/e3e7b2cb-3e3e-4b99-840f-7287a4c45b86" -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"email"'; then
  echo "   ✅ PASS"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# 案件管理
# ============================================================
echo "========================================="
echo "案件管理"
echo "========================================="
echo ""

# 案件作成
echo "✅ Test 4: 案件作成"
DEAL_DATA='{
  "title": "全機能テスト物件",
  "location": "東京都渋谷区神南1-1-1",
  "land_area": 150,
  "zoning": "商業地域",
  "seller_id": "seller-001",
  "status": "PENDING",
  "desired_price": 50000000
}'

DEAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$DEAL_DATA")

if echo "$DEAL_RESPONSE" | grep -q '"id"'; then
  DEAL_ID=$(echo "$DEAL_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "   ✅ PASS - Deal ID: $DEAL_ID"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL"
  ((FAIL_COUNT++))
  DEAL_ID=""
fi
echo ""

# 案件一覧取得
echo "✅ Test 5: 案件一覧取得"
RESPONSE=$(curl -s "$BASE_URL/api/deals" -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"deals"'; then
  echo "   ✅ PASS"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL"
  ((FAIL_COUNT++))
fi
echo ""

# 案件詳細取得
if [ -n "$DEAL_ID" ]; then
  echo "✅ Test 6: 案件詳細取得"
  RESPONSE=$(curl -s "$BASE_URL/api/deals/$DEAL_ID" -H "Authorization: Bearer $TOKEN")
  if echo "$RESPONSE" | grep -q '"title"'; then
    echo "   ✅ PASS"
    ((PASS_COUNT++))
  else
    echo "   ❌ FAIL"
    ((FAIL_COUNT++))
  fi
  echo ""
fi

# ============================================================
# 不動産情報ライブラリAPI
# ============================================================
echo "========================================="
echo "不動産情報ライブラリAPI"
echo "========================================="
echo ""

# ハザード情報取得
echo "✅ Test 7: ハザード情報取得"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/hazard-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA%E7%A5%9E%E5%8D%971-1-1" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q 'hazards'; then
  echo "   ✅ PASS"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL"
  ((FAIL_COUNT++))
fi
echo ""

# 融資制限条件チェック
echo "✅ Test 8: 融資制限条件チェック"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/check-financing-restrictions?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA%E7%A5%9E%E5%8D%971-1-1" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q 'restrictions'; then
  echo "   ✅ PASS"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# 建築基準法チェック
# ============================================================
echo "========================================="
echo "建築基準法チェック"
echo "========================================="
echo ""

# 自治体条例チェック（東京23区）
echo "✅ Test 9: 自治体条例チェック（渋谷区）"
RESPONSE=$(curl -s "$BASE_URL/api/building-regulations/municipal?prefecture=%E6%9D%B1%E4%BA%AC%E9%83%BD&city=%E6%B8%8B%E8%B0%B7%E5%8C%BA" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q 'regulations'; then
  echo "   ✅ PASS"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL"
  ((FAIL_COUNT++))
fi
echo ""

# 駐車場附置義務チェック
echo "✅ Test 10: 駐車場附置義務チェック（東京都）"
RESPONSE=$(curl -s "$BASE_URL/api/building-regulations/parking?prefecture=%E6%9D%B1%E4%BA%AC%E9%83%BD&city=%E6%B8%8B%E8%B0%B7%E5%8C%BA&units=10" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q 'required'; then
  echo "   ✅ PASS"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# 結果サマリー
# ============================================================
echo "========================================="
echo "テスト結果サマリー"
echo "========================================="
TOTAL_COUNT=$((PASS_COUNT + FAIL_COUNT))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASS_COUNT / $TOTAL_COUNT) * 100}")

echo ""
echo "総テスト数: $TOTAL_COUNT"
echo "成功: $PASS_COUNT ✅"
echo "失敗: $FAIL_COUNT ❌"
echo "成功率: $SUCCESS_RATE%"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "🎉 全ての機能が正常に動作しています！"
  exit 0
else
  echo "⚠️  一部の機能で問題が検出されました"
  exit 1
fi
