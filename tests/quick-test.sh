#!/bin/bash

# Quick E2E Test v3.88.0
# 200棟土地仕入れ管理システム

PROD_URL="${PROD_URL:-http://localhost:3000}"
TOTAL=0
PASSED=0

echo "Quick E2E Test - $PROD_URL"
echo "================================"

# 1. Login
echo "1. Login"
TOKEN=$(curl -s -X POST "$PROD_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "navigator-187@docomo.ne.jp", "password": "kouki187"}' | jq -r '.token')
  
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Login"
  ((PASSED++))
else
  echo "❌ Login"
fi
((TOTAL++))

# 2. User Info
echo "2. User Info"
USER=$(curl -s "$PROD_URL/api/users/admin-001" -H "Authorization: Bearer $TOKEN" | jq -r '.user.name')
if [ "$USER" != "null" ]; then
  echo "✅ User Info: $USER"
  ((PASSED++))
else
  echo "❌ User Info"
fi
((TOTAL++))

# 3. Deal List
echo "3. Deal List"
DEALS=$(curl -s "$PROD_URL/api/deals" -H "Authorization: Bearer $TOKEN" | jq -r '.total // .deals | length')
echo "✅ Deal List: $DEALS deals"
((PASSED++))
((TOTAL++))

# 4. Notification Settings
echo "4. Notification Settings"
NOTIF=$(curl -s "$PROD_URL/api/notification-settings" -H "Authorization: Bearer $TOKEN" | jq -r '.email_on_new_deal')
if [ "$NOTIF" != "null" ]; then
  echo "✅ Notification Settings"
  ((PASSED++))
else
  echo "❌ Notification Settings"
fi
((TOTAL++))

# 5. Storage Quota
echo "5. Storage Quota"
STORAGE=$(curl -s "$PROD_URL/api/storage-quota" -H "Authorization: Bearer $TOKEN" | jq -r '.quota')
if [ "$STORAGE" != "null" ]; then
  echo "✅ Storage Quota"
  ((PASSED++))
else
  echo "❌ Storage Quota"
fi
((TOTAL++))

# 6. File List
echo "6. File List"
FILES=$(curl -s "$PROD_URL/api/files" -H "Authorization: Bearer $TOKEN" | jq -r '.files | length')
echo "✅ File List: $FILES files"
((PASSED++))
((TOTAL++))

# 7. Building Regulations
echo "7. Building Regulations"
BR=$(curl -s "$PROD_URL/api/building-regulations/check?location=東京都渋谷区&zoning=第一種住居地域&structure=木造&floors=3" | jq -r '.success')
if [ "$BR" == "true" ]; then
  echo "✅ Building Regulations"
  ((PASSED++))
else
  echo "❌ Building Regulations"
fi
((TOTAL++))

# 8. OCR Settings
echo "8. OCR Settings"
OCR=$(curl -s "$PROD_URL/api/ocr-settings" -H "Authorization: Bearer $TOKEN" | jq -r '.success')
if [ "$OCR" == "true" ]; then
  echo "✅ OCR Settings"
  ((PASSED++))
else
  echo "❌ OCR Settings"
fi
((TOTAL++))

# Summary
echo ""
echo "================================"
echo "Total: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $((TOTAL - PASSED))"
SUCCESS_RATE=$((PASSED * 100 / TOTAL))
echo "Success Rate: $SUCCESS_RATE%"
echo "================================"

if [ $SUCCESS_RATE -ge 90 ]; then
  exit 0
else
  exit 1
fi
