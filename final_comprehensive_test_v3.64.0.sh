#!/bin/bash

URL="https://545f07c9.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "Final Comprehensive Test v3.64.0"
echo "=========================================="
echo "Production URL: $URL"
echo "Date: $(date -u +"%Y/%m/%d %H:%M UTC")"
echo ""

# Initialize counters
TOTAL=0
PASSED=0
FAILED=0

# Helper function
run_test() {
  local test_name="$1"
  local test_cmd="$2"
  local expected="$3"
  
  TOTAL=$((TOTAL + 1))
  
  result=$(eval "$test_cmd" 2>&1)
  
  if echo "$result" | grep -q "$expected"; then
    PASSED=$((PASSED + 1))
    echo "✅ PASS: $test_name"
  else
    FAILED=$((FAILED + 1))
    echo "❌ FAIL: $test_name"
  fi
}

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed - Cannot continue tests"
  exit 1
fi

echo "✅ Authentication successful"
echo ""

# Core Features
echo "=== Core System Tests ==="
run_test "Health Check" \
  "curl -s $URL/api/health" \
  "status.*ok"

run_test "KPI Dashboard" \
  "curl -s $URL/api/analytics/kpi/dashboard -H \"Authorization: Bearer $TOKEN\"" \
  "deals"

# Advanced Analytics (v3.63.0)
echo ""
echo "=== Advanced Analytics Tests ==="
run_test "Agent Performance" \
  "curl -s $URL/api/analytics/kpi/agents -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

run_test "Area Statistics" \
  "curl -s $URL/api/analytics/kpi/areas -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

run_test "Detailed Trends" \
  "curl -s \"$URL/api/analytics/kpi/trends/detailed?period=30\" -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

run_test "Matching Analysis" \
  "curl -s $URL/api/analytics/kpi/matching -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

# Data Export (v3.64.0)
echo ""
echo "=== Data Export Tests ==="
run_test "Deal Export (JSON)" \
  "curl -s \"$URL/api/analytics/export/deals\" -H \"Authorization: Bearer $TOKEN\"" \
  "deals"

run_test "Deal Export (CSV)" \
  "curl -s \"$URL/api/analytics/export/deals?format=csv\" -H \"Authorization: Bearer $TOKEN\"" \
  "タイトル"

run_test "KPI Report Export" \
  "curl -s \"$URL/api/analytics/export/kpi-report?period=30\" -H \"Authorization: Bearer $TOKEN\"" \
  "KPIレポート"

run_test "Monthly Report Export" \
  "curl -s \"$URL/api/analytics/export/monthly-report?year=2024&month=11\" -H \"Authorization: Bearer $TOKEN\"" \
  "月次レポート"

# REINFOLIB Expansion (v3.64.0)
echo ""
echo "=== REINFOLIB Expansion Tests ==="
run_test "Tokyo Address Parse" \
  "curl -s \"$URL/api/reinfolib/test-parse?address=東京都千代田区\" -H \"Authorization: Bearer $TOKEN\"" \
  "13101"

run_test "Chiba Address Parse" \
  "curl -s \"$URL/api/reinfolib/test-parse?address=千葉県千葉市\" -H \"Authorization: Bearer $TOKEN\"" \
  "12100"

run_test "Kanagawa Address Parse" \
  "curl -s \"$URL/api/reinfolib/test-parse?address=神奈川県横浜市\" -H \"Authorization: Bearer $TOKEN\"" \
  "14100"

# Notification System
echo ""
echo "=== Notification System Tests ==="
run_test "Notifications List" \
  "curl -s $URL/api/notifications -H \"Authorization: Bearer $TOKEN\"" \
  "unreadCount"

# Deal Management
echo ""
echo "=== Deal Management Tests ==="
DEAL_LIST=$(curl -s "$URL/api/deals?page=1&limit=20" -H "Authorization: Bearer $TOKEN")
DEAL_COUNT=$(echo "$DEAL_LIST" | jq '.deals | length')
TOTAL=$((TOTAL + 1))
if [ "$DEAL_COUNT" -gt 0 ]; then
  PASSED=$((PASSED + 1))
  echo "✅ PASS: Deal List ($DEAL_COUNT deals)"
else
  FAILED=$((FAILED + 1))
  echo "❌ FAIL: Deal List (0 deals)"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Final Test Summary v3.64.0"
echo "=========================================="
echo "Total Tests: $TOTAL"
echo "✅ Passed: $PASSED ($((PASSED * 100 / TOTAL))%)"
echo "❌ Failed: $FAILED"
echo ""
echo "Success Rate: $((PASSED * 100 / TOTAL))%"
echo "=========================================="
