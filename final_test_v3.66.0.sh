#!/bin/bash
# Comprehensive Test Script for Real Estate 200 Units System v3.66.0
# Tests all core features including new LINE/Slack notification integration

PROD_URL="https://d8fcb038.real-estate-200units-v2.pages.dev"
DATE=$(date "+%Y/%m/%d %H:%M UTC")

echo "=========================================="
echo "Real Estate 200 Units System v3.66.0"
echo "Comprehensive Test Report"
echo "=========================================="
echo "Production URL: $PROD_URL"
echo "Date: $DATE"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
test_endpoint() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_pattern="$4"
  local data="$5"
  local auth_header="$6"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "Testing $test_name... "
  
  if [ "$method" == "POST" ]; then
    if [ -n "$auth_header" ]; then
      response=$(curl -s -X POST "$PROD_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $auth_header" \
        -d "$data")
    else
      response=$(curl -s -X POST "$PROD_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    fi
  else
    if [ -n "$auth_header" ]; then
      response=$(curl -s -H "Authorization: Bearer $auth_header" "$PROD_URL$endpoint")
    else
      response=$(curl -s "$PROD_URL$endpoint")
    fi
  fi
  
  if echo "$response" | grep -q "$expected_pattern"; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Response: $response"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# Authenticate and get token
echo "Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$PROD_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Authentication failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# === CORE TESTS ===
echo "=== Core Features ==="

test_endpoint "Health Check" "GET" "/" "200" "" ""
test_endpoint "KPI Dashboard" "GET" "/api/analytics/kpi/dashboard" "total_deals" "" "$TOKEN"
test_endpoint "Login History" "GET" "/api/auth/login-history?limit=10" "login_at" "" "$TOKEN"

echo ""

# === NEW FEATURES (v3.66.0) ===
echo "=== New Features (v3.66.0) ==="

test_endpoint "Get Notification Settings" "GET" "/api/notification-settings" "line_enabled\|slack_enabled" "" "$TOKEN"
test_endpoint "Update Notification Settings" "POST" "/api/notification-settings" "通知設定" '{"line_enabled":0,"slack_enabled":0,"notify_on_deal_create":1,"notify_on_deal_update":1,"notify_on_message":1,"notify_on_status_change":1}' "$TOKEN"

echo ""

# === ADVANCED ANALYTICS ===
echo "=== Advanced Analytics ==="

test_endpoint "Agent Performance Analysis" "GET" "/api/analytics/kpi/agents" "agent_id\|agent_name\|total_deals" "" "$TOKEN"
test_endpoint "Area Statistics Analysis" "GET" "/api/analytics/kpi/areas?top=10" "area\|deal_count" "" "$TOKEN"

echo ""

# === DATA EXPORT ===
echo "=== Data Export ==="

test_endpoint "KPI Report Export" "GET" "/api/analytics/export/kpi-report" "ID,タイトル,ステータス" "" "$TOKEN"
test_endpoint "Monthly Report Export" "GET" "/api/analytics/export/monthly-report?year=2024&month=11" "新規案件数,契約済み案件数" "" "$TOKEN"

echo ""

# === NOTIFICATION SYSTEM ===
echo "=== Notification System ==="

test_endpoint "Notifications" "GET" "/api/notifications?limit=5" "notifications\|\[\]" "" "$TOKEN"
test_endpoint "Unread Count" "GET" "/api/notifications/unread-count" "count" "" "$TOKEN"

echo ""

# === DEAL MANAGEMENT ===
echo "=== Deal Management ==="

test_endpoint "Deal List" "GET" "/api/deals" "deals" "" "$TOKEN"

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
else
  echo -e "${RED}⚠️  $FAILED_TESTS test(s) failed${NC}"
fi
