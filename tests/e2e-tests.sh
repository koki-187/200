#!/bin/bash

# E2E テストスイート v3.88.0
# 200棟土地仕入れ管理システム

set +e  # Continue on errors

PROD_URL="${PROD_URL:-http://localhost:3000}"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=()

echo "================================"
echo "E2E Test Suite v3.88.0"
echo "Target: $PROD_URL"
echo "================================"
echo ""

# Helper function
test_api() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_field="$5"
  local auth_header="$6"
  
  echo "Testing: $name"
  ((TOTAL_TESTS++))
  
  local cmd="curl -s -X $method \"$PROD_URL$endpoint\""
  
  if [ -n "$auth_header" ]; then
    cmd="$cmd -H \"Authorization: Bearer $auth_header\""
  fi
  
  if [ "$method" == "POST" ] || [ "$method" == "PUT" ]; then
    cmd="$cmd -H \"Content-Type: application/json\" -d '$data'"
  fi
  
  local response=$(eval "$cmd")
  local result=$(echo "$response" | jq -r ".$expected_field // \"null\"")
  
  if [ "$result" != "null" ] && [ -n "$result" ]; then
    echo "✅ $name: PASSED"
    ((PASSED_TESTS++))
    return 0
  else
    echo "❌ $name: FAILED"
    FAILED_TESTS+=("$name")
    echo "   Response: $response"
    return 1
  fi
}

# ===================================
# 1. Authentication Tests
# ===================================
echo "=== Authentication Tests ==="

# Login test
TOKEN=$(curl -s -X POST "$PROD_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "navigator-187@docomo.ne.jp", "password": "kouki187"}' | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Login: PASSED"
  ((TOTAL_TESTS++))
  ((PASSED_TESTS++))
else
  echo "❌ Login: FAILED"
  ((TOTAL_TESTS++))
  FAILED_TESTS+=("Login")
  exit 1
fi

# ===================================
# 2. User Management Tests
# ===================================
echo ""
echo "=== User Management Tests ==="

test_api "Get current user" "GET" "/api/users/admin-001" "" "user.name" "$TOKEN"
test_api "Get user list" "GET" "/api/users" "" "users" "$TOKEN"

# ===================================
# 3. Deal Management Tests
# ===================================
echo ""
echo "=== Deal Management Tests ==="

test_api "Get deal list" "GET" "/api/deals" "" "deals" "$TOKEN"

# Create deal
DEAL_ID=$(curl -s -X POST "$PROD_URL/api/deals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "E2Eテスト案件_'$(date +%s)'",
    "location": "東京都渋谷区",
    "station": "渋谷駅",
    "walk_minutes": 5,
    "land_area": "100㎡",
    "zoning": "第一種住居地域",
    "building_coverage": "60%",
    "floor_area_ratio": "200%",
    "desired_price": "5000万円",
    "current_status": "更地"
  }' | jq -r '.deal.id // .id')

if [ "$DEAL_ID" != "null" ] && [ -n "$DEAL_ID" ]; then
  echo "✅ Create deal: PASSED (ID: $DEAL_ID)"
  ((TOTAL_TESTS++))
  ((PASSED_TESTS++))
else
  echo "❌ Create deal: FAILED"
  ((TOTAL_TESTS++))
  FAILED_TESTS+=("Create deal")
fi

test_api "Get deal detail" "GET" "/api/deals/$DEAL_ID" "" "deal.title" "$TOKEN"

# Update deal
UPDATE_RESULT=$(curl -s -X PUT "$PROD_URL/api/deals/$DEAL_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "REVIEWING"}' | jq -r '.deal.status // .status')

if [ "$UPDATE_RESULT" == "REVIEWING" ]; then
  echo "✅ Update deal: PASSED"
  ((TOTAL_TESTS++))
  ((PASSED_TESTS++))
else
  echo "❌ Update deal: FAILED"
  ((TOTAL_TESTS++))
  FAILED_TESTS+=("Update deal")
fi

# ===================================
# 4. Message Tests
# ===================================
echo ""
echo "=== Message Tests ==="

MSG_ID=$(curl -s -X POST "$PROD_URL/api/messages/deals/$DEAL_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "E2Eテストメッセージ"}' | jq -r '.message.id // .id')

if [ "$MSG_ID" != "null" ] && [ -n "$MSG_ID" ]; then
  echo "✅ Create message: PASSED"
  ((TOTAL_TESTS++))
  ((PASSED_TESTS++))
else
  echo "❌ Create message: FAILED"
  ((TOTAL_TESTS++))
  FAILED_TESTS+=("Create message")
fi

test_api "Get messages" "GET" "/api/messages/deals/$DEAL_ID" "" "messages" "$TOKEN"

# ===================================
# 5. Notification Tests
# ===================================
echo ""
echo "=== Notification Tests ==="

test_api "Get notification settings" "GET" "/api/notification-settings" "" "settings.email_on_new_deal" "$TOKEN"
test_api "Get notifications" "GET" "/api/notifications" "" "notifications" "$TOKEN"

# ===================================
# 6. Building Regulations Tests
# ===================================
echo ""
echo "=== Building Regulations Tests ==="

BR_RESULT=$(curl -s "$PROD_URL/api/building-regulations/check?location=東京都渋谷区&zoning=第一種住居地域&structure=木造&floors=3" | jq -r '.success')

if [ "$BR_RESULT" == "true" ]; then
  echo "✅ Building regulations check: PASSED"
  ((TOTAL_TESTS++))
  ((PASSED_TESTS++))
else
  echo "❌ Building regulations check: FAILED"
  ((TOTAL_TESTS++))
  FAILED_TESTS+=("Building regulations check")
fi

# ===================================
# 7. OCR Tests
# ===================================
echo ""
echo "=== OCR Tests ==="

test_api "Get OCR settings" "GET" "/api/ocr-settings" "" "settings.ocrProvider" "$TOKEN"
test_api "Get OCR history" "GET" "/api/ocr-history" "" "history" "$TOKEN"

# ===================================
# 8. Storage & File Tests
# ===================================
echo ""
echo "=== Storage & File Tests ==="

test_api "Get storage quota" "GET" "/api/storage-quota" "" "quota" "$TOKEN"
test_api "Get file list" "GET" "/api/files" "" "files" "$TOKEN"

# ===================================
# 9. Analytics Tests
# ===================================
echo ""
echo "=== Analytics Tests ==="

test_api "Get analytics" "GET" "/api/analytics" "" "analytics" "$TOKEN"

# ===================================
# Summary
# ===================================
echo ""
echo "================================"
echo "Test Summary"
echo "================================"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS))"

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
  echo ""
  echo "Failed Tests:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
fi

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Success Rate: $SUCCESS_RATE%"
echo "================================"

if [ $SUCCESS_RATE -lt 90 ]; then
  exit 1
else
  exit 0
fi
