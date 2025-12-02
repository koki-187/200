#!/bin/bash
# Production API Test Script for v3.93.0

PROD_URL="https://96a4227a.real-estate-200units-v2.pages.dev"
PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "Production API Test - v3.93.0"
echo "URL: $PROD_URL"
echo "========================================"
echo ""

# Function to test API
test_api() {
  local name="$1"
  local url="$2"
  local expected_key="$3"
  
  TOTAL=$((TOTAL + 1))
  echo -n "Testing: $name ... "
  
  response=$(curl -s "$url")
  
  if echo "$response" | jq -e ".$expected_key" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Response (first 200 chars): ${response:0:200}"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Function to test API with data count
test_api_count() {
  local name="$1"
  local url="$2"
  local min_count="$3"
  
  TOTAL=$((TOTAL + 1))
  echo -n "Testing: $name ... "
  
  response=$(curl -s "$url")
  count=$(echo "$response" | jq -r '.data.count // 0')
  
  if [ "$count" -ge "$min_count" ]; then
    echo -e "${GREEN}✓ PASS${NC} (count: $count)"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (count: $count, expected >= $min_count)"
    echo "  Response (first 200 chars): ${response:0:200}"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

echo "=== 1. Core APIs ==="
test_api "Health Check" "$PROD_URL/api/health" "status"
test_api "Debug Environment" "$PROD_URL/api/debug/env" "has_DB"

echo ""
echo "=== 2. Municipal Regulations APIs (Tokyo 23 Wards) ==="
test_api_count "Minato-ku (港区)" "$PROD_URL/api/building-regulations/municipal?location=%E6%B8%AF%E5%8C%BA" 2
test_api_count "Shibuya-ku (渋谷区)" "$PROD_URL/api/building-regulations/municipal?location=%E6%B8%8B%E8%B0%B7%E5%8C%BA" 2
test_api_count "Shinjuku-ku (新宿区)" "$PROD_URL/api/building-regulations/municipal?location=%E6%96%B0%E5%AE%BF%E5%8C%BA" 2

echo ""
echo "=== 3. Municipal Regulations APIs (Designated Cities) ==="
test_api_count "Yokohama City (横浜市)" "$PROD_URL/api/building-regulations/municipal?location=%E6%A8%AA%E6%B5%9C%E5%B8%82" 4
test_api_count "Kawasaki City (川崎市)" "$PROD_URL/api/building-regulations/municipal?location=%E5%B7%9D%E5%B4%8E%E5%B8%82" 3
test_api_count "Saitama City (さいたま市)" "$PROD_URL/api/building-regulations/municipal?location=%E3%81%95%E3%81%84%E3%81%9F%E3%81%BE%E5%B8%82" 3
test_api_count "Chiba City (千葉市)" "$PROD_URL/api/building-regulations/municipal?location=%E5%8D%83%E8%91%89%E5%B8%82" 4
test_api_count "Nagoya City (名古屋市)" "$PROD_URL/api/building-regulations/municipal?location=%E5%90%8D%E5%8F%A4%E5%B1%8B%E5%B8%82" 4

echo ""
echo "=== 4. Comprehensive Building Regulations Check ==="
echo -n "Testing: Yokohama Comprehensive Check ... "
TOTAL=$((TOTAL + 1))
check_response=$(curl -s -X POST "$PROD_URL/api/building-regulations/check" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "横浜市",
    "zoning": "第一種住居地域",
    "fire_zone": "準防火地域",
    "height_district": "第3種高度地区",
    "current_status": "更地",
    "structure": "木造",
    "floors": "3"
  }')

national_count=$(echo "$check_response" | jq -r '.data.applicable_regulations | length')
municipal_count=$(echo "$check_response" | jq -r '.data.municipal_regulations | length')

if [ "$national_count" -ge 3 ] && [ "$municipal_count" -ge 4 ]; then
  echo -e "${GREEN}✓ PASS${NC} (national: $national_count, municipal: $municipal_count)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC} (national: $national_count, municipal: $municipal_count)"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "=== 5. Parking Requirements by Prefecture ==="
test_api "Tokyo Parking Requirements" "$PROD_URL/api/building-regulations/parking/東京都" "success"
test_api "Kanagawa Parking Requirements" "$PROD_URL/api/building-regulations/parking/神奈川県" "success"

echo ""
echo "=== 6. Parking Details for Major Cities ==="
echo -n "Testing: Yokohama Parking Details ... "
TOTAL=$((TOTAL + 1))
yokohama_parking=$(curl -s "$PROD_URL/api/building-regulations/municipal?location=横浜市")
parking_details=$(echo "$yokohama_parking" | jq -r '.data.regulations[] | select(.category == "PARKING") | .parking_details')

if [ "$parking_details" != "null" ] && [ -n "$parking_details" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "========================================"
echo "Test Results Summary"
echo "========================================"
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $FAILED${NC}"
else
  echo "Failed: 0"
fi

SUCCESS_RATE=$((PASSED * 100 / TOTAL))
echo "Success Rate: $SUCCESS_RATE%"
echo "========================================"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
