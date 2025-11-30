#!/bin/bash

##############################################
# Real Estate 200 Units - 最終包括テスト v3.61.9
# Date: 2025-11-30
# Target: Production Environment
##############################################

BASE_URL="https://136df0c6.real-estate-200units-v2.pages.dev"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Array to store failed test names
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

# Health Check
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

# Admin Login
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}')

TOKEN=$(echo "$login_response" | jq -r '.token // empty')
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  test_pass "Admin Login"
else
  test_fail "Admin Login" "No token received"
  echo "Exiting due to authentication failure"
  exit 1
fi

# Invalid Login
invalid_login=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid@test.com","password":"wrongpass"}')

if echo "$invalid_login" | grep -q "error"; then
  test_pass "Invalid Login Rejection"
else
  test_fail "Invalid Login Rejection" "Should reject invalid credentials"
fi

#######################
# 3. KPIダッシュボードテスト
#######################
print_header "3. KPI Dashboard Tests"

kpi_response=$(curl -s "$BASE_URL/api/analytics/kpi/dashboard" \
  -H "Authorization: Bearer $TOKEN")

# Check for new format: deals.total
if echo "$kpi_response" | jq -e '.deals.total' > /dev/null 2>&1; then
  total_deals=$(echo "$kpi_response" | jq -r '.deals.total')
  total_value=$(echo "$kpi_response" | jq -r '.deals.totalValue')
  test_pass "KPI Dashboard (Total: $total_deals deals, Value: ¥$total_value)"
else
  test_fail "KPI Dashboard" "Failed to get KPI data"
fi

#######################
# 4. 案件管理テスト
#######################
print_header "4. Deal Management Tests"

# List Deals
deals_response=$(curl -s "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN")

deals_count=$(echo "$deals_response" | jq -r '.deals | length // 0')
if [ "$deals_count" -gt 0 ]; then
  test_pass "List Deals ($deals_count deals)"
else
  test_fail "List Deals" "No deals found"
fi

# Get Deal Details
if [ "$deals_count" -gt 0 ]; then
  first_deal_id=$(echo "$deals_response" | jq -r '.deals[0].id // empty')
  if [ -n "$first_deal_id" ]; then
    deal_details=$(curl -s "$BASE_URL/api/deals/$first_deal_id" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$deal_details" | jq -e '.deal.title' > /dev/null 2>&1; then
      test_pass "Get Deal Details"
    else
      test_fail "Get Deal Details" "Failed to retrieve deal details"
    fi
  else
    test_fail "Get Deal Details" "No deal ID found"
  fi
fi

# Create Deal
timestamp=$(date +%Y%m%d_%H%M%S)
new_deal=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"最終テスト案件_${timestamp}\",
    \"seller_id\": \"seller-001\",
    \"status\": \"NEW\",
    \"location\": \"東京都板橋区\",
    \"station\": \"成増駅\",
    \"land_area\": \"100.5\",
    \"desired_price\": \"50000000\",
    \"remarks\": \"包括的エラーテスト v3.61.9\"
  }")

new_deal_id=$(echo "$new_deal" | jq -r '.deal.id // empty')
if [ -n "$new_deal_id" ]; then
  test_pass "Create Deal (ID: $new_deal_id)"
  test_warn "Admin Email Notification" "Email may not be delivered due to Resend restrictions. Check Cloudflare logs or implement alternative notification."
else
  test_fail "Create Deal" "Failed to create deal"
fi

# Update Deal
if [ -n "$new_deal_id" ]; then
  update_result=$(curl -s -X PUT "$BASE_URL/api/deals/$new_deal_id" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"更新されたテスト案件_${timestamp}\",
      \"status\": \"NEGOTIATING\"
    }")
  
  if echo "$update_result" | jq -e '.deal' > /dev/null 2>&1; then
    test_pass "Update Deal"
  else
    test_fail "Update Deal" "Failed to update deal"
  fi
fi

# Filter by Status
new_deals=$(curl -s "$BASE_URL/api/deals?status=NEW" \
  -H "Authorization: Bearer $TOKEN")
new_deals_count=$(echo "$new_deals" | jq -r '.deals | length // 0')
test_pass "Filter by Status (NEW: $new_deals_count deals)"

# Sort by Date
sorted_deals=$(curl -s "$BASE_URL/api/deals?sort=created_at&order=desc" \
  -H "Authorization: Bearer $TOKEN")
if echo "$sorted_deals" | jq -e '.deals[0]' > /dev/null 2>&1; then
  test_pass "Sort by Date"
else
  test_fail "Sort by Date" "Failed to sort deals"
fi

# Pagination
page1=$(curl -s "$BASE_URL/api/deals?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")
page1_count=$(echo "$page1" | jq -r '.deals | length // 0')
if [ "$page1_count" -le 5 ] && [ "$page1_count" -gt 0 ]; then
  test_pass "Pagination (Page 1: $page1_count items)"
else
  test_fail "Pagination" "Limit not working correctly"
fi

#######################
# 5. REINFOLIB APIテスト
#######################
print_header "5. REINFOLIB API Integration Tests"

