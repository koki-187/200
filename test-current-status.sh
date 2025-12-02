#!/bin/bash

BASE_URL="https://a2b11148.real-estate-200units-v2.pages.dev"

echo "========================================="
echo "本番環境 現状確認"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Test 1: admin@200units.com (Test1234!)
echo "Test 1: admin@200units.com / Test1234!"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')
if echo "$RESPONSE" | grep -q '"token"'; then
  echo "   ✅ ログイン成功"
else
  echo "   ❌ ログイン失敗: $RESPONSE"
fi
echo ""

# Test 2: navigator-187@docomo.ne.jp (Test1234!)
echo "Test 2: navigator-187@docomo.ne.jp / Test1234!"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"navigator-187@docomo.ne.jp","password":"Test1234!"}')
if echo "$RESPONSE" | grep -q '"token"'; then
  echo "   ✅ ログイン成功"
else
  echo "   ❌ ログイン失敗: $RESPONSE"
fi
echo ""

# Test 3: seller1@example.com (Test1234!)
echo "Test 3: seller1@example.com / Test1234!"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"seller1@example.com","password":"Test1234!"}')
if echo "$RESPONSE" | grep -q '"token"'; then
  echo "   ✅ ログイン成功"
else
  echo "   ❌ ログイン失敗: $RESPONSE"
fi
echo ""

echo "========================================="
echo "確認完了"
echo "========================================="
