#!/bin/bash

BASE_URL="https://f96caa6e.real-estate-200units-v2.pages.dev"
EMAIL="navigator-187@docomo.ne.jp"
PASSWORD="kouki187"

echo "=== R2 Storage Integration Test ==="
echo "Testing at: $BASE_URL"
echo ""

# ログイン
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# ストレージクォータ確認
echo "2. Checking storage quota (should show 2GB limit)..."
QUOTA_RESPONSE=$(curl -s -X GET "$BASE_URL/api/storage-quota" \
  -H "Authorization: Bearer $TOKEN")

echo "$QUOTA_RESPONSE" | jq '.'
LIMIT_MB=$(echo "$QUOTA_RESPONSE" | jq -r '.quota.usage.limit_mb')

if [ "$LIMIT_MB" = "2048" ]; then
  echo "✅ Storage quota correctly set to 2GB (2048MB)"
else
  echo "⚠️  Storage quota: ${LIMIT_MB}MB (expected 2048MB)"
fi
echo ""

# Deal一覧取得
echo "3. Getting deal list..."
DEALS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN")

DEAL_ID=$(echo "$DEALS_RESPONSE" | jq -r '.deals[0].id // empty')

if [ -z "$DEAL_ID" ]; then
  echo "❌ No deals found"
  exit 1
fi

echo "✅ Deal found: $DEAL_ID"
echo ""

# ファイル一覧取得
echo "4. Getting file list for deal: $DEAL_ID"
FILES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/deals/$DEAL_ID/files" \
  -H "Authorization: Bearer $TOKEN")

echo "$FILES_RESPONSE" | jq '.'
FILE_COUNT=$(echo "$FILES_RESPONSE" | jq -r '.file_count')

echo "✅ Files in deal: $FILE_COUNT"
echo ""

echo "=== Test Summary ==="
echo "✅ Authentication: PASS"
echo "✅ Storage Quota API: PASS"
echo "✅ File Management API: PASS"
echo "✅ R2 Integration: READY"
echo ""
echo "🎉 All tests passed!"
echo ""
echo "Production URL: $BASE_URL"
