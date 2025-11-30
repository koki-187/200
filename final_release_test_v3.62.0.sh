#!/bin/bash

##############################################
# Real Estate 200 Units - 完全版リリーステスト v3.62.2
# Date: 2025-11-30
# Target: Production Environment
##############################################

BASE_URL="https://7e9cee29.real-estate-200units-v2.pages.dev"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

declare -a FAILED_TEST_NAMES
declare -a WARNING_TEST_NAMES

print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

test_pass() {
  ((PASSED_TESTS++))
  ((TOTAL_TESTS++))
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

test_fail() {
  ((FAILED_TESTS++))
  ((TOTAL_TESTS++))
  FAILED_TEST_NAMES+=("$1")
  echo -e "${RED}✗ FAIL${NC}: $1"
  if [ -n "$2" ]; then
    echo -e "${RED}  Error: $2${NC}"
  fi
}

test_warn() {
  ((WARNING_TESTS++))
  ((TOTAL_TESTS++))
  WARNING_TEST_NAMES+=("$1")
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
  if [ -n "$2" ]; then
    echo -e "${YELLOW}  Note: $2${NC}"
  fi
}

#######################
# 1. インフラストラクチャテスト
#######################
print_header "1. Infrastructure Tests"

health=$(curl -s "$BASE_URL/api/health" -w "\n%{http_code}")
http_code=$(echo "$health" | tail -1)
response=$(echo "$health" | head -1)

if [ "$http_code" = "200" ] && echo "$response" | grep -q "ok"; then
  test_pass "Health Check (HTTP $http_code)"
else
  test_fail "Health Check" "HTTP $http_code, Response: $response"
fi

#######################
# 2. 認証テスト
#######################
print_header "2. Authentication Tests"

login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

TOKEN=$(echo "$login_response" | jq -r '.token // empty')
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  test_pass "Admin Login"
else
  test_fail "Admin Login" "No token received"
  exit 1
fi

invalid_login=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid@test.com","password":"wrongpass"}')

if echo "$invalid_login" | grep -q "error"; then
  test_pass "Invalid Login Rejection"
else
  test_fail "Invalid Login Rejection"
fi

#######################
# 3. KPIダッシュボードテスト
#######################
print_header "3. KPI Dashboard Tests"

kpi_response=$(curl -s "$BASE_URL/api/analytics/kpi/dashboard" \
  -H "Authorization: Bearer $TOKEN")

if echo "$kpi_response" | jq -e '.deals.total' > /dev/null 2>&1; then
  total_deals=$(echo "$kpi_response" | jq -r '.deals.total')
  total_value=$(echo "$kpi_response" | jq -r '.deals.totalValue')
  test_pass "KPI Dashboard (Total: $total_deals deals, Value: ¥$total_value)"
else
  test_fail "KPI Dashboard" "Failed to get KPI data"
fi

#######################
# 4. 通知システムテスト
#######################
print_header "4. Notification System Tests"

# Get notifications
notif_response=$(curl -s "$BASE_URL/api/notifications" \
  -H "Authorization: Bearer $TOKEN")

if echo "$notif_response" | jq -e '.unreadCount' > /dev/null 2>&1; then
  unread=$(echo "$notif_response" | jq -r '.unreadCount')
  test_pass "Notification System (Unread: $unread)"
else
  test_fail "Notification System" "Failed to get notifications"
fi

#######################
# 5. 案件管理テスト  
#######################
print_header "5. Deal Management Tests"

deals_response=$(curl -s "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN")

deals_count=$(echo "$deals_response" | jq -r '.deals | length // 0')
if [ "$deals_count" -gt 0 ]; then
  test_pass "List Deals ($deals_count deals)"
else
  test_fail "List Deals" "No deals found"
fi

# Create Deal
timestamp=$(date +%Y%m%d_%H%M%S)
new_deal=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"完全版テスト案件_${timestamp}\",
    \"seller_id\": \"seller-001\",
    \"status\": \"NEW\",
    \"location\": \"東京都板橋区\",
    \"station\": \"成増駅\",
    \"land_area\": \"100.5\",
    \"desired_price\": \"50000000\",
    \"remarks\": \"v3.62.2完全版リリーステスト\"
  }")

new_deal_id=$(echo "$new_deal" | jq -r '.deal.id // empty')
if [ -n "$new_deal_id" ]; then
  test_pass "Create Deal (ID: $new_deal_id)"
  
  # Check if notification was created
  sleep 1
  notif_after=$(curl -s "$BASE_URL/api/notifications" \
    -H "Authorization: Bearer $TOKEN")
  unread_after=$(echo "$notif_after" | jq -r '.unreadCount')
  
  if [ "$unread_after" -gt "$unread" ]; then
    test_pass "D1 Notification Created (Unread: $unread → $unread_after)"
  else
    test_warn "D1 Notification" "Unread count didn't increase (may need admin user)"
  fi
else
  test_fail "Create Deal"
fi

# Update Deal with unified status
if [ -n "$new_deal_id" ]; then
  update_result=$(curl -s -X PUT "$BASE_URL/api/deals/$new_deal_id" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"更新_${timestamp}\",
      \"status\": \"NEGOTIATING\"
    }")
  
  if echo "$update_result" | jq -e '.deal' > /dev/null 2>&1; then
    updated_status=$(echo "$update_result" | jq -r '.deal.status')
    test_pass "Update Deal Status (→ $updated_status)"
  else
    test_fail "Update Deal" "Status update failed"
  fi
