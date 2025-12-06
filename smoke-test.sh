#!/bin/bash

# Smoke Test Script for v3.149.1
# テストURL
BASE_URL="https://real-estate-200units-v2.pages.dev"

echo "========================================="
echo "スモークテスト開始: $BASE_URL"
echo "========================================="
echo ""

# 色付きログ用関数
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local method=$1
    local path=$2
    local expected_status=$3
    local description=$4
    
    echo -n "Testing: $description ... "
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
    fi
    
    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $response)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# テストカウンター
FAILED_TESTS=0

echo "【1. 基本エンドポイント】"
test_endpoint "GET" "/" "200" "Root page"
test_endpoint "GET" "/api/health" "200" "Health check"
test_endpoint "GET" "/api/reinfolib/test" "200" "REINFOLIB test endpoint"
echo ""

echo "【2. 認証エンドポイント】"
test_endpoint "GET" "/api/auth/check" "401" "Auth check (unauthorized)"
echo ""

echo "【3. 静的リソース】"
test_endpoint "GET" "/static/ocr-init.js?v=3.149.0" "200" "OCR init script"
test_endpoint "GET" "/static/deals-new-events.js?v=3.149.0" "200" "Deals new events script"
echo ""

echo "========================================="
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 全てのテストに合格しました！${NC}"
else
    echo -e "${RED}✗ $FAILED_TESTS 個のテストが失敗しました${NC}"
fi
echo "========================================="

exit $FAILED_TESTS
