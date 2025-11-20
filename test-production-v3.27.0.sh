#!/bin/bash

# Real Estate 200 Units Production API Test Script
# Version: v3.27.0
# Date: 2025-11-20
# Target: Production environment (Cloudflare Pages)
# New tests: User guides (buyer/seller), onboarding, help, glossary

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

BASE_URL="https://5f326086.real-estate-200units-v2.pages.dev"

declare -a FAILED_TEST_NAMES=()
declare -a RESPONSE_TIMES=()

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
    local response_time="${4:-N/A}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}[✓ PASS]${NC} $test_name ${YELLOW}(${response_time}ms)${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        if [ "$response_time" != "N/A" ]; then
            RESPONSE_TIMES+=("$response_time")
        fi
    else
        echo -e "${RED}[✗ FAIL]${NC} $test_name"
        echo -e "${RED}   └─ $message${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test_name: $message")
    fi
}

check_status() {
    local expected="$1"
    local actual="$2"
    if [ "$expected" == "$actual" ]; then
        echo "PASS"
    else
        echo "FAIL Expected $expected, got $actual"
    fi
}

measure_time() {
    local url="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local auth="${4:-}"
    
    local curl_cmd="curl -s -o /dev/null -w '%{time_total}' -X $method"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ -n "$auth" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local time_total=$(eval $curl_cmd)
    echo $(printf "%.0f" $(echo "$time_total * 1000" | bc))
}

print_header "Production Environment Test - v3.27.0"
echo -e "${YELLOW}Target: $BASE_URL${NC}"
echo ""

# Test 1: Health Check
print_header "Test 1: Health Check & Performance"

response_time=$(measure_time "$BASE_URL/api/health")
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/health")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)

result=$(check_status "200" "$http_status")
print_result "Health check endpoint" "${result%% *}" "${result#* }" "$response_time"

# Test 2: Authentication
print_header "Test 2: Authentication Performance"

response_time=$(measure_time "$BASE_URL/api/auth/login" "POST" '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}')

login_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}')

http_status=$(echo "$login_response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$login_response" | sed '$d')

if [ "$http_status" == "200" ]; then
    TOKEN=$(echo "$body" | jq -r '.token')
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        print_result "Admin login" "PASS" "" "$response_time"
    else
        print_result "Admin login" "FAIL" "Token not received" "$response_time"
    fi
else
    print_result "Admin login" "FAIL" "HTTP $http_status" "$response_time"
fi

# Test 3: Deals API
print_header "Test 3: Deals API Performance"

response_time=$(measure_time "$BASE_URL/api/deals" "GET" "" "$TOKEN")

deals_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN")

deals_http=$(echo "$deals_response" | grep "HTTP_STATUS" | cut -d':' -f2)
deals_body=$(echo "$deals_response" | sed '$d')

if [ "$deals_http" == "200" ]; then
    deals_count=$(echo "$deals_body" | jq '.deals | length')
    print_result "Get all deals" "PASS" "" "$response_time"
    echo -e "${YELLOW}   └─ Found $deals_count deals${NC}"
else
    print_result "Get all deals" "FAIL" "HTTP $deals_http" "$response_time"
fi

# Test 4: Analytics API
print_header "Test 4: Analytics API Performance"

response_time=$(measure_time "$BASE_URL/api/analytics/kpi/dashboard" "GET" "" "$TOKEN")

analytics_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$BASE_URL/api/analytics/kpi/dashboard" \
  -H "Authorization: Bearer $TOKEN")

analytics_http=$(echo "$analytics_response" | grep "HTTP_STATUS" | cut -d':' -f2)

result=$(check_status "200" "$analytics_http")
print_result "Get KPI dashboard" "${result%% *}" "${result#* }" "$response_time"

# Test 5: Feedback API
print_header "Test 5: Feedback API Performance"

response_time=$(measure_time "$BASE_URL/api/feedback" "GET" "" "$TOKEN")

feedback_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$BASE_URL/api/feedback" \
  -H "Authorization: Bearer $TOKEN")

feedback_http=$(echo "$feedback_response" | grep "HTTP_STATUS" | cut -d':' -f2)

result=$(check_status "200" "$feedback_http")
print_result "Get feedback list" "${result%% *}" "${result#* }" "$response_time"

# Test 6: NEW - Buyer Guide Page
print_header "Test 6: Buyer Guide Page (NEW)"

response_time=$(measure_time "$BASE_URL/static/buyer-guide.html")
buyer_guide_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/static/buyer-guide.html")
buyer_guide_http=$(echo "$buyer_guide_response" | grep "HTTP_STATUS" | cut -d':' -f2)
buyer_guide_body=$(echo "$buyer_guide_response" | sed '$d')

