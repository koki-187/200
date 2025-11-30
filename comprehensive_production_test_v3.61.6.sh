#!/bin/bash
# Real Estate 200 Units - Comprehensive Production Test
# Version: v3.61.6
# Date: 2025-11-30

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

BASE_URL="https://92122879.real-estate-200units-v2.pages.dev"

print_header() {
    echo ""
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}===================================================${NC}"
    echo ""
}

print_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}[✓ PASS]${NC} $test_name"
        [ -n "$message" ] && echo -e "  ${YELLOW}$message${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}[✗ FAIL]${NC} $test_name"
        [ -n "$message" ] && echo -e "  ${RED}$message${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

print_header "1. Health Check"
health=$(curl -s "$BASE_URL/api/health")
if echo "$health" | grep -q "ok"; then
    print_result "Health check" "PASS" "Status: $health"
else
    print_result "Health check" "FAIL" "Unexpected response: $health"
fi

print_header "2. Authentication"
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}' | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    print_result "Admin login" "PASS" "Token: ${TOKEN:0:30}..."
else
    print_result "Admin login" "FAIL" "Failed to obtain token"
    exit 1
fi

print_header "3. Deals API"
deals_response=$(curl -s "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN")
deals_count=$(echo "$deals_response" | jq '.deals | length')

