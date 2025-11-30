#!/bin/bash

URL="https://2c2de4de.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "Comprehensive Test v3.63.0"
echo "=========================================="
echo "Production URL: $URL"
echo "Date: $(date -u +"%Y/%m/%d %H:%M UTC")"
echo ""

# Initialize counters
TOTAL=0
PASSED=0
FAILED=0
WARNINGS=0

# Test results array
declare -a FAILURES
declare -a SUCCESS
declare -a WARN

# Helper function to run test
run_test() {
  local test_name="$1"
  local test_cmd="$2"
  local expected="$3"
  
  TOTAL=$((TOTAL + 1))
  
  result=$(eval "$test_cmd" 2>&1)
  
  if echo "$result" | grep -q "$expected"; then
    PASSED=$((PASSED + 1))
    SUCCESS+=("✅ $test_name")
    echo "✅ PASS: $test_name"
  else
    FAILED=$((FAILED + 1))
    FAILURES+=("❌ $test_name")
    echo "❌ FAIL: $test_name"
    echo "   Expected: $expected"
    echo "   Got: $result"
  fi
  echo ""
}

# 1. Health Check
echo "=== Infrastructure Tests ==="
run_test "Health Check" \
  "curl -s $URL/api/health" \
  "status.*ok"

# 2. Login
echo "=== Authentication Tests ==="
LOGIN_RESPONSE=$(curl -s -X POST "$URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  TOTAL=$((TOTAL + 1))
  FAILED=$((FAILED + 1))
  FAILURES+=("❌ Admin Login")
  echo "❌ FAIL: Admin Login"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
else
  TOTAL=$((TOTAL + 1))
  PASSED=$((PASSED + 1))
  SUCCESS+=("✅ Admin Login")
  echo "✅ PASS: Admin Login"
fi
echo ""

# 3. KPI Dashboard
echo "=== KPI Dashboard Tests ==="
run_test "KPI Dashboard" \
  "curl -s $URL/api/analytics/kpi/dashboard -H \"Authorization: Bearer $TOKEN\"" \
  "deals"

# 4. Agent Performance Analysis (新機能)
run_test "Agent Performance Analysis" \
  "curl -s $URL/api/analytics/kpi/agents -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

# 5. Area Statistics (新機能)
run_test "Area Statistics Analysis" \
  "curl -s $URL/api/analytics/kpi/areas -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

# 6. Detailed Trends (新機能)
run_test "Detailed Trend Analysis" \
  "curl -s \"$URL/api/analytics/kpi/trends/detailed?period=30&granularity=week\" -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

# 7. Matching Analysis (新機能)
run_test "Matching Analysis" \
  "curl -s $URL/api/analytics/kpi/matching -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

# 8. Notification System
echo "=== Notification Tests ==="
run_test "Notifications List" \
  "curl -s $URL/api/notifications -H \"Authorization: Bearer $TOKEN\"" \
  "unreadCount"

# 9. Deal Management
echo "=== Deal Management Tests ==="
DEAL_LIST=$(curl -s "$URL/api/deals?page=1&limit=20" -H "Authorization: Bearer $TOKEN")
DEAL_COUNT=$(echo "$DEAL_LIST" | jq '.deals | length')

if [ "$DEAL_COUNT" -gt 0 ]; then
  TOTAL=$((TOTAL + 1))
  PASSED=$((PASSED + 1))
  SUCCESS+=("✅ Deal List ($DEAL_COUNT deals)")
  echo "✅ PASS: Deal List ($DEAL_COUNT deals)"
else
  TOTAL=$((TOTAL + 1))
  FAILED=$((FAILED + 1))
  FAILURES+=("❌ Deal List (0 deals)")
  echo "❌ FAIL: Deal List (0 deals)"
fi
echo ""

# 10. Deal Update with Notification (新機能テスト)
FIRST_DEAL_ID=$(echo "$DEAL_LIST" | jq -r '.deals[0].id // empty')
if [ ! -z "$FIRST_DEAL_ID" ]; then
  run_test "Deal Update (with notification)" \
    "curl -s -X PUT \"$URL/api/deals/$FIRST_DEAL_ID\" \
      -H \"Authorization: Bearer $TOKEN\" \
      -H \"Content-Type: application/json\" \
      -d '{\"status\":\"REVIEWING\",\"title\":\"Test Update v3.63.0\"}'" \
    "deal"
fi

# 11. Storage Usage
echo "=== Storage Tests ==="
run_test "Storage Usage API" \
  "curl -s $URL/api/r2/storage/usage -H \"Authorization: Bearer $TOKEN\"" \
  "totalSizeMB"

# 12. REINFOLIB API
echo "=== REINFOLIB API Tests ==="
run_test "REINFOLIB Address Parse" \
  "curl -s -X POST \"$URL/api/reinfolib/test-parse\" \
    -H \"Authorization: Bearer $TOKEN\" \
    -H \"Content-Type: application/json\" \
    -d '{\"address\":\"東京都千代田区\"}'" \
  "prefectureCode.*13"

# Summary
echo ""
echo "=========================================="
echo "📊 Test Summary v3.63.0"
echo "=========================================="
echo "Total Tests: $TOTAL"
echo "✅ Passed: $PASSED ($((PASSED * 100 / TOTAL))%)"
echo "⚠️  Warnings: $WARNINGS"
echo "❌ Failed: $FAILED ($((FAILED * 100 / TOTAL))%)"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "Failed Tests:"
  printf '%s\n' "${FAILURES[@]}"
  echo ""
fi

if [ $WARNINGS -gt 0 ]; then
  echo "Warnings:"
  printf '%s\n' "${WARN[@]}"
  echo ""
fi

echo "Success Rate: $((PASSED * 100 / TOTAL))%"
echo "=========================================="
