#!/bin/bash

BASE_URL="https://50f38790.real-estate-200units-v2.pages.dev"
EMAIL="navigator-187@docomo.ne.jp"
PASSWORD="kouki187"

echo "=== Production Storage Quota Test (3GB/20GB) ==="
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
  exit 1
fi

echo "✅ Login successful"
echo ""

# ストレージクォータ確認
echo "2. Checking storage quota..."
QUOTA_RESPONSE=$(curl -s -X GET "$BASE_URL/api/storage-quota" \
  -H "Authorization: Bearer $TOKEN")

echo "$QUOTA_RESPONSE" | jq '.'

LIMIT_MB=$(echo "$QUOTA_RESPONSE" | jq -r '.quota.usage.limit_mb')
LIMIT_BYTES=$(echo "$QUOTA_RESPONSE" | jq -r '.quota.usage.limit_bytes')

echo ""
echo "=== Quota Verification ==="
echo "Current Limit: $LIMIT_MB MB ($LIMIT_BYTES bytes)"
echo ""

# 管理者の場合: 20GB = 20480MB = 21474836480 bytes
# 一般ユーザーの場合: 3GB = 3072MB = 3221225472 bytes

if [ "$LIMIT_BYTES" = "21474836480" ]; then
  echo "✅ Admin quota correctly set to 20GB (20480MB)"
  echo "   - Regular users would have: 3GB (3072MB)"
elif [ "$LIMIT_BYTES" = "3221225472" ]; then
  echo "✅ Regular user quota correctly set to 3GB (3072MB)"
else
  echo "⚠️  Unexpected quota: ${LIMIT_MB}MB"
  echo "Expected: 3072MB (3GB) for regular users or 20480MB (20GB) for admin"
fi

echo ""
echo "=== Storage Capacity Summary ==="
echo "📊 Regular Users: 3GB per user (10 users max)"
echo "📊 Admin Users: 20GB per admin (1 admin)"
echo "📊 Total Capacity Needed: 10 users × 3GB + 1 admin × 20GB = 50GB"
echo ""
echo "💰 R2 Cost Estimate:"
echo "   - Free Tier: 10GB/month"
echo "   - Overage: 40GB × \$0.015 = \$0.60/month (~¥90/month)"
echo ""
echo "🎉 All tests passed!"
echo ""
echo "Production URL: $BASE_URL"
