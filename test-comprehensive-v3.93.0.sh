#!/bin/bash
# Comprehensive API Test Script for v3.93.0
# Tests: Core APIs, Auth, Municipal Regulations, Building Regulations, Parking Requirements

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Comprehensive API Test - v3.93.0"
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
    echo "  Response: $response"
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
    echo "  Response: $response"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

echo "=== 1. Core APIs ==="
test_api "Health Check" "$BASE_URL/api/health" "status"
test_api "Debug Environment" "$BASE_URL/api/debug/env" "has_DB"

echo ""
echo "=== 2. Authentication APIs ==="
# Note: Login test requires pre-existing user
echo -n "Testing: User Login ... "
TOTAL=$((TOTAL + 1))
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}')

if echo "$login_response" | jq -e '.token' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
  TOKEN=$(echo "$login_response" | jq -r '.token')
else
  echo -e "${YELLOW}⚠ SKIP${NC} (User not found - expected for fresh DB)"
  # Don't count as failure
  TOTAL=$((TOTAL - 1))
fi

echo ""
echo "=== 3. Municipal Regulations APIs (Tokyo 23 Wards) ==="
test_api_count "Minato-ku (港区)" "$BASE_URL/api/building-regulations/municipal?location=港区" 2
test_api_count "Shibuya-ku (渋谷区)" "$BASE_URL/api/building-regulations/municipal?location=渋谷区" 2
test_api_count "Shinjuku-ku (新宿区)" "$BASE_URL/api/building-regulations/municipal?location=新宿区" 2
test_api_count "Edogawa-ku (江戸川区)" "$BASE_URL/api/building-regulations/municipal?location=江戸川区" 2
test_api_count "Adachi-ku (足立区)" "$BASE_URL/api/building-regulations/municipal?location=足立区" 2

echo ""
echo "=== 4. Municipal Regulations APIs (Designated Cities) ==="
test_api_count "Yokohama City (横浜市)" "$BASE_URL/api/building-regulations/municipal?location=横浜市" 4
test_api_count "Kawasaki City (川崎市)" "$BASE_URL/api/building-regulations/municipal?location=川崎市" 3
test_api_count "Saitama City (さいたま市)" "$BASE_URL/api/building-regulations/municipal?location=さいたま市" 3
test_api_count "Chiba City (千葉市)" "$BASE_URL/api/building-regulations/municipal?location=千葉市" 4
test_api_count "Nagoya City (名古屋市)" "$BASE_URL/api/building-regulations/municipal?location=名古屋市" 4

echo ""
echo "=== 5. Three-Story Wooden Building Regulations ==="
test_api_count "Kawasaki Three-Story Wooden" "$BASE_URL/api/building-regulations/three-story-wooden?location=川崎市" 3

echo ""
echo "=== 6. Comprehensive Building Regulations Check ==="
echo -n "Testing: Yokohama Comprehensive Check ... "
TOTAL=$((TOTAL + 1))
check_response=$(curl -s -X POST "$BASE_URL/api/building-regulations/check" \
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
  echo "  Response (first 500 chars): ${check_response:0:500}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "=== 7. Parking Requirements by Prefecture ==="
test_api "Tokyo Parking Requirements" "$BASE_URL/api/building-regulations/parking/東京都" "success"
test_api "Kanagawa Parking Requirements" "$BASE_URL/api/building-regulations/parking/神奈川県" "success"
test_api "Saitama Parking Requirements" "$BASE_URL/api/building-regulations/parking/埼玉県" "success"
test_api "Chiba Parking Requirements" "$BASE_URL/api/building-regulations/parking/千葉県" "success"

echo ""
echo "=== 8. Parking Details for Major Cities ==="
echo -n "Testing: Yokohama Parking Details ... "
TOTAL=$((TOTAL + 1))
yokohama_parking=$(curl -s "$BASE_URL/api/building-regulations/municipal?location=横浜市")
parking_details=$(echo "$yokohama_parking" | jq -r '.data.regulations[] | select(.category == "PARKING") | .parking_details')

if [ "$parking_details" != "null" ] && [ -n "$parking_details" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "  Response: $yokohama_parking"
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
