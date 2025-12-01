#!/bin/bash

# 全機能テストスクリプト
# v3.66.0 完全機能テスト

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0
WARNINGS=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  200Units Management System"
echo "  Complete Feature Test Suite"
echo "  Date: $(date)"
echo "========================================="
echo ""

# Login and get token
echo "=== Phase 1: Authentication ==="
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ CRITICAL: Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
else
  echo -e "${GREEN}✅ Test 1: Login successful${NC}"
  ((PASSED++))
fi

# Test 2: Health check
echo -e "\n=== Phase 2: System Health ==="
HEALTH=$(curl -s $BASE_URL/api/health | jq -r '.status')
if [ "$HEALTH" = "ok" ]; then
  echo -e "${GREEN}✅ Test 2: Health check OK${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ Test 2: Health check failed${NC}"
  ((FAILED++))
fi

# Test 3: Get deals
echo -e "\n=== Phase 3: Core Features - Deals Management ==="
DEALS_RESPONSE=$(curl -s $BASE_URL/api/deals -H "Authorization: Bearer $TOKEN")
DEALS_COUNT=$(echo $DEALS_RESPONSE | jq -r '.deals | length')
if [ "$DEALS_COUNT" != "null" ]; then
  echo -e "${GREEN}✅ Test 3: Get deals ($DEALS_COUNT deals)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ Test 3: Get deals failed${NC}"
  ((FAILED++))
fi

# Test 4: Get first deal details
if [ "$DEALS_COUNT" -gt 0 ]; then
  FIRST_DEAL_ID=$(echo $DEALS_RESPONSE | jq -r '.deals[0].id')
  DEAL_DETAIL=$(curl -s $BASE_URL/api/deals/$FIRST_DEAL_ID -H "Authorization: Bearer $TOKEN")
  DEAL_TITLE=$(echo $DEAL_DETAIL | jq -r '.title')
  if [ "$DEAL_TITLE" != "null" ] && [ -n "$DEAL_TITLE" ]; then
    echo -e "${GREEN}✅ Test 4: Get deal details (${DEAL_TITLE:0:30}...)${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ Test 4: Get deal details failed${NC}"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Test 4: Skipped (no deals)${NC}"
  ((WARNINGS++))
fi

# Test 5: Notifications
echo -e "\n=== Phase 4: Notification System ==="
NOTIF_RESPONSE=$(curl -s $BASE_URL/api/notifications -H "Authorization: Bearer $TOKEN")
NOTIF_COUNT=$(echo $NOTIF_RESPONSE | jq -r '.notifications | length')
if [ "$NOTIF_COUNT" != "null" ]; then
  echo -e "${GREEN}✅ Test 5: Get notifications ($NOTIF_COUNT notifications)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ Test 5: Get notifications failed${NC}"
  ((FAILED++))
fi

