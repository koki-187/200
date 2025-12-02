#!/bin/bash

# 本番環境ログインテスト（パスワードリセット後）
BASE_URL="https://cf7da3bd.real-estate-200units-v2.pages.dev"

echo "========================================="
echo "本番環境ログインテスト (v3.95.0)"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Test 1: 管理者ログイン
echo "✅ Test 1: 管理者ログイン (admin@200units.com)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo "   ✅ ログイン成功"
  TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   Token: ${TOKEN:0:40}..."
else
  echo "   ❌ ログイン失敗"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 2: 担当者ログイン
echo "✅ Test 2: 担当者ログイン (agent@200units.com)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@200units.com","password":"Test1234!"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo "   ✅ ログイン成功"
  AGENT_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   Token: ${AGENT_TOKEN:0:40}..."
else
  echo "   ❌ ログイン失敗"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 3: 売主ログイン
echo "✅ Test 3: 売主ログイン (seller1@example.com)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"seller1@example.com","password":"Test1234!"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo "   ✅ ログイン成功"
  SELLER_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   Token: ${SELLER_TOKEN:0:40}..."
else
  echo "   ❌ ログイン失敗"
  echo "   Response: $RESPONSE"
fi
echo ""

echo "========================================="
echo "テスト完了"
echo "========================================="
