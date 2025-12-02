#!/bin/bash

BASE_URL="https://a2b11148.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "admin@test.com 詳細テスト"
echo "=========================================="
echo ""

# 複数のパスワードでテスト
passwords=("admin123" "Test1234!" "admin1234")

for password in "${passwords[@]}"; do
  echo "Testing password: $password"
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"admin@test.com\",\"password\":\"$password\"}")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS with password: $password"
    echo "Response: $body"
    break
  else
    echo "❌ FAIL (HTTP $http_code)"
  fi
  echo ""
done

# データベースで確認
echo ""
echo "=========================================="
echo "データベースのパスワードハッシュ確認"
echo "=========================================="
npx wrangler d1 execute real-estate-200units-db --remote \
  --command="SELECT email, SUBSTR(password_hash, 1, 48) as hash_preview, LENGTH(password_hash) as hash_length FROM users WHERE email = 'admin@test.com'"
