#!/bin/bash

# エンドツーエンドテスト - 200戸土地仕入れ管理システムv2.0

BASE_URL="https://real-estate-200units-v2.pages.dev"
ADMIN_EMAIL="admin@200units.com"
ADMIN_PASSWORD="Admin@123456"
AGENT_EMAIL="agent@200units.com"
AGENT_PASSWORD="Agent@123456"

echo "========================================"
echo "🧪 エンドツーエンドテスト開始"
echo "========================================"
echo ""

# カラー出力用
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# テスト結果カウンター
PASSED=0
FAILED=0

# テスト関数
test_endpoint() {
  local test_name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local token=$5
  local expected_status=$6
  
  echo -n "Testing: $test_name ... "
  
  if [ -z "$token" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" == "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $http_code)"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

echo "========================================="
echo "1. 基本APIテスト"
echo "========================================="

test_endpoint "Health Check" "GET" "/api/health" "" "" "200"
test_endpoint "API Version" "GET" "/api/version" "" "" "200"
test_endpoint "OpenAPI Spec" "GET" "/api/openapi.json" "" "" "200"

echo ""
echo "========================================="
echo "2. 認証・認可テスト"
echo "========================================="

# 管理者ログイン
echo -n "Testing: Admin Login ... "
admin_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}")

admin_token=$(echo "$admin_response" | jq -r '.token')

if [ "$admin_token" != "null" ] && [ -n "$admin_token" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "Response: $admin_response"
  FAILED=$((FAILED + 1))
fi

# エージェントログイン
echo -n "Testing: Agent Login ... "
agent_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$AGENT_EMAIL\", \"password\": \"$AGENT_PASSWORD\"}")

agent_token=$(echo "$agent_response" | jq -r '.token')

if [ "$agent_token" != "null" ] && [ -n "$agent_token" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "Response: $agent_response"
  FAILED=$((FAILED + 1))
fi

# 認証付きエンドポイント
test_endpoint "Get Current User (Admin)" "GET" "/api/auth/me" "" "$admin_token" "200"
test_endpoint "Get Current User (Agent)" "GET" "/api/auth/me" "" "$agent_token" "200"

# 無効なトークンでのアクセス
test_endpoint "Invalid Token" "GET" "/api/auth/me" "" "invalid_token" "401"

echo ""
echo "========================================="
echo "3. 案件管理テスト"
echo "========================================="

# 案件一覧取得
test_endpoint "Get Deals List" "GET" "/api/deals" "" "$admin_token" "200"

# 案件作成は複雑なため、スキップ
echo -n "Testing: Create Deal (Admin) ... "
echo -e "${YELLOW}⊘ SKIP${NC} (requires buyer_id and seller_id)"

# 案件詳細取得もスキップ

echo ""
echo "========================================="
echo "4. 通知設定テスト"
echo "========================================="

test_endpoint "Get Notification Settings" "GET" "/api/notification-settings" "" "$admin_token" "200"

echo ""
echo "========================================="
echo "5. フィードバックテスト"
echo "========================================="

test_endpoint "Submit Feedback" "POST" "/api/feedback" \
  '{"type": "bug", "title": "テストフィードバック", "description": "エンドツーエンドテストからの送信", "priority": "medium"}' \
  "$agent_token" "201"

test_endpoint "Get Feedback List (Admin)" "GET" "/api/feedback" "" "$admin_token" "200"

echo ""
echo "========================================="
echo "6. アナリティクステスト"
echo "========================================="

echo -n "Testing: Get KPI Dashboard (Admin) ... "
echo -e "${YELLOW}⊘ SKIP${NC} (requires data in database)"

echo ""
echo "========================================="
echo "📊 テスト結果サマリー"
echo "========================================="
echo ""
echo -e "合格: ${GREEN}$PASSED${NC}"
echo -e "不合格: ${RED}$FAILED${NC}"
echo -e "合計: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ 全てのテストが合格しました！${NC}"
  exit 0
else
  echo -e "${RED}✗ $FAILED 件のテストが失敗しました${NC}"
  exit 1
fi
