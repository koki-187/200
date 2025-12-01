#!/bin/bash

BASE_URL="https://e7fd7f62.real-estate-200units-v2.pages.dev"

echo "🔐 Logging in to production..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

echo "📊 Testing new CSV export endpoints..."
echo ""

# Test 1: Deals CSV export
echo "1. Deals CSV Export"
CSV_DEALS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/analytics/export/deals/csv")

HTTP_CODE=$(echo "$CSV_DEALS_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
CSV_DEALS=$(echo "$CSV_DEALS_RESPONSE" | sed '/HTTP_CODE:/d')

echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  DEALS_LINE_COUNT=$(echo "$CSV_DEALS" | wc -l)
  echo "   Lines: $DEALS_LINE_COUNT"
  echo "   First 3 lines:"
  echo "$CSV_DEALS" | head -3 | sed 's/^/     /'
  
  if [ $DEALS_LINE_COUNT -gt 1 ]; then
    echo "   ✅ PASS: Deals CSV export working"
  else
    echo "   ❌ FAIL: No data exported"
  fi
else
  echo "   ❌ FAIL: HTTP $HTTP_CODE"
  echo "   Response: $(echo "$CSV_DEALS" | head -5)"
fi
echo ""

# Test 2: KPI CSV export
echo "2. KPI Summary CSV Export"
CSV_KPI_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/analytics/export/kpi/csv")

HTTP_CODE=$(echo "$CSV_KPI_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
CSV_KPI=$(echo "$CSV_KPI_RESPONSE" | sed '/HTTP_CODE:/d')

echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  KPI_LINE_COUNT=$(echo "$CSV_KPI" | wc -l)
  echo "   Lines: $KPI_LINE_COUNT"
  echo "   First 5 lines:"
  echo "$CSV_KPI" | head -5 | sed 's/^/     /'
  
  if [ $KPI_LINE_COUNT -gt 5 ]; then
    echo "   ✅ PASS: KPI CSV export working"
  else
    echo "   ❌ FAIL: Insufficient data"
  fi
else
  echo "   ❌ FAIL: HTTP $HTTP_CODE"
  echo "   Response: $(echo "$CSV_KPI" | head -5)"
fi
echo ""

echo "🎉 CSV Export Test Complete"