if [ "$buyer_guide_http" == "200" ]; then
    if echo "$buyer_guide_body" | grep -q "買側ユーザー完全ガイド"; then
        print_result "Load buyer guide page" "PASS" "" "$response_time"
        echo -e "${YELLOW}   └─ Buyer guide contains expected content${NC}"
    else
        print_result "Load buyer guide page" "FAIL" "Content validation failed"
    fi
else
    print_result "Load buyer guide page" "FAIL" "HTTP $buyer_guide_http" "$response_time"
fi

# Test 7: NEW - Seller Guide Page
print_header "Test 7: Seller Guide Page (NEW)"

response_time=$(measure_time "$BASE_URL/static/seller-guide.html")
seller_guide_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/static/seller-guide.html")
seller_guide_http=$(echo "$seller_guide_response" | grep "HTTP_STATUS" | cut -d':' -f2)
seller_guide_body=$(echo "$seller_guide_response" | sed '$d')

if [ "$seller_guide_http" == "200" ]; then
    if echo "$seller_guide_body" | grep -q "売側ユーザー完全ガイド"; then
        print_result "Load seller guide page" "PASS" "" "$response_time"
        echo -e "${YELLOW}   └─ Seller guide contains expected content${NC}"
    else
        print_result "Load seller guide page" "FAIL" "Content validation failed"
    fi
else
    print_result "Load seller guide page" "FAIL" "HTTP $seller_guide_http" "$response_time"
fi

# Test 8: Onboarding Page
print_header "Test 8: Onboarding Tutorial Page"

response_time=$(measure_time "$BASE_URL/static/onboarding.html")
onboarding_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/static/onboarding.html")

result=$(check_status "200" "$onboarding_response")
print_result "Load onboarding tutorial" "${result%% *}" "${result#* }" "$response_time"

# Test 9: Help Center Page
print_header "Test 9: Help Center Page"

response_time=$(measure_time "$BASE_URL/static/help.html")
help_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/static/help.html")

result=$(check_status "200" "$help_response")
print_result "Load help center" "${result%% *}" "${result#* }" "$response_time"

# Test 10: Glossary Page
print_header "Test 10: Glossary Page"

response_time=$(measure_time "$BASE_URL/static/glossary.html")
glossary_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/static/glossary.html")

result=$(check_status "200" "$glossary_response")
print_result "Load glossary" "${result%% *}" "${result#* }" "$response_time"

# Test 11: API Documentation
print_header "Test 11: API Documentation"

response_time=$(measure_time "$BASE_URL/api/docs")
docs_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/docs")

result=$(check_status "200" "$docs_response")
print_result "Load API documentation" "${result%% *}" "${result#* }" "$response_time"

# Test 12: Showcase Page
print_header "Test 12: Showcase Page"

response_time=$(measure_time "$BASE_URL/showcase")
showcase_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/showcase")

result=$(check_status "200" "$showcase_response")
print_result "Load showcase page" "${result%% *}" "${result#* }" "$response_time"

# Performance Summary
print_header "Performance Summary"

if [ ${#RESPONSE_TIMES[@]} -gt 0 ]; then
    total=0
    for time in "${RESPONSE_TIMES[@]}"; do
        total=$((total + time))
    done
    avg=$((total / ${#RESPONSE_TIMES[@]}))
    
    min=${RESPONSE_TIMES[0]}
    max=${RESPONSE_TIMES[0]}
    for time in "${RESPONSE_TIMES[@]}"; do
        if [ $time -lt $min ]; then
            min=$time
        fi
        if [ $time -gt $max ]; then
            max=$time
        fi
    done
    
    echo -e "Average Response Time: ${YELLOW}${avg}ms${NC}"
    echo -e "Fastest Response:      ${GREEN}${min}ms${NC}"
    echo -e "Slowest Response:      ${RED}${max}ms${NC}"
    echo ""
    
    if [ $avg -lt 100 ]; then
        echo -e "${GREEN}✓ Excellent performance (<100ms)${NC}"
    elif [ $avg -lt 300 ]; then
        echo -e "${YELLOW}✓ Good performance (<300ms)${NC}"
    elif [ $avg -lt 500 ]; then
        echo -e "${YELLOW}⚠ Acceptable performance (<500ms)${NC}"
    else
        echo -e "${RED}✗ Poor performance (>500ms)${NC}"
    fi
fi

# Summary Report
echo ""
echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE} Test Summary${NC}"
echo -e "${BLUE}===================================================${NC}"
echo ""
echo -e "Total Tests:  ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All production tests passed!${NC}"
    echo -e "${GREEN}✓ Production environment is healthy${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed:${NC}"
    echo ""
    for test_name in "${FAILED_TEST_NAMES[@]}"; do
        echo -e "${RED}  • $test_name${NC}"
    done
    echo ""
    exit 1
fi
