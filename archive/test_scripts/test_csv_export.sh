#!/bin/bash

BASE_URL="http://localhost:3000"

echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

echo "📊 Testing CSV export endpoints..."
echo ""

# Test 1: Deals CSV export
echo "1. Deals CSV Export"
CSV_DEALS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/analytics/export/deals/csv")
DEALS_LINE_COUNT=$(echo "$CSV_DEALS" | wc -l)
echo "   Lines: $DEALS_LINE_COUNT"
if [ $DEALS_LINE_COUNT -gt 1 ]; then
  echo "   ✅ PASS: Deals CSV export (header + data)"
else
  echo "   ❌ FAIL: No data exported"
fi
echo ""

# Test 2: KPI CSV export
echo "2. KPI Summary CSV Export"
CSV_KPI=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/analytics/export/kpi/csv")
KPI_LINE_COUNT=$(echo "$CSV_KPI" | wc -l)
echo "   Lines: $KPI_LINE_COUNT"
if [ $KPI_LINE_COUNT -gt 5 ]; then
  echo "   ✅ PASS: KPI CSV export (report data)"
else
  echo "   ❌ FAIL: Insufficient data"
fi
echo ""

echo "🎉 CSV Export Test Complete"