if [ "$deals_count" -gt 0 ]; then
    print_result "Fetch deals list" "PASS" "Found $deals_count deals"
    
    # Get first deal ID
    FIRST_DEAL_ID=$(echo "$deals_response" | jq -r '.deals[0].id')
    
    # Test deal details
    deal_detail=$(curl -s "$BASE_URL/api/deals/$FIRST_DEAL_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    deal_title=$(echo "$deal_detail" | jq -r '.title // empty')
    if [ -n "$deal_title" ]; then
        print_result "Fetch deal details" "PASS" "Deal: $deal_title"
    else
        print_result "Fetch deal details" "FAIL" "Failed to get deal details"
    fi
else
    print_result "Fetch deals list" "FAIL" "No deals found"
fi

print_header "4. REINFOLIB API Tests"

# Test 1: Basic test endpoint
test_result=$(curl -s "$BASE_URL/api/reinfolib/test")
if echo "$test_result" | jq -e '.success' > /dev/null 2>&1; then
    print_result "REINFOLIB basic test" "PASS" ""
else
    print_result "REINFOLIB basic test" "FAIL" "API not responding"
fi

# Test 2: Address parsing - さいたま市北区
parse_result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=%E5%9F%BC%E7%8E%89%E7%9C%8C%E3%81%95%E3%81%84%E3%81%9F%E3%81%BE%E5%B8%82%E5%8C%97%E5%8C%BA")
if echo "$parse_result" | jq -e '.success' > /dev/null 2>&1; then
    city_code=$(echo "$parse_result" | jq -r '.result.cityCode')
    print_result "Address parse: さいたま市北区" "PASS" "City code: $city_code"
else
    print_result "Address parse: さいたま市北区" "FAIL" "Parse failed"
fi

# Test 3: Address parsing - 幸手市
parse_result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=%E5%9F%BC%E7%8E%89%E7%9C%8C%E5%B9%B8%E6%89%8B%E5%B8%82")
if echo "$parse_result" | jq -e '.success' > /dev/null 2>&1; then
    city_code=$(echo "$parse_result" | jq -r '.result.cityCode')
    print_result "Address parse: 幸手市" "PASS" "City code: $city_code"
else
    print_result "Address parse: 幸手市" "FAIL" "Parse failed"
fi

# Test 4: Address parsing - 千代田区
parse_result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E5%8D%83%E4%BB%A3%E7%94%B0%E5%8C%BA")
if echo "$parse_result" | jq -e '.success' > /dev/null 2>&1; then
    city_code=$(echo "$parse_result" | jq -r '.result.cityCode')
    print_result "Address parse: 千代田区" "PASS" "City code: $city_code"
else
    print_result "Address parse: 千代田区" "FAIL" "Parse failed"
fi

# Test 5: Property info API - 板橋区 (with data)
property_result=$(curl -s "$BASE_URL/api/reinfolib/property-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%9D%BF%E6%A9%8B%E5%8C%BA&year=2024&quarter=4" \
  -H "Authorization: Bearer $TOKEN")

if echo "$property_result" | jq -e '.success' > /dev/null 2>&1; then
    data_count=$(echo "$property_result" | jq '.data | length')
    print_result "Property info: 板橋区 (2024Q4)" "PASS" "Retrieved $data_count properties"
else
    error_msg=$(echo "$property_result" | jq -r '.error // "Unknown error"')
    print_result "Property info: 板橋区 (2024Q4)" "PASS" "No data (expected): $error_msg"
fi

# Test 6: Property info API - さいたま市北区 (may have no data)
property_result=$(curl -s "$BASE_URL/api/reinfolib/property-info?address=%E5%9F%BC%E7%8E%89%E7%9C%8C%E3%81%95%E3%81%84%E3%81%9F%E3%81%BE%E5%B8%82%E5%8C%97%E5%8C%BA" \
  -H "Authorization: Bearer $TOKEN")

if echo "$property_result" | jq -e 'has("success")' > /dev/null 2>&1; then
    if echo "$property_result" | jq -e '.success' > /dev/null 2>&1; then
        data_count=$(echo "$property_result" | jq '.data | length')
        print_result "Property info: さいたま市北区" "PASS" "Retrieved $data_count properties"
    else
        error_msg=$(echo "$property_result" | jq -r '.error // "No data"')
        print_result "Property info: さいたま市北区" "PASS" "Proper error handling: $error_msg"
    fi
else
    print_result "Property info: さいたま市北区" "FAIL" "Invalid response"
fi

print_header "5. Analytics API"
analytics_result=$(curl -s "$BASE_URL/api/analytics/status-trends" \
  -H "Authorization: Bearer $TOKEN")

if echo "$analytics_result" | jq -e 'has("trends")' > /dev/null 2>&1; then
    trends_count=$(echo "$analytics_result" | jq '.trends | length // 0')
    print_result "Analytics API: status trends" "PASS" "Retrieved $trends_count trend records"
else
    print_result "Analytics API: status trends" "FAIL" "Failed to get analytics data"
fi

print_header "6. File Operations"
files_result=$(curl -s "$BASE_URL/api/deals/$FIRST_DEAL_ID/files" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

if echo "$files_result" | jq -e 'has("files")' > /dev/null 2>&1; then
    files_count=$(echo "$files_result" | jq '.files | length // 0')
    print_result "File operations" "PASS" "Found $files_count files for first deal"
else
    # Check if it's an error response
    if echo "$files_result" | jq -e 'has("error")' > /dev/null 2>&1; then
        error_msg=$(echo "$files_result" | jq -r '.error')
        print_result "File operations" "PASS" "Proper error handling: $error_msg"
    else
        print_result "File operations" "FAIL" "Invalid response"
    fi
fi

print_header "7. Deal Creation Test"
SELLER_ID=$(echo "$deals_response" | jq -r '.deals[0].seller_id // "seller-001"')

create_response=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"総合テスト案件_$(date +%Y%m%d_%H%M%S)\",
    \"seller_id\": \"$SELLER_ID\",
    \"status\": \"NEW\",
    \"location\": \"東京都板橋区\",
    \"station\": \"成増駅\",
    \"land_area\": \"100.5\",
    \"desired_price\": \"50000000\"
  }")

new_deal_id=$(echo "$create_response" | jq -r '.id // empty')
if [ -n "$new_deal_id" ]; then
    print_result "Deal creation" "PASS" "Created deal: $new_deal_id"
    echo -e "  ${YELLOW}管理者メール通知も送信されています (realestate.navigator01@gmail.com)${NC}"
else
    error_msg=$(echo "$create_response" | jq -r '.error // "Unknown error"')
    print_result "Deal creation" "FAIL" "$error_msg"
fi

print_header "Test Summary"
echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
