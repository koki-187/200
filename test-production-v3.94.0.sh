#!/bin/bash

BASE_URL="https://cf7da3bd.real-estate-200units-v2.pages.dev"

echo "========================================="
echo "Production API Test - v3.94.0"
echo "========================================="
echo "Testing URL: $BASE_URL"
echo ""

# テストカウンター
TOTAL_TESTS=0
PASSED_TESTS=0

# ヘルパー関数
test_api() {
  local name="$1"
  local url="$2"
  local expected_pattern="$3"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -n "Testing: $name ... "
  
  RESPONSE=$(curl -s "$url")
  
  if echo "$RESPONSE" | grep -q "$expected_pattern"; then
    echo -e "\033[0;32m✓ PASS\033[0m"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "\033[0;31m✗ FAIL\033[0m"
    echo "  Expected pattern: $expected_pattern"
    echo "  Got: $RESPONSE" | head -c 200
  fi
}

echo "=== 1. Core APIs ==="
test_api "Health Check" "$BASE_URL/api/health" '"status":"ok"'

echo ""
echo "=== 2. 不動産情報ライブラリAPI （NEW） ==="
test_api "REINFOLIB Test Endpoint" "$BASE_URL/api/reinfolib/test" '"success":true'
test_api "REINFOLIB Simple Test" "$BASE_URL/api/reinfolib/test-simple" '"status":"ok"'

echo ""
echo "=== 3. Municipal Regulations APIs (Tokyo 23 Wards) ==="
test_api "Minato-ku (港区)" "$BASE_URL/api/building-regulations/municipal?location=%E6%B8%AF%E5%8C%BA" "DISPUTE_PREVENTION"
test_api "Shibuya-ku (渋谷区)" "$BASE_URL/api/building-regulations/municipal?location=%E6%B8%8B%E8%B0%B7%E5%8C%BA" "DISPUTE_PREVENTION"
test_api "Shinjuku-ku (新宿区)" "$BASE_URL/api/building-regulations/municipal?location=%E6%96%B0%E5%AE%BF%E5%8C%BA" "DISPUTE_PREVENTION"

echo ""
echo "=== 4. Municipal Regulations APIs (Designated Cities) ==="
test_api "Yokohama City (横浜市)" "$BASE_URL/api/building-regulations/municipal?location=%E6%A8%AA%E6%B5%9C%E5%B8%82" "DISPUTE_PREVENTION"
test_api "Kawasaki City (川崎市)" "$BASE_URL/api/building-regulations/municipal?location=%E5%B7%9D%E5%B4%8E%E5%B8%82" "DISPUTE_PREVENTION"
test_api "Saitama City (さいたま市)" "$BASE_URL/api/building-regulations/municipal?location=%E3%81%95%E3%81%84%E3%81%9F%E3%81%BE%E5%B8%82" "DISPUTE_PREVENTION"
test_api "Chiba City (千葉市)" "$BASE_URL/api/building-regulations/municipal?location=%E5%8D%83%E8%91%89%E5%B8%82" "DISPUTE_PREVENTION"
test_api "Nagoya City (名古屋市)" "$BASE_URL/api/building-regulations/municipal?location=%E5%90%8D%E5%8F%A4%E5%B1%8B%E5%B8%82" "DISPUTE_PREVENTION"

echo ""
echo "=== 5. Parking Requirements ==="
test_api "Tokyo Parking" "$BASE_URL/api/building-regulations/parking/%E6%9D%B1%E4%BA%AC%E9%83%BD" "units_per_parking"
test_api "Kanagawa Parking" "$BASE_URL/api/building-regulations/parking/%E7%A5%9E%E5%A5%88%E5%B7%9D%E7%9C%8C" "units_per_parking"

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "\033[0;32mPassed: $PASSED_TESTS\033[0m"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS))"
echo "Success Rate: $((PASSED_TESTS * 100 / TOTAL_TESTS))%"
echo "========================================="

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
  echo -e "\033[0;32mAll tests passed! ✓\033[0m"
  exit 0
else
  echo -e "\033[0;31mSome tests failed ✗\033[0m"
  exit 1
fi
