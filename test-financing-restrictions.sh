#!/bin/bash

BASE_URL="https://a2b11148.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "融資制限条件チェックAPI動作確認"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# 1. 管理者としてログイン
echo "1. 管理者ログイン"
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')

token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$token" ]; then
  echo "❌ ログイン失敗"
  exit 1
fi

echo "✅ ログイン成功"
echo ""

# 2. 融資制限条件チェック（東京都渋谷区）
echo "2. 融資制限条件チェック（東京都渋谷区）"
financing_check=$(curl -s -X GET "$BASE_URL/api/reinfolib/check-financing-restrictions?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" \
  -H "Authorization: Bearer $token")

echo "$financing_check" | head -c 800
echo ""
echo ""

# 3. ハザード情報取得（東京都渋谷区）
echo "3. ハザード情報取得（東京都渋谷区）"
hazard_info=$(curl -s -X GET "$BASE_URL/api/reinfolib/hazard-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" \
  -H "Authorization: Bearer $token")

echo "$hazard_info" | head -c 800
echo ""
echo ""

# 4. 融資制限条件チェック（神奈川県横浜市）
echo "4. 融資制限条件チェック（神奈川県横浜市）"
financing_check2=$(curl -s -X GET "$BASE_URL/api/reinfolib/check-financing-restrictions?address=%E7%A5%9E%E5%A5%88%E5%B7%9D%E7%9C%8C%E6%A8%AA%E6%B5%9C%E5%B8%82" \
  -H "Authorization: Bearer $token")

echo "$financing_check2" | head -c 800
echo ""
echo ""

# 5. エラーケース：住所なし
echo "5. エラーケース：住所なし"
error_response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/reinfolib/check-financing-restrictions" \
  -H "Authorization: Bearer $token")

http_code=$(echo "$error_response" | tail -n1)
body=$(echo "$error_response" | head -n-1)

if [ "$http_code" = "400" ]; then
  echo "✅ 正しくバリデーションエラー（HTTP 400）"
  echo "Response: $body"
else
  echo "⚠️ 予想外のステータスコード: HTTP $http_code"
  echo "Response: $body"
fi
echo ""

echo "=========================================="
echo "融資制限条件チェックAPI動作確認完了"
echo "=========================================="
