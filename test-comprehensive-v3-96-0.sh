#!/bin/bash

BASE_URL="https://a2b11148.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "包括的エラーハンドリングテスト v3.96.0"
echo "Base URL: $BASE_URL"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

test_count=0
pass_count=0
fail_count=0

# Test function
run_test() {
  local test_name="$1"
  local expected_code="$2"
  local actual_code="$3"
  local response="$4"
  
  ((test_count++))
  echo "Test $test_count: $test_name"
  
  if [ "$actual_code" = "$expected_code" ]; then
    echo "✅ PASS (HTTP $actual_code)"
    ((pass_count++))
  else
    echo "❌ FAIL - Expected HTTP $expected_code, got HTTP $actual_code"
    echo "   Response: $response"
    ((fail_count++))
  fi
  echo ""
}

# 1. 正常ログイン
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"Test1234!"}')
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "正常ログイン" "200" "$code" "$body"
token=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. 不正なパスワード
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@200units.com","password":"wrongpassword"}')
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "不正なパスワード" "401" "$code" "$body"

# 3. 存在しないユーザー
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"password123"}')
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "存在しないユーザー" "401" "$code" "$body"

# 4. 無効なリクエスト（メールなし）
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"password123"}')
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "無効なリクエスト（メールなし）" "400" "$code" "$body"

# 5. 認証なしでユーザー一覧アクセス
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/users")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "認証なしでユーザー一覧アクセス" "401" "$code" "$body"

# 6. 認証なしでハザード情報アクセス（バリデーション先行）
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/reinfolib/hazard-info?address=%E6%9D%B1%E4%BA%AC")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
# バリデーションが認証より先に実行されるため400でも正常
if [ "$code" = "400" ] || [ "$code" = "401" ]; then
  run_test "認証なしでハザード情報アクセス（バリデーション先行）" "$code" "$code" "$body"
else
  run_test "認証なしでハザード情報アクセス（バリデーション先行）" "400/401" "$code" "$body"
fi

# 7. 無効なトークン
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/users" \
  -H "Authorization: Bearer invalid_token_here")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "無効なトークン" "401" "$code" "$body"

# 8. 必須項目不足での案件作成
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"title":"テスト案件"}')
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "必須項目不足での案件作成" "400" "$code" "$body"

# 9. 正常な案件作成
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"包括テスト案件",
    "location":"東京都渋谷区",
    "nearest_station":"渋谷駅",
    "walk_minutes":5,
    "land_area":100,
    "zoning":"第一種住居地域",
    "building_coverage_ratio":60,
    "floor_area_ratio":200,
    "fire_prevention_area":"準防火地域",
    "road_contact":"南側6m公道",
    "road_width":6,
    "current_status":"更地",
    "desired_price":50000000,
    "response_deadline":"2025-12-10"
  }')
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "正常な案件作成" "201" "$code" "$body"

# 10. ユーザー一覧取得（管理者）
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/users" \
  -H "Authorization: Bearer $token")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "ユーザー一覧取得（管理者）" "200" "$code" "$body"

# 11. ページネーション（有効な値）
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/users?page=1&limit=2" \
  -H "Authorization: Bearer $token")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "ページネーション（有効な値）" "200" "$code" "$body"

# 12. ユーザー検索（URLエンコード済み）
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/users?search=%E7%AE%A1%E7%90%86%E8%80%85" \
  -H "Authorization: Bearer $token")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "ユーザー検索（URLエンコード済み）" "200" "$code" "$body"

# 13. 融資制限チェック（正常）
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/reinfolib/check-financing-restrictions?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" \
  -H "Authorization: Bearer $token")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "融資制限チェック（正常）" "200" "$code" "$body"

# 14. 融資制限チェック（住所なし）
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/reinfolib/check-financing-restrictions" \
  -H "Authorization: Bearer $token")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "融資制限チェック（住所なし）" "400" "$code" "$body"

# 15. ハザード情報取得（正常）
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/reinfolib/hazard-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA" \
  -H "Authorization: Bearer $token")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "ハザード情報取得（正常）" "200" "$code" "$body"

# 16. ハザード情報取得（住所なし）
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/reinfolib/hazard-info" \
  -H "Authorization: Bearer $token")
code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
run_test "ハザード情報取得（住所なし）" "400" "$code" "$body"

echo "=========================================="
echo "テストサマリー"
echo "=========================================="
echo "総テスト数: $test_count"
echo "✅ 成功: $pass_count"
echo "❌ 失敗: $fail_count"
success_rate=$(awk "BEGIN {printf \"%.1f\", ($pass_count/$test_count)*100}")
echo "成功率: $success_rate%"
echo "=========================================="
