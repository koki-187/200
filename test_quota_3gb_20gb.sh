#!/bin/bash

echo "=== Storage Quota Update Test (3GB/20GB) ==="
echo ""

# ローカルテスト
echo "Testing local environment..."
sleep 3

# テストユーザーでログイン（一般ユーザー）
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

# ストレージクォータ確認
echo "Checking storage quota..."
QUOTA_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/storage-quota" \
  -H "Authorization: Bearer $TOKEN")

echo "$QUOTA_RESPONSE" | jq '.'

LIMIT_MB=$(echo "$QUOTA_RESPONSE" | jq -r '.quota.usage.limit_mb')
LIMIT_BYTES=$(echo "$QUOTA_RESPONSE" | jq -r '.quota.usage.limit_bytes')

echo ""
echo "=== Quota Verification ==="
echo "Limit: $LIMIT_MB MB ($LIMIT_BYTES bytes)"

# 管理者の場合: 20GB = 20480MB = 21474836480 bytes
# 一般ユーザーの場合: 3GB = 3072MB = 3221225472 bytes

if [ "$LIMIT_BYTES" = "21474836480" ]; then
  echo "✅ Admin quota correctly set to 20GB (20480MB)"
elif [ "$LIMIT_BYTES" = "3221225472" ]; then
  echo "✅ Regular user quota correctly set to 3GB (3072MB)"
else
  echo "⚠️  Unexpected quota: ${LIMIT_MB}MB"
  echo "Expected: 3072MB (3GB) for regular users or 20480MB (20GB) for admin"
fi

echo ""
echo "🎉 Test completed!"
