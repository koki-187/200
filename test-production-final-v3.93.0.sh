#!/bin/bash
# Final Production API Test Script for v3.93.0

PROD_URL="https://4d428030.real-estate-200units-v2.pages.dev"
PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "Production API Test - v3.93.0 Final"
echo "URL: $PROD_URL"
echo "========================================"

test_api() {
  TOTAL=$((TOTAL + 1))
  echo -n "Testing: $1 ... "
  response=$(curl -s "$2")
  if echo "$response" | jq -e ".$3" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED=$((FAILED + 1))
  fi
}

test_api_count() {
  TOTAL=$((TOTAL + 1))
  echo -n "Testing: $1 ... "
  response=$(curl -s "$2")
  count=$(echo "$response" | jq -r '.data.count // 0')
  if [ "$count" -ge "$3" ]; then
    echo -e "${GREEN}✓ PASS${NC} (count: $count)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED=$((FAILED + 1))
  fi
}

echo ""
echo "=== 1. Core APIs ==="
test_api "Health Check" "$PROD_URL/api/health" "status"
test_api "Debug Environment" "$PROD_URL/api/debug/env" "has_DB"
test_api "OPENAI_API_KEY Configured" "$PROD_URL/api/debug/env" "has_OPENAI_API_KEY"

echo ""
echo "=== 2. Tokyo 23 Wards ==="
test_api_count "港区" "$PROD_URL/api/building-regulations/municipal?location=%E6%B8%AF%E5%8C%BA" 2
test_api_count "渋谷区" "$PROD_URL/api/building-regulations/municipal?location=%E6%B8%8B%E8%B0%B7%E5%8C%BA" 2
test_api_count "新宿区" "$PROD_URL/api/building-regulations/municipal?location=%E6%96%B0%E5%AE%BF%E5%8C%BA" 2

echo ""
echo "=== 3. Designated Cities ==="
test_api_count "横浜市" "$PROD_URL/api/building-regulations/municipal?location=%E6%A8%AA%E6%B5%9C%E5%B8%82" 4
test_api_count "川崎市" "$PROD_URL/api/building-regulations/municipal?location=%E5%B7%9D%E5%B4%8E%E5%B8%82" 3
test_api_count "さいたま市" "$PROD_URL/api/building-regulations/municipal?location=%E3%81%95%E3%81%84%E3%81%9F%E3%81%BE%E5%B8%82" 3
test_api_count "千葉市" "$PROD_URL/api/building-regulations/municipal?location=%E5%8D%83%E8%91%89%E5%B8%82" 4
test_api_count "名古屋市" "$PROD_URL/api/building-regulations/municipal?location=%E5%90%8D%E5%8F%A4%E5%B1%8B%E5%B8%82" 4

echo ""
echo "=== 4. Parking Requirements ==="
test_api "東京都" "$PROD_URL/api/building-regulations/parking/%E6%9D%B1%E4%BA%AC%E9%83%BD" "success"
test_api "神奈川県" "$PROD_URL/api/building-regulations/parking/%E7%A5%9E%E5%A5%88%E5%B7%9D%E7%9C%8C" "success"

echo ""
echo "=== 5. Comprehensive Check ==="
TOTAL=$((TOTAL + 1))
echo -n "Testing: Yokohama Comprehensive Check ... "
check_response=$(curl -s -X POST "$PROD_URL/api/building-regulations/check" \
  -H "Content-Type: application/json" \
  -d '{"location":"横浜市","zoning":"第一種住居地域","fire_zone":"準防火地域","height_district":"第3種高度地区","current_status":"更地","structure":"木造","floors":"3"}')

national_count=$(echo "$check_response" | jq -r '.data.applicable_regulations | length')
municipal_count=$(echo "$check_response" | jq -r '.data.municipal_regulations | length')

if [ "$national_count" -ge 3 ] && [ "$municipal_count" -ge 4 ]; then
  echo -e "${GREEN}✓ PASS${NC} (national: $national_count, municipal: $municipal_count)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "========================================"
echo "Total: $TOTAL | Passed: $PASSED | Failed: $FAILED"
echo "Success Rate: $((PASSED * 100 / TOTAL))%"
echo "========================================"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
