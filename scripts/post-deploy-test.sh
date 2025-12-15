#!/bin/bash

# デプロイ後テストスクリプト
# デプロイ完了後に自動的に実行して、すべての機能が正常動作することを確認

set -e

# デプロイURLを引数から取得（または環境変数から）
DEPLOY_URL="${1:-https://20c655ab.real-estate-200units-v2.pages.dev}"

echo "🧪 Running post-deployment tests for: $DEPLOY_URL"
echo ""

# テスト結果を記録
PASSED=0
FAILED=0

# テスト1: Health Check
echo "Test 1: Health Check API"
HEALTH_RESPONSE=$(curl -s "$DEPLOY_URL/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
  echo "✅ PASSED: Health Check returned 'healthy'"
  ((PASSED++))
else
  echo "❌ FAILED: Health Check did not return 'healthy'"
  echo "Response: $HEALTH_RESPONSE"
  ((FAILED++))
fi
echo ""

# テスト2: OpenAI API（OCR機能）
echo "Test 2: OpenAI API (OCR function)"
OCR_RESPONSE=$(curl -s "$DEPLOY_URL/api/ocr-jobs/test-openai")
if echo "$OCR_RESPONSE" | grep -q '"success":true'; then
  echo "✅ PASSED: OCR API is working"
  ((PASSED++))
else
  echo "❌ FAILED: OCR API is not working"
  echo "Response: $OCR_RESPONSE"
  ((FAILED++))
fi
echo ""

# テスト3: MLIT API（物件情報補足）
echo "Test 3: MLIT API (Property Info)"
MLIT_RESPONSE=$(curl -s "$DEPLOY_URL/api/reinfolib/test")
if echo "$MLIT_RESPONSE" | grep -q '"success":true'; then
  echo "✅ PASSED: MLIT API is working"
  ((PASSED++))
else
  echo "❌ FAILED: MLIT API is not working"
  echo "Response: $MLIT_RESPONSE"
  ((FAILED++))
fi
echo ""

# テスト4: 管理者ダッシュボード
echo "Test 4: Admin Dashboard"
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/admin")
if [ "$ADMIN_RESPONSE" = "200" ]; then
  echo "✅ PASSED: Admin Dashboard is accessible (HTTP $ADMIN_RESPONSE)"
  ((PASSED++))
else
  echo "❌ FAILED: Admin Dashboard returned HTTP $ADMIN_RESPONSE"
  ((FAILED++))
fi
echo ""

# テスト5: ログインページ
echo "Test 5: Login Page"
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/")
if [ "$LOGIN_RESPONSE" = "200" ]; then
  echo "✅ PASSED: Login Page is accessible (HTTP $LOGIN_RESPONSE)"
  ((PASSED++))
else
  echo "❌ FAILED: Login Page returned HTTP $LOGIN_RESPONSE"
  ((FAILED++))
fi
echo ""

# 結果サマリー
echo "═══════════════════════════════════════════"
echo "Test Results Summary"
echo "═══════════════════════════════════════════"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All tests passed! Deployment is successful."
  exit 0
else
  echo "⚠️  Some tests failed. Please investigate and fix the issues."
  echo ""
  echo "Troubleshooting steps:"
  echo "1. Check environment variables: npx wrangler pages secret list --project-name real-estate-200units-v2"
  echo "2. Verify API keys are valid"
  echo "3. Check Health Check response: curl $DEPLOY_URL/api/health | jq ."
  exit 1
fi
