#!/bin/bash

# v3.96.0 新機能テスト
BASE_URL="http://localhost:3000"

echo "========================================="
echo "v3.96.0 新機能テスト"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Test 1: Health Check
echo "✅ Test 1: Health Check"
RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo "   ✅ PASS"
else
  echo "   ❌ FAIL"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 2: ユーザー一覧API（管理者向け）- 認証なしでテスト
echo "✅ Test 2: ユーザー一覧API（GET /api/users）"
RESPONSE=$(curl -s "$BASE_URL/api/users" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ PASS (認証が必要 - 期待通り)"
else
  echo "   ⚠️  認証なしでアクセス可能（HTTP $HTTP_CODE）"
fi
echo ""

# Test 3: 融資制限条件チェックAPI - 認証なしでテスト
echo "✅ Test 3: 融資制限条件チェックAPI"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/check-financing-restrictions?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ PASS (認証が必要 - 期待通り)"
else
  echo "   ⚠️  認証なしでアクセス可能（HTTP $HTTP_CODE）"
  BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
  if echo "$BODY" | grep -q 'financing_available\|restrictions\|requires_manual_check'; then
    echo "   ✅ レスポンス形式は正常"
  fi
fi
echo ""

# Test 4: ハザード情報API - 認証なしでテスト
echo "✅ Test 4: ハザード情報API"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/hazard-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ PASS (認証が必要 - 期待通り)"
else
  echo "   ⚠️  認証なしでアクセス可能（HTTP $HTTP_CODE）"
fi
echo ""

echo "========================================="
echo "テスト完了"
echo "========================================="
