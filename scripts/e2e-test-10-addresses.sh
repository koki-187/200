#!/bin/bash

# 10ヶ所のランダム住所でE2Eテスト v3.153.128
# ローカルサーバー（http://localhost:3000）でテスト実行

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="E2E_TEST_REPORT_${TIMESTAMP}.md"

echo "========================================" | tee $REPORT_FILE
echo "E2Eテストレポート v3.153.128" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE
echo "テスト日時: $(date)" | tee -a $REPORT_FILE
echo "対象URL: $BASE_URL" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# テスト住所リスト（10ヶ所）
declare -a addresses=(
  # 東京都（3ヶ所）
  "東京都渋谷区神宮前1-1-1"
  "東京都世田谷区成城2-1-1"
  "東京都港区台場1-1-1"
  
  # 神奈川県（3ヶ所）
  "神奈川県横浜市西区みなとみらい1-1-1"
  "神奈川県川崎市川崎区駅前本町1-1"
  "神奈川県鎌倉市由比ガ浜1-1-1"
  
  # 埼玉県（2ヶ所）
  "埼玉県さいたま市大宮区桜木町1-1-1"
  "埼玉県川越市幸町1-1"
  
  # 千葉県（2ヶ所）
  "千葉県千葉市中央区市場町1-1"
  "千葉県浦安市舞浜1-1"
)

success_count=0
fail_count=0
total_tests=${#addresses[@]}

echo "## テスト結果サマリー" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# 各住所でテスト実行
for i in "${!addresses[@]}"; do
  address="${addresses[$i]}"
  test_num=$((i + 1))
  
  echo "---" | tee -a $REPORT_FILE
  echo "" | tee -a $REPORT_FILE
  echo "### テスト #$test_num: $address" | tee -a $REPORT_FILE
  echo "" | tee -a $REPORT_FILE
  
  # APIリクエスト実行
  encoded_address=$(echo -n "$address" | jq -sRr @uri)
  response=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/hazard-db/info?address=${encoded_address}")
  
  # HTTPステータスコードを取得
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  echo "**HTTPステータス**: $http_code" | tee -a $REPORT_FILE
  echo "" | tee -a $REPORT_FILE
  
  # ステータスコード判定
  if [ "$http_code" = "200" ]; then
    # JSONパース（successフィールド確認）
    success_field=$(echo "$body" | jq -r '.success' 2>/dev/null)
    
    if [ "$success_field" = "true" ]; then
      # レスポンス内容の検証
      prefecture=$(echo "$body" | jq -r '.data.location.prefecture' 2>/dev/null)
      city=$(echo "$body" | jq -r '.data.location.city' 2>/dev/null)
      hazard_count=$(echo "$body" | jq -r '.data.hazards | length' 2>/dev/null)
      loan_judgment=$(echo "$body" | jq -r '.data.loan.judgment' 2>/dev/null)
      
      echo "**結果**: ✅ 成功" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      echo "**データ内容**:" | tee -a $REPORT_FILE
      echo "- 都道府県: $prefecture" | tee -a $REPORT_FILE
      echo "- 市区町村: $city" | tee -a $REPORT_FILE
      echo "- ハザード件数: $hazard_count件" | tee -a $REPORT_FILE
      echo "- 融資判定: $loan_judgment" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      
      # ハザードタイプの確認
      echo "**ハザード内訳**:" | tee -a $REPORT_FILE
      flood_count=$(echo "$body" | jq '[.data.hazards[] | select(.type=="flood")] | length' 2>/dev/null)
      landslide_count=$(echo "$body" | jq '[.data.hazards[] | select(.type=="landslide")] | length' 2>/dev/null)
      tsunami_count=$(echo "$body" | jq '[.data.hazards[] | select(.type=="tsunami")] | length' 2>/dev/null)
      liquefaction_count=$(echo "$body" | jq '[.data.hazards[] | select(.type=="liquefaction")] | length' 2>/dev/null)
      
      echo "- 洪水: ${flood_count}件" | tee -a $REPORT_FILE
      echo "- 土砂災害: ${landslide_count}件" | tee -a $REPORT_FILE
      echo "- 津波: ${tsunami_count}件" | tee -a $REPORT_FILE
      echo "- 液状化: ${liquefaction_count}件" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      
      success_count=$((success_count + 1))
    else
      echo "**結果**: ❌ 失敗（APIエラー）" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      error_msg=$(echo "$body" | jq -r '.error' 2>/dev/null)
      echo "**エラーメッセージ**: $error_msg" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      fail_count=$((fail_count + 1))
    fi
  else
    echo "**結果**: ❌ 失敗（HTTP $http_code）" | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE
    echo "**レスポンス**: $body" | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE
    fail_count=$((fail_count + 1))
  fi
  
  # 少し待機（APIレート制限対策）
  sleep 0.5
done

echo "---" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE
echo "## 📊 最終結果" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE
echo "- **総テスト数**: ${total_tests}件" | tee -a $REPORT_FILE
echo "- **成功**: ✅ ${success_count}件" | tee -a $REPORT_FILE
echo "- **失敗**: ❌ ${fail_count}件" | tee -a $REPORT_FILE
echo "- **成功率**: $(awk "BEGIN {printf \"%.1f\", ($success_count/$total_tests)*100}")%" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

if [ $fail_count -eq 0 ]; then
  echo "🎉 **全テスト合格！データ品質は良好です。**" | tee -a $REPORT_FILE
elif [ $success_count -ge 8 ]; then
  echo "⚠️ **ほとんどのテストが合格しました。一部のエラーを確認してください。**" | tee -a $REPORT_FILE
else
  echo "❌ **多くのテストが失敗しました。データやAPIの修正が必要です。**" | tee -a $REPORT_FILE
fi

echo "" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
echo "テスト完了: $(date)" | tee -a $REPORT_FILE
echo "レポート: $REPORT_FILE" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE

# レポートを固定名でもコピー
cp $REPORT_FILE E2E_TEST_REPORT_LATEST.md

exit $fail_count