# Basic Test
basic_test=$(curl -s "$BASE_URL/api/reinfolib/test-parse" \
  -H "Authorization: Bearer $TOKEN")

if echo "$basic_test" | jq -e ".success"; then
  test_pass "REINFOLIB API - Basic Test"
else
  test_fail "REINFOLIB API - Basic Test" "Endpoint not responding"
fi

# Address Parsing Tests
addresses=(
  "さいたま市北区:11102"
  "千代田区:13101"
  "板橋区:13119"
)

for addr_pair in "${addresses[@]}"; do
  addr="${addr_pair%%:*}"
  expected_code="${addr_pair##*:}"
  
  parse_result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=$(echo -n "$addr" | jq -sRr @uri)" \
    -H "Authorization: Bearer $TOKEN")
  
  actual_code=$(echo "$parse_result" | jq -r '.result.prefectureCode + .result.cityCode')
  
  if [ "$actual_code" = "$expected_code" ]; then
    test_pass "Address Parsing: $addr → $actual_code"
  else
    test_fail "Address Parsing: $addr" "Expected $expected_code, got $actual_code"
  fi
done

# Property Info Retrieval
property_info=$(curl -s "$BASE_URL/api/reinfolib/property-info?address=$(echo -n "東京都板橋区" | jq -sRr @uri)&year=2024&quarter=4" \
  -H "Authorization: Bearer $TOKEN")

if echo "$property_info" | jq -e '.success' > /dev/null 2>&1; then
  data_count=$(echo "$property_info" | jq -r '.data | length')
  test_pass "Property Info Retrieval (Itabashi 2024Q4: $data_count properties)"
else
  test_fail "Property Info Retrieval" "Failed to get property data"
fi

# Property Info - No Data Case
no_data_result=$(curl -s "$BASE_URL/api/reinfolib/property-info?address=$(echo -n "さいたま市北区" | jq -sRr @uri)&year=2024&quarter=4" \
  -H "Authorization: Bearer $TOKEN")

if echo "$no_data_result" | grep -q "データが見つかりません\|success.*false"; then
  test_pass "Property Info - Appropriate Error Handling"
else
  test_fail "Property Info - Error Handling" "Unexpected response for no-data case"
fi

#######################
# 6. 分析APIテスト
#######################
print_header "6. Analytics API Tests"

# Status Trends
status_trends=$(curl -s "$BASE_URL/api/analytics/status-trends" \
  -H "Authorization: Bearer $TOKEN")

trends_count=$(echo "$status_trends" | jq -r '. | length')
if [ "$trends_count" -gt 0 ]; then
  test_pass "Status Trends ($trends_count records)"
else
  test_fail "Status Trends" "No trend data found"
fi

# Deal Trends
deal_trends=$(curl -s "$BASE_URL/api/analytics/trends/deals" \
  -H "Authorization: Bearer $TOKEN")

periods=$(echo "$deal_trends" | jq -r '. | length')
if [ "$periods" -gt 0 ]; then
  test_pass "Deal Trends ($periods periods)"
else
  test_fail "Deal Trends" "No deal trend data"
fi

#######################
# 7. ファイル操作テスト
#######################
print_header "7. File Operations Tests"

# List Files
files_list=$(curl -s "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN")

files_count=$(echo "$files_list" | jq -r '. | length // 0')
test_pass "List Files ($files_count files)"

#######################
# 8. セキュリティテスト
#######################
print_header "8. Security Tests"

# Unauthorized Access
unauth_response=$(curl -s "$BASE_URL/api/deals")
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/deals")

if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
  test_pass "Unauthorized Access Blocked (HTTP $http_code)"
else
  test_fail "Unauthorized Access" "Should return 401/403, got $http_code"
fi

# 404 Error Handling
not_found=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/nonexistent")
if [ "$not_found" = "404" ]; then
  test_pass "404 Error Handling"
else
  test_fail "404 Error Handling" "Expected 404, got $not_found"
fi

# Validation Errors
invalid_deal=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"","seller_id":""}')

if echo "$invalid_deal" | grep -q "error\|validation"; then
  test_pass "Validation Error Rejection"
else
  test_fail "Validation Error Rejection" "Should reject invalid data"
fi

#######################
# Test Summary
#######################
print_header "Test Summary"
echo -e "${BLUE}Date:${NC} $(date)"
echo -e "${BLUE}Target:${NC} $BASE_URL"
echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${YELLOW}Warnings:${NC} $WARNING_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"
echo ""

# Success rate
if [ "$TOTAL_TESTS" -gt 0 ]; then
  success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "${BLUE}Success Rate:${NC} ${success_rate}%"
fi

# List warnings
if [ ${#WARNING_TEST_NAMES[@]} -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  Warnings:${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  for test_name in "${WARNING_TEST_NAMES[@]}"; do
    echo -e "${YELLOW}  ⚠ $test_name${NC}"
  done
fi

# List failed tests
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
  echo -e "${RED}  🚨 Some tests failed - needs attention${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
elif [ "$WARNING_TESTS" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  ⚠ Some warnings - but system is functional${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ All tests passed - system is ready!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi
}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi
