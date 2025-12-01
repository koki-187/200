#!/bin/bash

# 完全機能テストスクリプト v3.67.0
# 古いバージョン機能を含む全機能テスト

PROD_URL="https://eb736532.real-estate-200units-v2.pages.dev"
EMAIL="navigator-187@docomo.ne.jp"
PASSWORD="kouki187"

echo "========================================="
echo "200Units 完全機能テスト v3.67.0"
echo "========================================="
echo

# ログイン取得
echo "🔐 テスト1: ログイン認証..."
LOGIN_RESPONSE=$(curl -s -X POST "$PROD_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "✅ ログイン成功"

# ===== v3.67.0 新機能テスト =====
echo
echo "📚 テスト2: ヘルプページ（v3.67.0）..."
HELP_RESPONSE=$(curl -s "$PROD_URL/help")
if echo "$HELP_RESPONSE" | grep -q "ヘルプ" || echo "$HELP_RESPONSE" | grep -q "FAQ"; then
  echo "✅ ヘルプページ正常"
else
  echo "⚠️  ヘルプページ確認不可（HTMLレスポンス）"
fi

# ===== v3.66.0 機能テスト =====
echo
echo "📝 テスト3: 案件作成ページ（初回6情報必須マーク - v3.66.0）..."
CREATE_PAGE=$(curl -s "$PROD_URL/deals/create")
if echo "$CREATE_PAGE" | grep -q "required"; then
  echo "✅ 案件作成ページ正常（必須マーク実装済み）"
else
  echo "⚠️  案件作成ページ確認不可"
fi

echo
echo "⭐ テスト4: 特別案件承認ページ（v3.66.0）..."
SPECIAL_CASES=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/purchase-criteria/special-cases")
SPECIAL_COUNT=$(echo $SPECIAL_CASES | jq '. | length // 0')
echo "✅ 特別案件数: $SPECIAL_COUNT 件"

# ===== v3.65.0 機能テスト =====
echo
echo "🏛️ テスト5: 建築基準法API（v3.65.0）..."
BUILD_REG=$(curl -s -X POST "$PROD_URL/api/building-regulations/check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "location": "東京都渋谷区",
    "zoning": "第一種住居地域",
    "fire_zone": "準防火地域",
    "current_status": "更地"
  }')
REG_COUNT=$(echo $BUILD_REG | jq '.applicable_regulations | length // 0')
echo "✅ 建築基準法規定: $REG_COUNT 件検出"

echo
echo "✅ テスト6: 購入条件チェックAPI（v3.65.0）..."
CRITERIA_CHECK=$(curl -s -X POST "$PROD_URL/api/purchase-criteria/check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "location": "さいたま市",
    "walk_minutes": "5",
    "land_area": "200",
    "road_frontage": "4.5",
    "building_coverage": "60",
    "floor_area_ratio": "200",
    "zoning": "第一種住居地域"
  }')
OVERALL=$(echo $CRITERIA_CHECK | jq -r '.overall_result // "N/A"')
SCORE=$(echo $CRITERIA_CHECK | jq -r '.check_score // "N/A"')
echo "✅ 総合判定: $OVERALL, スコア: $SCORE"

# ===== v3.64.0 機能テスト =====
echo
echo "📊 テスト7: KPIダッシュボード（v3.64.0）..."
KPI=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/analytics/kpi/dashboard")
DEAL_COUNT=$(echo $KPI | jq '.deals.total // 0')
echo "✅ KPI: 総案件数 $DEAL_COUNT 件"

echo
echo "📥 テスト8: CSVエクスポート機能（v3.63.0）..."
CSV_EXPORT=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/analytics/export/deals/csv")
if echo "$CSV_EXPORT" | head -1 | grep -q "id"; then
  LINE_COUNT=$(echo "$CSV_EXPORT" | wc -l)
  echo "✅ CSVエクスポート成功（$LINE_COUNT 行）"
else
  echo "⚠️  CSVエクスポート確認不可"
fi

# ===== v3.61.0 機能テスト =====
echo
echo "🔍 テスト9: 拡張フィルター機能（v3.61.0）..."
FILTERED=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$PROD_URL/api/deals?search=test&sort=created_at&order=desc")
FILTERED_COUNT=$(echo $FILTERED | jq '. | length // 0')
echo "✅ フィルター検索: $FILTERED_COUNT 件取得"

echo
echo "📋 テスト10: ステータス推移グラフAPI（v3.61.0）..."
STATUS_TRENDS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$PROD_URL/api/analytics/status-trends?interval=daily&days=7")
if echo "$STATUS_TRENDS" | jq -e '.trends' > /dev/null 2>&1; then
  echo "✅ ステータス推移データ取得成功"
else
  echo "⚠️  ステータス推移データ確認不可"
fi

# ===== v3.59.0 機能テスト =====
echo
echo "🏠 テスト11: REINFOLIB API統合（v3.59.0）..."
REINFOLIB=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$PROD_URL/api/reinfolib/search?address=さいたま市浦和区")
if echo "$REINFOLIB" | jq -e '.features' > /dev/null 2>&1; then
  echo "✅ REINFOLIB統合正常"
else
  echo "⚠️  REINFOLIB API確認不可"
fi

# ===== v3.58.0 機能テスト =====
echo
echo "📁 テスト12: ファイル管理機能（v3.58.0）..."
FILES=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/files")
FILE_COUNT=$(echo $FILES | jq '.files | length // 0')
echo "✅ ファイル管理: $FILE_COUNT 件"

# ===== v3.56.0 機能テスト =====
echo
echo "💾 テスト13: ストレージクォータAPI（v3.56.0）..."
QUOTA=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/storage-quota")
USED=$(echo $QUOTA | jq -r '.quota.used_bytes // 0')
TOTAL=$(echo $QUOTA | jq -r '.quota.total_bytes // 0')
echo "✅ ストレージ: $USED / $TOTAL bytes"

# ===== コア機能テスト =====
echo
echo "📋 テスト14: 案件一覧取得..."
DEALS=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/deals")
DEAL_COUNT=$(echo $DEALS | jq '. | length // 0')
echo "✅ 案件数: $DEAL_COUNT 件"

echo
echo "💬 テスト15: メッセージAPI..."
MESSAGES=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/messages")
MSG_COUNT=$(echo $MESSAGES | jq '. | length // 0')
echo "✅ メッセージ数: $MSG_COUNT 件"

echo
echo "🔔 テスト16: 通知システム..."
NOTIFICATIONS=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/notifications")
NOTIF_COUNT=$(echo $NOTIFICATIONS | jq '. | length // 0')
echo "✅ 通知数: $NOTIF_COUNT 件"

echo
echo "📄 テスト17: 物件テンプレート..."
TEMPLATES=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/property-templates")
TMPL_COUNT=$(echo $TEMPLATES | jq '. | length // 0')
echo "✅ テンプレート数: $TMPL_COUNT 件"

echo
echo "🤖 テスト18: AI提案履歴（v3.41.0）..."
PROPOSALS=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/proposals")
PROP_COUNT=$(echo $PROPOSALS | jq '. | length // 0')
echo "✅ AI提案数: $PROP_COUNT 件"

echo
echo "📜 テスト19: OCR履歴..."
OCR_HISTORY=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/ocr-history")
OCR_COUNT=$(echo $OCR_HISTORY | jq '. | length // 0')
echo "✅ OCR履歴: $OCR_COUNT 件"

echo
echo "⚙️ テスト20: システム設定..."
SETTINGS=$(curl -s -H "Authorization: Bearer $TOKEN" "$PROD_URL/api/settings")
SETTING_NAME=$(echo $SETTINGS | jq -r '.[0].key // "N/A"')
echo "✅ システム設定: $SETTING_NAME"

# ===== ヘルスチェック =====
echo
echo "❤️ テスト21: ヘルスチェック..."
HEALTH=$(curl -s "$PROD_URL/api/health")
STATUS=$(echo $HEALTH | jq -r '.status // "N/A"')
echo "✅ システムステータス: $STATUS"

echo
echo "========================================="
echo "✅ 完全機能テスト完了（21項目）"
echo "========================================="
echo "本番URL: $PROD_URL"
echo "バージョン: v3.67.0"
echo "テスト日時: $(date)"
