#!/bin/bash

echo "=== ローカル環境クイックテスト ==="
BASE_URL="http://localhost:3000"

# 3秒待機
sleep 3

# 1. Health Check
echo "1. Health Check..."
curl -s "$BASE_URL/api/health" | jq -c '.'

# 2. ユーザー登録 (ブラウザ用テストユーザー)
echo ""
echo "2. テストユーザー作成..."
SIGNUP=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "テスト管理者",
    "role": "ADMIN"
  }')

echo "$SIGNUP" | jq -c '.'

# 3. 売主ユーザー作成
echo ""
echo "3. 売主ユーザー作成..."
SELLER_SIGNUP=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "password": "seller123",
    "name": "テスト売主",
    "role": "AGENT"
  }')

echo "$SELLER_SIGNUP" | jq -c '.'

echo ""
echo "✅ ローカル環境準備完了"
echo ""
echo "ブラウザでアクセス: http://localhost:3000"
echo "  - 管理者: test@example.com / test123456"
echo "  - 売主: seller@example.com / seller123"
