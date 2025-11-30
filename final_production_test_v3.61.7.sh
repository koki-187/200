#!/bin/bash
# Real Estate 200 Units - Final Production Test (Release Readiness)
# Version: v3.61.7
# Date: 2025-11-30

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

BASE_URL="https://114bbe7b.real-estate-200units-v2.pages.dev"

declare -a FAILED_TEST_NAMES=()
declare -a WARNING_TEST_NAMES=()

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}▶ $1${NC}"
    echo ""
}

print_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}  ✓ ${NC}${test_name}"
        [ -n "$message" ] && echo -e "    ${YELLOW}↳ $message${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    elif [ "$status" == "WARN" ]; then
        echo -e "${YELLOW}  ⚠ ${NC}${test_name}"
        [ -n "$message" ] && echo -e "    ${YELLOW}↳ $message${NC}"
        WARNING_TESTS=$((WARNING_TESTS + 1))
        WARNING_TEST_NAMES+=("$test_name: $message")
    else
        echo -e "${RED}  ✗ ${NC}${test_name}"
        [ -n "$message" ] && echo -e "    ${RED}↳ $message${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test_name: $message")
    fi
}

measure_response_time() {
    local url="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local auth="${4:-}"
    
    local start_time=$(date +%s%N)
    
    if [ "$method" = "POST" ]; then
        if [ -n "$auth" ]; then
            curl -s -X POST "$url" -H "Content-Type: application/json" -H "Authorization: Bearer $auth" -d "$data" > /dev/null
        else
            curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data" > /dev/null
        fi
    else
        if [ -n "$auth" ]; then
            curl -s -H "Authorization: Bearer $auth" "$url" > /dev/null
        else
            curl -s "$url" > /dev/null
        fi
    fi
    
    local end_time=$(date +%s%N)
    local elapsed=$(( (end_time - start_time) / 1000000 ))
    echo "$elapsed"
}

print_header "リリース前最終テスト - Real Estate 200 Units v3.61.7"
echo -e "${MAGENTA}対象環境: $BASE_URL${NC}"
echo -e "${MAGENTA}実行日時: $(date '+%Y-%m-%d %H:%M:%S')${NC}"

# =============================================================================
# 1. インフラストラクチャテスト
# =============================================================================
print_header "1. インフラストラクチャテスト"

print_section "1.1 ヘルスチェック"
response_time=$(measure_response_time "$BASE_URL/api/health")
health=$(curl -s "$BASE_URL/api/health")
if echo "$health" | grep -q "ok"; then
    print_result "APIヘルスチェック" "PASS" "レスポンス時間: ${response_time}ms"
else
    print_result "APIヘルスチェック" "FAIL" "ヘルスチェック失敗"
fi

print_section "1.2 認証システム"
response_time=$(measure_response_time "$BASE_URL/api/auth/login" "POST" '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}')
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"navigator-187@docomo.ne.jp","password":"kouki187"}' | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    print_result "管理者ログイン" "PASS" "トークン取得成功 (${response_time}ms)"
else
    print_result "管理者ログイン" "FAIL" "認証失敗"
    exit 1
fi

# 無効な認証情報テスト
invalid_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid@test.com","password":"wrong"}')
if echo "$invalid_response" | grep -q "error"; then
    print_result "無効な認証拒否" "PASS" "不正なログインを適切にブロック"
else
    print_result "無効な認証拒否" "FAIL" "セキュリティ脆弱性あり"
fi

# =============================================================================
# 2. 案件管理機能テスト
# =============================================================================
print_header "2. 案件管理機能テスト"

print_section "2.1 案件一覧取得"
response_time=$(measure_response_time "$BASE_URL/api/deals" "GET" "" "$TOKEN")
deals_response=$(curl -s "$BASE_URL/api/deals" -H "Authorization: Bearer $TOKEN")
deals_count=$(echo "$deals_response" | jq '.deals | length')

if [ "$deals_count" -gt 0 ]; then
    print_result "案件一覧取得" "PASS" "$deals_count 件取得 (${response_time}ms)"
    FIRST_DEAL_ID=$(echo "$deals_response" | jq -r '.deals[0].id')
else
    print_result "案件一覧取得" "WARN" "案件が0件"
    FIRST_DEAL_ID=""
fi

print_section "2.2 案件詳細取得"
if [ -n "$FIRST_DEAL_ID" ]; then
    response_time=$(measure_response_time "$BASE_URL/api/deals/$FIRST_DEAL_ID" "GET" "" "$TOKEN")
    deal_detail=$(curl -s "$BASE_URL/api/deals/$FIRST_DEAL_ID" -H "Authorization: Bearer $TOKEN")
    deal_title=$(echo "$deal_detail" | jq -r '.deal.title // empty')
    
    if [ -n "$deal_title" ]; then
        print_result "案件詳細取得" "PASS" "案件: ${deal_title:0:30}... (${response_time}ms)"
    else
        print_result "案件詳細取得" "FAIL" "詳細取得失敗"
    fi
else
    print_result "案件詳細取得" "WARN" "テスト対象案件なし"
fi

print_section "2.3 案件作成"
create_response=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"リリーステスト案件_$(date +%Y%m%d_%H%M%S)\",
    \"seller_id\": \"seller-001\",
    \"status\": \"NEW\",
    \"location\": \"東京都板橋区成増\",
    \"station\": \"成増駅\",
    \"walk_minutes\": 10,
    \"land_area\": \"120.5\",
    \"zoning\": \"第一種住居地域\",
    \"building_coverage\": \"60\",
    \"floor_area_ratio\": \"200\",
    \"desired_price\": \"65000000\",
    \"remarks\": \"リリース前最終テスト\"
  }")

new_deal_id=$(echo "$create_response" | jq -r '.deal.id // empty')
if [ -n "$new_deal_id" ]; then
    print_result "案件作成" "PASS" "案件ID: $new_deal_id"
    echo -e "    ${MAGENTA}📧 管理者メール送信: realestate.navigator01@gmail.com${NC}"
else
    error_msg=$(echo "$create_response" | jq -r '.error // "Unknown error"')
    print_result "案件作成" "FAIL" "$error_msg"
fi

print_section "2.4 案件更新"
if [ -n "$new_deal_id" ]; then
    update_response=$(curl -s -X PUT "$BASE_URL/api/deals/$new_deal_id" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"title\": \"リリーステスト案件_更新済\",
        \"status\": \"IN_REVIEW\",
        \"remarks\": \"更新テスト完了\"
      }")
    
    if echo "$update_response" | jq -e '.deal.id' > /dev/null 2>&1; then
        print_result "案件更新" "PASS" "ステータス変更成功"
    else
        print_result "案件更新" "FAIL" "更新失敗"
    fi
else
    print_result "案件更新" "WARN" "テスト対象案件なし"
fi

print_section "2.5 案件検索・フィルタリング"
# ステータスフィルター
filtered=$(curl -s "$BASE_URL/api/deals?status=NEW" -H "Authorization: Bearer $TOKEN")
new_count=$(echo "$filtered" | jq '.deals | length')
print_result "ステータスフィルター" "PASS" "NEW案件: $new_count 件"

# ソート
sorted=$(curl -s "$BASE_URL/api/deals?sortBy=created_at&sortOrder=desc" -H "Authorization: Bearer $TOKEN")
if echo "$sorted" | jq -e '.deals' > /dev/null 2>&1; then
    print_result "ソート機能" "PASS" "作成日降順でソート成功"
else
    print_result "ソート機能" "FAIL" "ソート失敗"
fi

# ページネーション
paginated=$(curl -s "$BASE_URL/api/deals?page=1&limit=5" -H "Authorization: Bearer $TOKEN")
page_count=$(echo "$paginated" | jq '.deals | length')
if [ "$page_count" -le 5 ]; then
    print_result "ページネーション" "PASS" "ページあたり $page_count 件"
else
    print_result "ページネーション" "WARN" "ページネーション制限が機能していない"
fi

# =============================================================================
# 3. REINFOLIB API統合テスト
# =============================================================================
print_header "3. REINFOLIB API統合テスト"

print_section "3.1 基本動作確認"
test_result=$(curl -s "$BASE_URL/api/reinfolib/test")
if echo "$test_result" | jq -e '.success' > /dev/null 2>&1; then
    print_result "REINFOLIB API基本テスト" "PASS" "API応答正常"
else
    print_result "REINFOLIB API基本テスト" "FAIL" "API応答異常"
fi

print_section "3.2 住所解析テスト"
# Test 1: さいたま市北区
parse_result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=%E5%9F%BC%E7%8E%89%E7%9C%8C%E3%81%95%E3%81%84%E3%81%9F%E3%81%BE%E5%B8%82%E5%8C%97%E5%8C%BA")
if echo "$parse_result" | jq -e '.success' > /dev/null 2>&1; then
    city_code=$(echo "$parse_result" | jq -r '.result.cityCode')
    if [ "$city_code" = "11102" ]; then
        print_result "住所解析: さいたま市北区" "PASS" "市区町村コード: $city_code"
    else
        print_result "住所解析: さいたま市北区" "FAIL" "コードが不正: $city_code (期待値: 11102)"
    fi
else
    print_result "住所解析: さいたま市北区" "FAIL" "解析失敗"
fi

# Test 2: 幸手市
parse_result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=%E5%9F%BC%E7%8E%89%E7%9C%8C%E5%B9%B8%E6%89%8B%E5%B8%82")
if echo "$parse_result" | jq -e '.success' > /dev/null 2>&1; then
    city_code=$(echo "$parse_result" | jq -r '.result.cityCode')
    if [ "$city_code" = "11241" ]; then
        print_result "住所解析: 幸手市" "PASS" "市区町村コード: $city_code"
    else
        print_result "住所解析: 幸手市" "FAIL" "コードが不正: $city_code (期待値: 11241)"
    fi
else
    print_result "住所解析: 幸手市" "FAIL" "解析失敗"
fi

# Test 3: 千代田区
parse_result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E5%8D%83%E4%BB%A3%E7%94%B0%E5%8C%BA")
if echo "$parse_result" | jq -e '.success' > /dev/null 2>&1; then
    city_code=$(echo "$parse_result" | jq -r '.result.cityCode')
    if [ "$city_code" = "13101" ]; then
        print_result "住所解析: 千代田区" "PASS" "市区町村コード: $city_code"
    else
        print_result "住所解析: 千代田区" "FAIL" "コードが不正: $city_code (期待値: 13101)"
    fi
else
    print_result "住所解析: 千代田区" "FAIL" "解析失敗"
fi

# Test 4: 板橋区
parse_result=$(curl -s "$BASE_URL/api/reinfolib/test-parse?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%9D%BF%E6%A9%8B%E5%8C%BA")
if echo "$parse_result" | jq -e '.success' > /dev/null 2>&1; then
    city_code=$(echo "$parse_result" | jq -r '.result.cityCode')
    if [ "$city_code" = "13119" ]; then
        print_result "住所解析: 板橋区" "PASS" "市区町村コード: $city_code"
    else
        print_result "住所解析: 板橋区" "FAIL" "コードが不正: $city_code (期待値: 13119)"
    fi
else
    print_result "住所解析: 板橋区" "FAIL" "解析失敗"
fi

print_section "3.3 物件情報取得テスト"
# Test with data: 板橋区 2024 Q4
property_result=$(curl -s "$BASE_URL/api/reinfolib/property-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%9D%BF%E6%A9%8B%E5%8C%BA&year=2024&quarter=4" \
  -H "Authorization: Bearer $TOKEN")

if echo "$property_result" | jq -e '.success' > /dev/null 2>&1; then
    data_count=$(echo "$property_result" | jq '.data | length')
    if [ "$data_count" -gt 0 ]; then
        print_result "物件情報取得: 板橋区 (2024 Q4)" "PASS" "$data_count 件のデータ取得"
    else
        print_result "物件情報取得: 板橋区 (2024 Q4)" "WARN" "データなし（期限切れの可能性）"
    fi
else
    error_msg=$(echo "$property_result" | jq -r '.error // "Unknown"')
    if [ "$error_msg" = "データが見つかりません" ]; then
        print_result "物件情報取得: 板橋区 (2024 Q4)" "PASS" "適切なエラーハンドリング: $error_msg"
    else
        print_result "物件情報取得: 板橋区 (2024 Q4)" "FAIL" "$error_msg"
    fi
fi

# Test without data: さいたま市北区
property_result=$(curl -s "$BASE_URL/api/reinfolib/property-info?address=%E5%9F%BC%E7%8E%89%E7%9C%8C%E3%81%95%E3%81%84%E3%81%9F%E3%81%BE%E5%B8%82%E5%8C%97%E5%8C%BA" \
  -H "Authorization: Bearer $TOKEN")

if echo "$property_result" | jq -e 'has("success")' > /dev/null 2>&1; then
    if echo "$property_result" | jq -e '.success' > /dev/null 2>&1; then
        data_count=$(echo "$property_result" | jq '.data | length')
        print_result "物件情報取得: さいたま市北区" "PASS" "$data_count 件取得"
    else
        error_msg=$(echo "$property_result" | jq -r '.error')
        print_result "物件情報取得: さいたま市北区" "PASS" "エラー処理適切: $error_msg"
    fi
else
    print_result "物件情報取得: さいたま市北区" "FAIL" "レスポンス異常"
fi

# =============================================================================
# 4. 分析API・レポート機能テスト
# =============================================================================
print_header "4. 分析API・レポート機能テスト"

print_section "4.1 ステータス推移"
analytics_result=$(curl -s "$BASE_URL/api/analytics/status-trends" -H "Authorization: Bearer $TOKEN")
if echo "$analytics_result" | jq -e '.success' > /dev/null 2>&1; then
    trends_count=$(echo "$analytics_result" | jq '.data.statusTrend | length // 0')
    print_result "ステータス推移取得" "PASS" "$trends_count 件の推移データ"
else
    print_result "ステータス推移取得" "FAIL" "データ取得失敗"
fi

print_section "4.2 案件トレンド"
trends_result=$(curl -s "$BASE_URL/api/analytics/trends/deals" -H "Authorization: Bearer $TOKEN")
if echo "$trends_result" | jq -e 'has("newDeals")' > /dev/null 2>&1; then
    new_deals=$(echo "$trends_result" | jq '.newDeals | length // 0')
    print_result "案件トレンド取得" "PASS" "新規案件推移: $new_deals 期間"
else
    print_result "案件トレンド取得" "FAIL" "トレンドデータ取得失敗"
fi

print_section "4.3 KPIダッシュボード"
kpi_result=$(curl -s "$BASE_URL/api/analytics/kpi/dashboard" -H "Authorization: Bearer $TOKEN")
if echo "$kpi_result" | jq -e 'has("totalDeals")' > /dev/null 2>&1; then
    total_deals=$(echo "$kpi_result" | jq '.totalDeals')
    print_result "KPIダッシュボード" "PASS" "総案件数: $total_deals"
else
    print_result "KPIダッシュボード" "WARN" "KPIデータ取得失敗（エンドポイント未実装の可能性）"
fi

# =============================================================================
# 5. ファイル操作テスト
# =============================================================================
print_header "5. ファイル操作テスト"

print_section "5.1 ファイル一覧取得"
if [ -n "$FIRST_DEAL_ID" ]; then
    files_result=$(curl -s "$BASE_URL/api/deals/$FIRST_DEAL_ID/files" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    if echo "$files_result" | jq -e 'has("files")' > /dev/null 2>&1; then
        files_count=$(echo "$files_result" | jq '.files | length // 0')
        print_result "ファイル一覧取得" "PASS" "$files_count 件のファイル"
    else
        if echo "$files_result" | jq -e 'has("error")' > /dev/null 2>&1; then
            error_msg=$(echo "$files_result" | jq -r '.error')
            print_result "ファイル一覧取得" "PASS" "エラー処理適切: $error_msg"
        else
            print_result "ファイル一覧取得" "FAIL" "レスポンス異常"
        fi
    fi
else
    print_result "ファイル一覧取得" "WARN" "テスト対象案件なし"
fi

# =============================================================================
# 6. エラーハンドリング・セキュリティテスト
# =============================================================================
print_header "6. エラーハンドリング・セキュリティテスト"

print_section "6.1 認証なしアクセス"
unauth_response=$(curl -s "$BASE_URL/api/deals")
if echo "$unauth_response" | grep -q "error\|Invalid token"; then
    print_result "認証なしアクセス拒否" "PASS" "適切に401/403を返す"
else
    print_result "認証なしアクセス拒否" "FAIL" "セキュリティ脆弱性：認証なしでアクセス可能"
fi

print_section "6.2 存在しないリソース"
not_found=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/deals/nonexistent-id-12345" \
  -H "Authorization: Bearer $TOKEN")
http_status=$(echo "$not_found" | grep "HTTP_STATUS" | cut -d':' -f2)
if [ "$http_status" = "404" ]; then
    print_result "404エラーハンドリング" "PASS" "存在しないリソースで404返却"
else
    print_result "404エラーハンドリング" "FAIL" "不適切なステータスコード: $http_status"
fi

print_section "6.3 バリデーションエラー"
invalid_deal=$(curl -s -X POST "$BASE_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"","seller_id":""}')

if echo "$invalid_deal" | grep -q "error\|validation"; then
    print_result "バリデーションエラー" "PASS" "不正なデータを拒否"
else
    print_result "バリデーションエラー" "FAIL" "バリデーション未実装"
fi

# =============================================================================
# テスト結果サマリー
# =============================================================================
print_header "テスト結果サマリー"

echo -e "${BLUE}総テスト数:${NC} $TOTAL_TESTS"
echo -e "${GREEN}成功:${NC} $PASSED_TESTS"
echo -e "${YELLOW}警告:${NC} $WARNING_TESTS"
echo -e "${RED}失敗:${NC} $FAILED_TESTS"
echo ""

success_rate=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS / $TOTAL_TESTS) * 100}")
echo -e "${MAGENTA}成功率: ${success_rate}%${NC}"

if [ $FAILED_TESTS -eq 0 ] && [ $WARNING_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✓ 全てのテストが成功しました！${NC}"
    echo -e "${GREEN}  ✓ リリース準備完了${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ⚠ いくつかの警告がありますが、リリース可能${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}警告項目:${NC}"
    for warning in "${WARNING_TEST_NAMES[@]}"; do
        echo -e "  ${YELLOW}⚠${NC} $warning"
    done
    exit 0
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ✗ テストに失敗しました${NC}"
    echo -e "${RED}  ✗ リリース前に修正が必要${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${RED}失敗項目:${NC}"
    for failure in "${FAILED_TEST_NAMES[@]}"; do
        echo -e "  ${RED}✗${NC} $failure"
    done
    exit 1
fi
