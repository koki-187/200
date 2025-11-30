#!/bin/bash

URL="https://5dcb9652.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "Final Comprehensive Test v3.65.0"
echo "=========================================="
echo "Production URL: $URL"
echo "Date: $(date -u +"%Y/%m/%d %H:%M UTC")"
echo ""

TOTAL=0
PASSED=0
FAILED=0

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
  echo "❌ Login failed"
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

# New Features (v3.65.0)
echo ""
echo "=== v3.65.0 New Features ==="

run_test "Login History Endpoint" \
  "curl -s $URL/api/auth/login-history -H \"Authorization: Bearer $TOKEN\"" \
  "history"

run_test "Login Failures Endpoint (Admin)" \
  "curl -s $URL/api/auth/login-failures -H \"Authorization: Bearer $TOKEN\"" \
  "failures"

run_test "Bulk Status Update API" \
  "curl -s -X POST \"$URL/api/deals/bulk/status\" \
    -H \"Authorization: Bearer $TOKEN\" \
    -H \"Content-Type: application/json\" \
    -d '{\"deal_ids\":[],\"status\":\"NEW\"}'" \
  "success"

# Advanced Analytics
echo ""
echo "=== Advanced Analytics ==="
run_test "Agent Performance" \
  "curl -s $URL/api/analytics/kpi/agents -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

run_test "Area Statistics" \
  "curl -s $URL/api/analytics/kpi/areas -H \"Authorization: Bearer $TOKEN\"" \
  "success.*true"

# Data Export
echo ""
echo "=== Data Export ==="
run_test "KPI Report Export" \
  "curl -s \"$URL/api/analytics/export/kpi-report?period=30\" -H \"Authorization: Bearer $TOKEN\"" \
  "KPIレポート"

# Notification System
echo ""
echo "=== Notification System ==="
run_test "Notifications" \
  "curl -s $URL/api/notifications -H \"Authorization: Bearer $TOKEN\"" \
  "unreadCount"

# Deal Management
echo ""
echo "=== Deal Management ==="
DEAL_LIST=$(curl -s "$URL/api/deals?page=1&limit=20" -H "Authorization: Bearer $TOKEN")
DEAL_COUNT=$(echo "$DEAL_LIST" | jq '.deals | length')
TOTAL=$((TOTAL + 1))
if [ "$DEAL_COUNT" -gt 0 ]; then
  PASSED=$((PASSED + 1))
  echo "✅ PASS: Deal List ($DEAL_COUNT deals)"
else
  FAILED=$((FAILED + 1))
  echo "❌ FAIL: Deal List"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Test Summary v3.65.0"
echo "=========================================="
echo "Total Tests: $TOTAL"
echo "✅ Passed: $PASSED ($((PASSED * 100 / TOTAL))%)"
echo "❌ Failed: $FAILED"
echo ""
echo "Success Rate: $((PASSED * 100 / TOTAL))%"
echo "=========================================="