# Test 6: Settings
echo -e "\n=== Phase 5: System Settings ==="
SETTINGS_RESPONSE=$(curl -s $BASE_URL/api/settings -H "Authorization: Bearer $TOKEN")
SETTINGS_COUNT=$(echo $SETTINGS_RESPONSE | jq -r 'keys | length')
if [ "$SETTINGS_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Test 6: Get settings ($SETTINGS_COUNT settings)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ Test 6: Get settings failed${NC}"
  ((FAILED++))
fi

# Test 7: Building Regulations API (v3.65.0)
echo -e "\n=== Phase 6: v3.65.0+ Features ==="
BUILD_REG_RESPONSE=$(curl -s "$BASE_URL/api/building-regulations/check?location=東京都渋谷区&zoning=第一種住居地域&fire_zone=準防火地域&current_status=集合住宅" \
  -H "Authorization: Bearer $TOKEN")
BUILD_REG_SUCCESS=$(echo $BUILD_REG_RESPONSE | jq -r '.success')
if [ "$BUILD_REG_SUCCESS" = "true" ]; then
  BUILD_REG_COUNT=$(echo $BUILD_REG_RESPONSE | jq -r '.applicable_regulations | length')
  echo -e "${GREEN}✅ Test 7: Building regulations API ($BUILD_REG_COUNT regulations)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ Test 7: Building regulations API failed${NC}"
  echo "Response: $BUILD_REG_RESPONSE"
  ((FAILED++))
fi

# Test 8: Purchase Criteria Check
if [ -n "$FIRST_DEAL_ID" ] && [ "$FIRST_DEAL_ID" != "null" ]; then
  PURCHASE_CHECK_RESPONSE=$(curl -s "$BASE_URL/api/purchase-criteria/check/$FIRST_DEAL_ID" \
    -H "Authorization: Bearer $TOKEN")
  PURCHASE_RESULT=$(echo $PURCHASE_CHECK_RESPONSE | jq -r '.overall_result')
  if [ "$PURCHASE_RESULT" != "null" ] && [ -n "$PURCHASE_RESULT" ]; then
    PURCHASE_SCORE=$(echo $PURCHASE_CHECK_RESPONSE | jq -r '.check_score')
    echo -e "${GREEN}✅ Test 8: Purchase criteria check ($PURCHASE_RESULT, score: $PURCHASE_SCORE)${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ Test 8: Purchase criteria check failed${NC}"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Test 8: Skipped (no deal ID)${NC}"
  ((WARNINGS++))
fi

# Test 9: Special Cases List
SPECIAL_CASES_RESPONSE=$(curl -s $BASE_URL/api/purchase-criteria/special-cases \
  -H "Authorization: Bearer $TOKEN")
SPECIAL_CASES_COUNT=$(echo $SPECIAL_CASES_RESPONSE | jq -r '.special_cases | length')
if [ "$SPECIAL_CASES_COUNT" != "null" ]; then
  echo -e "${GREEN}✅ Test 9: Special cases list ($SPECIAL_CASES_COUNT cases)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ Test 9: Special cases list failed${NC}"
  ((FAILED++))
fi

# Test 10: Analytics KPI Dashboard
echo -e "\n=== Phase 7: Analytics & Reporting ==="
KPI_RESPONSE=$(curl -s $BASE_URL/api/analytics/kpi/dashboard \
  -H "Authorization: Bearer $TOKEN")
KPI_TOTAL_DEALS=$(echo $KPI_RESPONSE | jq -r '.totalDeals')
if [ "$KPI_TOTAL_DEALS" != "null" ]; then
  echo -e "${GREEN}✅ Test 10: KPI Dashboard (Total deals: $KPI_TOTAL_DEALS)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ Test 10: KPI Dashboard failed${NC}"
  echo "Response: $KPI_RESPONSE"
  ((FAILED++))
fi

# Test 11: Messages API
echo -e "\n=== Phase 8: Communication Features ==="
if [ -n "$FIRST_DEAL_ID" ] && [ "$FIRST_DEAL_ID" != "null" ]; then
  MESSAGES_RESPONSE=$(curl -s "$BASE_URL/api/messages?deal_id=$FIRST_DEAL_ID" \
    -H "Authorization: Bearer $TOKEN")
  MESSAGES_COUNT=$(echo $MESSAGES_RESPONSE | jq -r '.messages | length')
  if [ "$MESSAGES_COUNT" != "null" ]; then
    echo -e "${GREEN}✅ Test 11: Messages API ($MESSAGES_COUNT messages)${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ Test 11: Messages API failed${NC}"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Test 11: Skipped (no deal ID)${NC}"
  ((WARNINGS++))
fi

# Test 12: Files API
if [ -n "$FIRST_DEAL_ID" ] && [ "$FIRST_DEAL_ID" != "null" ]; then
  FILES_RESPONSE=$(curl -s "$BASE_URL/api/files?deal_id=$FIRST_DEAL_ID" \
    -H "Authorization: Bearer $TOKEN")
  FILES_COUNT=$(echo $FILES_RESPONSE | jq -r '.files | length')
  if [ "$FILES_COUNT" != "null" ]; then
    echo -e "${GREEN}✅ Test 12: Files API ($FILES_COUNT files)${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ Test 12: Files API failed${NC}"
    echo "Response: $FILES_RESPONSE"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Test 12: Skipped (no deal ID)${NC}"
  ((WARNINGS++))
fi

# Test 13: Proposals API
if [ -n "$FIRST_DEAL_ID" ] && [ "$FIRST_DEAL_ID" != "null" ]; then
  PROPOSALS_RESPONSE=$(curl -s "$BASE_URL/api/proposals?deal_id=$FIRST_DEAL_ID" \
    -H "Authorization: Bearer $TOKEN")
  PROPOSALS_COUNT=$(echo $PROPOSALS_RESPONSE | jq -r '.proposals | length')
  if [ "$PROPOSALS_COUNT" != "null" ]; then
    echo -e "${GREEN}✅ Test 13: Proposals API ($PROPOSALS_COUNT proposals)${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ Test 13: Proposals API failed${NC}"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Test 13: Skipped (no deal ID)${NC}"
  ((WARNINGS++))
fi

# Test 14: OCR History
echo -e "\n=== Phase 9: OCR & Document Processing ==="
OCR_HISTORY_RESPONSE=$(curl -s $BASE_URL/api/ocr-history \
  -H "Authorization: Bearer $TOKEN")
OCR_HISTORY_COUNT=$(echo $OCR_HISTORY_RESPONSE | jq -r '.history | length')
if [ "$OCR_HISTORY_COUNT" != "null" ]; then
  echo -e "${GREEN}✅ Test 14: OCR History ($OCR_HISTORY_COUNT records)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ Test 14: OCR History failed${NC}"
  ((FAILED++))
fi

# Test 15: Property Templates
TEMPLATES_RESPONSE=$(curl -s $BASE_URL/api/property-templates \
  -H "Authorization: Bearer $TOKEN")
TEMPLATES_COUNT=$(echo $TEMPLATES_RESPONSE | jq -r '.templates | length')
if [ "$TEMPLATES_COUNT" != "null" ]; then
  echo -e "${GREEN}✅ Test 15: Property Templates ($TEMPLATES_COUNT templates)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ Test 15: Property Templates failed${NC}"
  ((FAILED++))
fi

# Summary
echo ""
echo "========================================="
echo "  TEST SUMMARY"
echo "========================================="
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo "Total:   $((PASSED + FAILED + WARNINGS))"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
  SUCCESS_RATE=$(( (PASSED * 100) / TOTAL ))
  echo "Success Rate: ${SUCCESS_RATE}%"
fi

echo "========================================="

# Exit code
if [ $FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi
