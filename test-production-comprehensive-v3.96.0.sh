#!/bin/bash

# v3.96.0 本番環境 包括的テスト（エラーケース含む）
BASE_URL="https://a2b11148.real-estate-200units-v2.pages.dev"

echo "========================================="
echo "v3.96.0 本番環境 包括的テスト"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# ============================================================
# 認証テスト
# ============================================================
echo "========================================="
echo "認証テスト"
echo "========================================="
echo ""

# Test 1: 正常ログイン
echo "✅ Test 1: 正常ログイン (admin@200units.com)"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   ✅ PASS - トークン取得成功"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - $LOGIN_RESPONSE"
  ((FAIL_COUNT++))
  exit 1
fi
echo ""

# Test 2: 不正なパスワード
echo "✅ Test 2: 不正なパスワード（エラーハンドリング確認）"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"WrongPassword123"}')

if echo "$RESPONSE" | grep -q "Invalid credentials"; then
  echo "   ✅ PASS - 適切なエラーメッセージ"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - 予期しないレスポンス: $RESPONSE"
  ((FAIL_COUNT++))
fi
echo ""

# Test 3: 存在しないユーザー
echo "✅ Test 3: 存在しないユーザー（エラーハンドリング確認）"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"Test1234!"}')

if echo "$RESPONSE" | grep -q "Invalid credentials"; then
  echo "   ✅ PASS - 適切なエラーメッセージ"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - 予期しないレスポンス: $RESPONSE"
  ((FAIL_COUNT++))
fi
echo ""

# Test 4: 無効なリクエスト（メール欠如）
echo "✅ Test 4: 無効なリクエスト（メール欠如）"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"Test1234!"}')

if echo "$RESPONSE" | grep -q "error"; then
  echo "   ✅ PASS - バリデーションエラー検出"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - 予期しないレスポンス: $RESPONSE"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# API認証テスト
# ============================================================
echo "========================================="
echo "API認証テスト"
echo "========================================="
echo ""

# Test 5: 認証なしでユーザー一覧アクセス
echo "✅ Test 5: 認証なしでユーザー一覧アクセス（拒否確認）"
RESPONSE=$(curl -s "$BASE_URL/api/users" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ PASS - 認証なしで拒否された (401)"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - HTTP $HTTP_CODE (期待: 401)"
  ((FAIL_COUNT++))
fi
echo ""

# Test 6: 認証なしでハザード情報アクセス
echo "✅ Test 6: 認証なしでハザード情報アクセス（拒否確認）"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/hazard-info?address=東京都" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ PASS - 認証なしで拒否された (401)"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - HTTP $HTTP_CODE (期待: 401)"
  ((FAIL_COUNT++))
fi
echo ""

# Test 7: 無効なトークンでアクセス
echo "✅ Test 7: 無効なトークンでアクセス（拒否確認）"
RESPONSE=$(curl -s "$BASE_URL/api/users" \
  -H "Authorization: Bearer invalid_token_12345" \
  -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ PASS - 無効なトークンで拒否された (401)"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - HTTP $HTTP_CODE (期待: 401)"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# 案件作成テスト
# ============================================================
echo "========================================="
echo "案件作成テスト"
echo "========================================="
echo ""

# Test 8: 必須項目不足での案件作成
echo "✅ Test 8: 必須項目不足での案件作成（バリデーションエラー確認）"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"テスト"}')

if echo "$RESPONSE" | grep -q "error"; then
  echo "   ✅ PASS - バリデーションエラー検出"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - バリデーションエラーが検出されなかった"
  ((FAIL_COUNT++))
fi
echo ""

# Test 9: 正常な案件作成
echo "✅ Test 9: 正常な案件作成"
DEAL_DATA='{
  "title": "エラーテスト物件",
  "location": "東京都渋谷区神南1-1-1",
  "land_area": 100,
  "zoning": "商業地域",
  "seller_id": "seller-001",
  "status": "PENDING"
}'

DEAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$DEAL_DATA")

if echo "$DEAL_RESPONSE" | grep -q '"id"'; then
  DEAL_ID=$(echo "$DEAL_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "   ✅ PASS - 案件作成成功 (ID: $DEAL_ID)"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - $DEAL_RESPONSE"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# ユーザー管理テスト
# ============================================================
echo "========================================="
echo "ユーザー管理テスト"
echo "========================================="
echo ""

# Test 10: ユーザー一覧取得（管理者）
echo "✅ Test 10: ユーザー一覧取得（管理者）"
RESPONSE=$(curl -s "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q '"users"'; then
  COUNT=$(echo "$RESPONSE" | grep -o '"email"' | wc -l)
  echo "   ✅ PASS - ユーザー数: $COUNT"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - $RESPONSE"
  ((FAIL_COUNT++))
fi
echo ""

# Test 11: ユーザー一覧取得（ページネーション）
echo "✅ Test 11: ユーザー一覧取得（ページネーション）"
RESPONSE=$(curl -s "$BASE_URL/api/users?page=1&limit=3" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q '"pagination"'; then
  echo "   ✅ PASS - ページネーション動作"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - $RESPONSE"
  ((FAIL_COUNT++))
fi
echo ""

# Test 12: ユーザー検索
echo "✅ Test 12: ユーザー検索（名前で検索）"
RESPONSE=$(curl -s "$BASE_URL/api/users?search=管理者" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q '"users"'; then
  echo "   ✅ PASS - 検索機能動作"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - $RESPONSE"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# 融資制限条件チェックテスト
# ============================================================
echo "========================================="
echo "融資制限条件チェックテスト"
echo "========================================="
echo ""

# Test 13: 融資制限条件チェック（正常）
echo "✅ Test 13: 融資制限条件チェック（正常）"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/check-financing-restrictions?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q 'restrictions'; then
  echo "   ✅ PASS - 融資制限チェック動作"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - $RESPONSE"
  ((FAIL_COUNT++))
fi
echo ""

# Test 14: 融資制限条件チェック（住所なし）
echo "✅ Test 14: 融資制限条件チェック（住所なし - エラー確認）"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/check-financing-restrictions" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q 'error'; then
  echo "   ✅ PASS - 適切なエラーメッセージ"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - エラーが検出されなかった"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# ハザード情報テスト
# ============================================================
echo "========================================="
echo "ハザード情報テスト"
echo "========================================="
echo ""

# Test 15: ハザード情報取得（正常）
echo "✅ Test 15: ハザード情報取得（正常）"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/hazard-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q 'hazards'; then
  echo "   ✅ PASS - ハザード情報取得成功"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - $RESPONSE"
  ((FAIL_COUNT++))
fi
echo ""

# Test 16: ハザード情報取得（住所なし）
echo "✅ Test 16: ハザード情報取得（住所なし - エラー確認）"
RESPONSE=$(curl -s "$BASE_URL/api/reinfolib/hazard-info" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q 'error'; then
  echo "   ✅ PASS - 適切なエラーメッセージ"
  ((PASS_COUNT++))
else
  echo "   ❌ FAIL - エラーが検出されなかった"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================
# 結果サマリー
# ============================================================
echo "========================================="
echo "テスト結果サマリー"
echo "========================================="
TOTAL_COUNT=$((PASS_COUNT + FAIL_COUNT))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASS_COUNT / $TOTAL_COUNT) * 100}")

echo ""
echo "総テスト数: $TOTAL_COUNT"
echo "成功: $PASS_COUNT ✅"
echo "失敗: $FAIL_COUNT ❌"
echo "成功率: $SUCCESS_RATE%"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "🎉 全てのテストが成功しました！"
  exit 0
else
  echo "⚠️  一部のテストが失敗しました"
  exit 1
fi
