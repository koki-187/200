#!/bin/bash

BASE_URL="https://7725b697.real-estate-200units-v2.pages.dev"

echo "========================================="
echo "本番環境ログインテスト"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Test 1: 管理者ログイン
echo "Test 1: 管理者ログイン (admin@200units.com)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo "   ✅ ログイン成功"
else
  echo "   ❌ ログイン失敗"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 2: 担当者ログイン
echo "Test 2: 担当者ログイン (agent@200units.com)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@200units.com","password":"Test1234!"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo "   ✅ ログイン成功"
else
  echo "   ❌ ログイン失敗"
  echo "   Response: $RESPONSE"
fi
echo ""
