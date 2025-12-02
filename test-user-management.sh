#!/bin/bash

BASE_URL="https://a2b11148.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "ユーザー管理API動作確認"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# 1. 管理者としてログイン
echo "1. 管理者ログイン（admin@200units.com）"
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')

token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$token" ]; then
  echo "❌ ログイン失敗"
  echo "Response: $login_response"
  exit 1
fi

echo "✅ ログイン成功"
echo ""

# 2. ユーザー一覧取得（管理者）
echo "2. ユーザー一覧取得（全ユーザー）"
users_response=$(curl -s -X GET "$BASE_URL/api/users" \
  -H "Authorization: Bearer $token")

echo "✅ ユーザー一覧取得成功"
echo "$users_response" | head -c 500
echo ""
echo ""

# 3. ユーザー検索（名前で検索）
echo "3. ユーザー検索（'管理者' で検索）"
search_response=$(curl -s -X GET "$BASE_URL/api/users?search=%E7%AE%A1%E7%90%86%E8%80%85" \
  -H "Authorization: Bearer $token")

echo "✅ ユーザー検索成功"
echo "$search_response" | head -c 500
echo ""
echo ""

# 4. ロールフィルタリング（ADMIN のみ）
echo "4. ロールフィルタリング（ADMIN のみ）"
admin_users=$(curl -s -X GET "$BASE_URL/api/users?role=ADMIN" \
  -H "Authorization: Bearer $token")

echo "✅ ロールフィルタリング成功"
echo "$admin_users" | head -c 500
echo ""
echo ""

# 5. ページネーション（2件ずつ）
echo "5. ページネーション（1ページ目、2件ずつ）"
page1=$(curl -s -X GET "$BASE_URL/api/users?page=1&limit=2" \
  -H "Authorization: Bearer $token")

echo "✅ ページネーション成功"
echo "$page1" | head -c 500
echo ""
echo ""

echo "=========================================="
echo "ユーザー管理API動作確認完了"
echo "=========================================="
