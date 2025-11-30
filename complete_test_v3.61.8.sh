#!/bin/bash
# Complete Production Test v3.61.8
# Comprehensive testing including email, KPI, and all features

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

BASE_URL="https://c25af533.real-estate-200units-v2.pages.dev"

declare -a FAILED_TEST_NAMES=()
declare -a WARNING_TEST_NAMES=()

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}▶ $1${NC}"
}

print_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}  ✓${NC} $test_name"
        [ -n "$message" ] && echo -e "    ${YELLOW}↳ $message${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    elif [ "$status" == "WARN" ]; then
        echo -e "${YELLOW}  ⚠${NC} $test_name"
        [ -n "$message" ] && echo -e "    ${YELLOW}↳ $message${NC}"
        WARNING_TESTS=$((WARNING_TESTS + 1))
        WARNING_TEST_NAMES+=("$test_name: $message")
    else
        echo -e "${RED}  ✗${NC} $test_name"
        [ -n "$message" ] && echo -e "    ${RED}↳ $message${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test_name: $message")
    fi
}

print_header "Complete Production Test v3.61.8"
echo -e "${MAGENTA}Target: $BASE_URL${NC}"
echo -e "${MAGENTA}Date: $(date '+%Y-%m-%d %H:%M:%S')${NC}"

# Authentication
print_header "1. Authentication"
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}' | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    print_result "Admin login" "PASS" "Token obtained"
else
    print_result "Admin login" "FAIL" "Authentication failed"
    exit 1
fi

# KPI Dashboard
print_header "2. KPI Dashboard"
kpi_result=$(curl -s "$BASE_URL/api/analytics/kpi/dashboard" \
  -H "Authorization: Bearer $TOKEN")

if echo "$kpi_result" | jq -e 'has("deals")' > /dev/null 2>&1; then
    total_deals=$(echo "$kpi_result" | jq '.deals.total')
    total_value=$(echo "$kpi_result" | jq '.deals.totalValue')
    print_result "KPI Dashboard" "PASS" "Total: $total_deals deals, Value: ¥$total_value"
else
    error_msg=$(echo "$kpi_result" | jq -r '.error // "Unknown error"')
    print_result "KPI Dashboard" "FAIL" "$error_msg"
fi

# Deal Management
print_header "3. Deal Management"

print_section "3.1 List Deals"
deals_response=$(curl -s "$BASE_URL/api/deals" -H "Authorization: Bearer $TOKEN")
deals_count=$(echo "$deals_response" | jq '.deals | length')

if [ "$deals_count" -gt 0 ]; then
    print_result "List deals" "PASS" "Found $deals_count deals"
    FIRST_DEAL_ID=$(echo "$deals_response" | jq -r '.deals[0].id')
else
    print_result "List deals" "WARN" "No deals found"
    FIRST_DEAL_ID=""
fi

print_section "3.2 Create Deal with Email Notification"
create_response=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Complete Test Deal $(date +%Y%m%d_%H%M%S)\",
    \"seller_id\": \"seller-001\",
    \"status\": \"NEW\",
    \"location\": \"Tokyo Itabashi-ku\",
    \"station\": \"Narimasu\",
    \"walk_minutes\": 10,
    \"land_area\": \"120.5\",
    \"zoning\": \"Residential\",
    \"building_coverage\": \"60\",
    \"floor_area_ratio\": \"200\",
    \"desired_price\": \"65000000\",
    \"remarks\": \"Complete test with email notification\"
  }")

new_deal_id=$(echo "$create_response" | jq -r '.deal.id // empty')
if [ -n "$new_deal_id" ]; then
    print_result "Create deal" "PASS" "ID: $new_deal_id"
    echo -e "    ${MAGENTA}📧 Admin email should be sent to: realestate.navigator01@gmail.com${NC}"
    echo -e "    ${MAGENTA}📧 Check spam folder if not received${NC}"
else
    error_msg=$(echo "$create_response" | jq -r '.error // "Unknown"')
    print_result "Create deal" "FAIL" "$error_msg"
fi

# REINFOLIB API
print_header "4. REINFOLIB API"

print_section "4.1 Address Parsing"
addresses=(
    "%E5%9F%BC%E7%8E%89%E7%9C%8C%E3%81%95%E3%81%84%E3%81%9F%E3%81%BE%E5%B8%82%E5%8C%97%E5%8C%BA:さいたま市北区:11102"
    "%E5%9F%BC%E7%8E%89%E7%9C%8C%E5%B9%B8%E6%89%8B%E5%B8%82:幸手市:11241"
    "%E6%9D%B1%E4%BA%AC%E9%83%BD%E5%8D%83%E4%BB%A3%E7%94%B0%E5%8C%BA:千代田区:13101"
    "%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%9D%BF%E6%A9%8B%E5%8C%BA:板橋区:13119"
)