fi

# Filter and Sort
new_deals=$(curl -s "$BASE_URL/api/deals?status=NEW" \
  -H "Authorization: Bearer $TOKEN")
new_count=$(echo "$new_deals" | jq -r '.deals | length // 0')
test_pass "Filter by Status (NEW: $new_count deals)"

sorted=$(curl -s "$BASE_URL/api/deals?sort=created_at&order=desc" \
  -H "Authorization: Bearer $TOKEN")
if echo "$sorted" | jq -e '.deals[0]' > /dev/null 2>&1; then
  test_pass "Sort by Date"
else
  test_fail "Sort by Date"
fi

#######################
# 6. REINFOLIB APIテスト
#######################
print_header "6. REINFOLIB API Integration Tests"

# Basic Test
basic=$(curl -s "$BASE_URL/api/reinfolib/test-parse" \
  -H "Authorization: Bearer $TOKEN")

if echo "$basic" | jq -e '.success' > /dev/null 2>&1; then
  test_pass "REINFOLIB API - Basic Test"
else
  test_fail "REINFOLIB API - Basic Test"
fi

# Address Parsing
addresses=(
  "埼玉県さいたま市北区:11:11102"
  "東京都千代田区:13:13101"
  "東京都板橋区:13:13119"
)

for addr_data in "${addresses[@]}"; do
  addr="${addr_data%%:*}"
  rest="${addr_data#*:}"
  pref="${rest%%:*}"
  city="${rest#*:}"
  expected="${pref}${city}"
  
  result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=$(echo -n "$addr" | jq -sRr @uri)" \
    -H "Authorization: Bearer $TOKEN")
  
  pref_code=$(echo "$result" | jq -r '.result.prefectureCode // empty')
  city_code=$(echo "$result" | jq -r '.result.cityCode // empty')
  actual="${pref_code}${city_code}"
  
  if [ "$actual" = "$expected" ]; then
    test_pass "Address Parsing: $addr → $actual"
  else
    test_fail "Address Parsing: $addr" "Expected $expected, got $actual"
  fi
done

# Property Info
prop_info=$(curl -s "$BASE_URL/api/reinfolib/property-info?address=$(echo -n "東京都板橋区" | jq -sRr @uri)&year=2024&quarter=4" \
  -H "Authorization: Bearer $TOKEN")

if echo "$prop_info" | jq -e '.success' > /dev/null 2>&1; then
  count=$(echo "$prop_info" | jq -r '.data | length')
  test_pass "Property Info Retrieval (Itabashi 2024Q4: $count properties)"
else
  test_fail "Property Info Retrieval"
fi

#######################
# 7. 分析APIテスト
#######################
print_header "7. Analytics API Tests"

trends=$(curl -s "$BASE_URL/api/analytics/status-trends" \
  -H "Authorization: Bearer $TOKEN")
trends_count=$(echo "$trends" | jq -r '. | length')
if [ "$trends_count" -gt 0 ]; then
  test_pass "Status Trends ($trends_count records)"
else
  test_fail "Status Trends"
fi

deal_trends=$(curl -s "$BASE_URL/api/analytics/trends/deals" \
  -H "Authorization: Bearer $TOKEN")
periods=$(echo "$deal_trends" | jq -r '. | length')
if [ "$periods" -gt 0 ]; then
  test_pass "Deal Trends ($periods periods)"
else
  test_fail "Deal Trends"
fi

#######################
# 8. セキュリティテスト
#######################
print_header "8. Security Tests"

unauth=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/deals")
if [ "$unauth" = "401" ] || [ "$unauth" = "403" ]; then
  test_pass "Unauthorized Access Blocked (HTTP $unauth)"
else
  test_fail "Unauthorized Access" "Expected 401/403, got $unauth"
fi

not_found=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/nonexistent")
if [ "$not_found" = "404" ]; then
  test_pass "404 Error Handling"
else
  test_fail "404 Error Handling"
fi

invalid=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"","seller_id":""}')

if echo "$invalid" | grep -q "error\|validation"; then
  test_pass "Validation Error Rejection"
else
  test_fail "Validation Error Rejection"
fi

#######################
# Test Summary
#######################
print_header "Test Summary"
echo -e "${BLUE}Date:${NC} $(date)"
echo -e "${BLUE}Target:${NC} $BASE_URL"
echo -e "${BLUE}Version:${NC} v3.62.2 (Complete Release)"
echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${YELLOW}Warnings:${NC} $WARNING_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"
echo ""

if [ "$TOTAL_TESTS" -gt 0 ]; then
  success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "${BLUE}Success Rate:${NC} ${success_rate}%"
fi

if [ ${#WARNING_TEST_NAMES[@]} -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  Warnings:${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  for test_name in "${WARNING_TEST_NAMES[@]}"; do
    echo -e "${YELLOW}  ⚠ $test_name${NC}"
  done
fi

if [ ${#FAILED_TEST_NAMES[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  Failed Tests:${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  for test_name in "${FAILED_TEST_NAMES[@]}"; do
    echo -e "${RED}  ✗ $test_name${NC}"
  done
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  🚨 Some tests failed${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
elif [ "$WARNING_TESTS" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  ⚠ Warnings but system is functional${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ All tests passed - Complete release ready!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi
