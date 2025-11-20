#!/bin/bash

# Real Estate 200 Units Production API Test Script
# Version: v3.26.0
# Date: 2025-11-20
# Target: Production environment (Cloudflare Pages)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Production URL
BASE_URL="https://5f326086.real-estate-200units-v2.pages.dev"

# Test result tracking
declare -a FAILED_TEST_NAMES=()
declare -a RESPONSE_TIMES=()

# Function to print test header
print_header() {
    echo ""
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}===================================================${NC}"
    echo ""
}

# Function to print test result
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

# Function to check HTTP status code
check_status() {
    local expected="$1"
    local actual="$2"
    if [ "$expected" == "$actual" ]; then
        echo "PASS"
    else
        echo "FAIL Expected $expected, got $actual"
    fi
}

# Function to measure response time
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
    # Convert to milliseconds
    echo $(printf "%.0f" $(echo "$time_total * 1000" | bc))
}

print_header "Production Environment Test - v3.26.0"
echo -e "${YELLOW}Target: $BASE_URL${NC}"
echo ""

# ============================================================
# Test 1: Health Check & Performance
# ============================================================
print_header "Test 1: Health Check & Performance"

response_time=$(measure_time "$BASE_URL/api/health")
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/health")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)

result=$(check_status "200" "$http_status")
print_result "Health check endpoint" "${result%% *}" "${result#* }" "$response_time"

# ============================================================
# Test 2: Authentication Performance
# ============================================================
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

# ============================================================
# Test 3: Deals API Performance
# ============================================================
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

# ============================================================
# Test 4: Messages API Performance
# ============================================================
print_header "Test 4: Messages API Performance"

response_time=$(measure_time "$BASE_URL/api/messages/deals/deal-001" "GET" "" "$TOKEN")

messages_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$BASE_URL/api/messages/deals/deal-001" \
  -H "Authorization: Bearer $TOKEN")

messages_http=$(echo "$messages_response" | grep "HTTP_STATUS" | cut -d':' -f2)

result=$(check_status "200" "$messages_http")
print_result "Get messages for deal" "${result%% *}" "${result#* }" "$response_time"

# ============================================================
# Test 5: Property Templates API Performance
# ============================================================
print_header "Test 5: Property Templates API Performance"

response_time=$(measure_time "$BASE_URL/api/property-templates/presets")

presets_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$BASE_URL/api/property-templates/presets")

presets_http=$(echo "$presets_response" | grep "HTTP_STATUS" | cut -d':' -f2)
presets_body=$(echo "$presets_response" | sed '$d')

if [ "$presets_http" == "200" ]; then
    presets_count=$(echo "$presets_body" | jq '.presets | length')
    print_result "Get preset templates" "PASS" "" "$response_time"
    echo -e "${YELLOW}   └─ Found $presets_count presets${NC}"
else
    print_result "Get preset templates" "FAIL" "HTTP $presets_http" "$response_time"
fi

# ============================================================
# Test 6: Files API Performance
# ============================================================
print_header "Test 6: Files API Performance"

response_time=$(measure_time "$BASE_URL/api/files/deals/deal-001" "GET" "" "$TOKEN")

files_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$BASE_URL/api/files/deals/deal-001" \
  -H "Authorization: Bearer $TOKEN")

files_http=$(echo "$files_response" | grep "HTTP_STATUS" | cut -d':' -f2)

result=$(check_status "200" "$files_http")
print_result "Get files for deal" "${result%% *}" "${result#* }" "$response_time"

# ============================================================
# Test 7: OCR Settings API Performance
# ============================================================
print_header "Test 7: OCR Settings API Performance"

response_time=$(measure_time "$BASE_URL/api/ocr-settings" "GET" "" "$TOKEN")

ocr_settings_response=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "$BASE_URL/api/ocr-settings" \
  -H "Authorization: Bearer $TOKEN")

result=$(check_status "200" "$ocr_settings_response")
print_result "Get OCR settings" "${result%% *}" "${result#* }" "$response_time"

# ============================================================
# Test 8: Static Assets Performance
# ============================================================
print_header "Test 8: Static Assets Performance"

response_time=$(measure_time "$BASE_URL/logo-3d.png")
logo_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/logo-3d.png")

result=$(check_status "200" "$logo_response")
print_result "Load logo image" "${result%% *}" "${result#* }" "$response_time"

# ============================================================
# Test 9: Showcase Page Performance
# ============================================================
print_header "Test 9: Showcase Page Performance"

response_time=$(measure_time "$BASE_URL/showcase")
showcase_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/showcase")

result=$(check_status "200" "$showcase_response")
print_result "Load showcase page" "${result%% *}" "${result#* }" "$response_time"

# ============================================================
# Test 10: API Documentation Performance
# ============================================================
print_header "Test 10: API Documentation Performance"

response_time=$(measure_time "$BASE_URL/api/docs")
docs_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/docs")

result=$(check_status "200" "$docs_response")
print_result "Load API documentation" "${result%% *}" "${result#* }" "$response_time"

# ============================================================
# Performance Summary
# ============================================================
print_header "Performance Summary"

if [ ${#RESPONSE_TIMES[@]} -gt 0 ]; then
    # Calculate average response time
    total=0
    for time in "${RESPONSE_TIMES[@]}"; do
        total=$((total + time))
    done
    avg=$((total / ${#RESPONSE_TIMES[@]}))
    
    # Find min and max
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
    
    # Performance rating
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

# ============================================================
# Summary Report
# ============================================================
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

# ==========================================
# 追加テスト: v3.27.0 新機能
# ==========================================

echo ""
echo "=========================================="
echo "追加テスト: ユーザーガイド機能"
echo "=========================================="

# Test 11: 買側ユーザーガイド
test_number=$((test_number + 1))
echo ""
echo "テスト ${test_number}: 買側ユーザーガイドアクセス"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/static/buyer-guide")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ PASS - 買側ガイドアクセス成功 (HTTP 200)"
    passed=$((passed + 1))
else
    echo "❌ FAIL - 買側ガイドアクセス失敗 (HTTP ${HTTP_STATUS})"
    failed=$((failed + 1))
fi

# Test 12: 売側ユーザーガイド
test_number=$((test_number + 1))
echo ""
echo "テスト ${test_number}: 売側ユーザーガイドアクセス"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/static/seller-guide")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ PASS - 売側ガイドアクセス成功 (HTTP 200)"
    passed=$((passed + 1))
else
    echo "❌ FAIL - 売側ガイドアクセス失敗 (HTTP ${HTTP_STATUS})"
    failed=$((failed + 1))
fi

# Test 13: オンボーディングチュートリアル
test_number=$((test_number + 1))
echo ""
echo "テスト ${test_number}: オンボーディングチュートリアルアクセス"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/static/onboarding")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ PASS - オンボーディングアクセス成功 (HTTP 200)"
    passed=$((passed + 1))
else
    echo "❌ FAIL - オンボーディングアクセス失敗 (HTTP ${HTTP_STATUS})"
    failed=$((failed + 1))
fi

# Test 14: ヘルプセンター
test_number=$((test_number + 1))
echo ""
echo "テスト ${test_number}: ヘルプセンターアクセス"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/static/help")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ PASS - ヘルプセンターアクセス成功 (HTTP 200)"
    passed=$((passed + 1))
else
    echo "❌ FAIL - ヘルプセンターアクセス失敗 (HTTP ${HTTP_STATUS})"
    failed=$((failed + 1))
fi

# Test 15: 用語集
test_number=$((test_number + 1))
echo ""
echo "テスト ${test_number}: 用語集アクセス"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/static/glossary")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ PASS - 用語集アクセス成功 (HTTP 200)"
    passed=$((passed + 1))
else
    echo "❌ FAIL - 用語集アクセス失敗 (HTTP ${HTTP_STATUS})"
    failed=$((failed + 1))
fi