for addr in "${addresses[@]}"; do
    IFS=':' read -r encoded display expected_code <<< "$addr"
    parse_result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=$encoded")
    
    if echo "$parse_result" | jq -e '.success' > /dev/null 2>&1; then
        city_code=$(echo "$parse_result" | jq -r '.result.cityCode')
        if [ "$city_code" = "$expected_code" ]; then
            print_result "Address parse: $display" "PASS" "Code: $city_code"
        else
            print_result "Address parse: $display" "FAIL" "Expected $expected_code, got $city_code"
        fi
    else
        print_result "Address parse: $display" "FAIL" "Parse failed"
    fi
done

print_section "4.2 Property Info Retrieval"
property_result=$(curl -s "$BASE_URL/api/reinfolib/property-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%9D%BF%E6%A9%8B%E5%8C%BA&year=2024&quarter=4" \
  -H "Authorization: Bearer $TOKEN")

if echo "$property_result" | jq -e '.success' > /dev/null 2>&1; then
    data_count=$(echo "$property_result" | jq '.data | length')
    if [ "$data_count" -gt 0 ]; then
        print_result "Property info (Itabashi 2024Q4)" "PASS" "$data_count properties"
    else
        print_result "Property info (Itabashi 2024Q4)" "WARN" "No data (may be expired)"
    fi
else
    error_msg=$(echo "$property_result" | jq -r '.error // "Unknown"')
    if [ "$error_msg" = "データが見つかりません" ]; then
        print_result "Property info (Itabashi 2024Q4)" "PASS" "Proper error handling"
    else
        print_result "Property info (Itabashi 2024Q4)" "FAIL" "$error_msg"
    fi
fi

# Analytics
print_header "5. Analytics"

print_section "5.1 Status Trends"
status_trends=$(curl -s "$BASE_URL/api/analytics/status-trends" \
  -H "Authorization: Bearer $TOKEN")

if echo "$status_trends" | jq -e '.success' > /dev/null 2>&1; then
    trends_count=$(echo "$status_trends" | jq '.data.statusTrend | length')
    print_result "Status trends" "PASS" "$trends_count trend records"
else
    print_result "Status trends" "FAIL" "Failed to get trends"
fi

print_section "5.2 Deal Trends"
deal_trends=$(curl -s "$BASE_URL/api/analytics/trends/deals" \
  -H "Authorization: Bearer $TOKEN")

if echo "$deal_trends" | jq -e 'has("newDeals")' > /dev/null 2>&1; then
    new_deals_periods=$(echo "$deal_trends" | jq '.newDeals | length')
    print_result "Deal trends" "PASS" "$new_deals_periods periods"
else
    print_result "Deal trends" "FAIL" "Failed to get deal trends"
fi

# Security
print_header "6. Security"

print_section "6.1 Unauthorized Access"
unauth=$(curl -s "$BASE_URL/api/deals")
if echo "$unauth" | grep -q "error\|Invalid token"; then
    print_result "Block unauthorized access" "PASS" "Properly secured"
else
    print_result "Block unauthorized access" "FAIL" "Security vulnerability"
fi

print_section "6.2 Invalid Data Validation"
invalid_deal=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"","seller_id":""}')

if echo "$invalid_deal" | grep -q "error\|validation"; then
    print_result "Input validation" "PASS" "Invalid data rejected"
else
    print_result "Input validation" "FAIL" "Validation not working"
fi

# Summary
print_header "Test Summary"
echo -e "${BLUE}Total:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${YELLOW}Warnings:${NC} $WARNING_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"

success_rate=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS / $TOTAL_TESTS) * 100}")
echo -e "\n${MAGENTA}Success Rate: ${success_rate}%${NC}"

if [ $FAILED_TESTS -eq 0 ] && [ $WARNING_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✓ All tests passed! Ready for release${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ⚠ Some warnings, but ready for release${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Warnings:${NC}"
    for warning in "${WARNING_TEST_NAMES[@]}"; do
        echo -e "  ${YELLOW}⚠${NC} $warning"
    done
    exit 0
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ✗ Tests failed - needs fixing${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${RED}Failed:${NC}"
    for failure in "${FAILED_TEST_NAMES[@]}"; do
        echo -e "  ${RED}✗${NC} $failure"
    done
    exit 1
fi
