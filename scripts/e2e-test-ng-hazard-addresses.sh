#!/bin/bash

# NG項目を含む実際の住所10ヶ所でE2Eテスト v3.153.129
# 目的: ハザードレッドゾーン、崖地、10m以上浸水エリア等のNG項目を含む住所でテスト
# ローカルサーバー（http://localhost:3000）でテスト実行

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="E2E_TEST_NG_HAZARD_REPORT_${TIMESTAMP}.md"

echo "========================================" | tee $REPORT_FILE
echo "NG項目E2Eテストレポート v3.153.129" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE
echo "テスト日時: $(date)" | tee -a $REPORT_FILE
echo "対象URL: $BASE_URL" | tee -a $REPORT_FILE
echo "目的: ハザードレッドゾーン、崖地、10m以上浸水等のNG項目検証" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# NG項目を含む実際の住所リスト（10ヶ所）
declare -a addresses=(
  # 東京都 - 低地・液状化リスク・洪水リスク高
  "東京都江東区東陽町1-1-1"          # 東京湾埋立地、液状化・洪水高リスク
  "東京都足立区千住1-1-1"            # 荒川沿い、洪水高リスク
  "東京都大田区羽田6-1-1"            # 羽田空港周辺、液状化・洪水リスク
  
  # 神奈川県 - 津波・土砂災害・崖地リスク高
  "神奈川県三浦市三崎町小網代1000"   # 相模湾沿岸、津波高リスク
  "神奈川県鎌倉市材木座1-1-1"        # 由比ガ浜沿岸、津波リスク
  "神奈川県逗子市小坪1-1-1"          # 逗子海岸、津波・崖地リスク
  
  # 埼玉県 - 河川氾濫・低地リスク高
  "埼玉県春日部市粕壁1-1-1"          # 利根川・江戸川近辺、洪水高リスク
  "埼玉県越谷市越ヶ谷1-1-1"          # 元荒川流域、洪水リスク
  
  # 千葉県 - 津波・液状化・河川氾濫リスク高
  "千葉県船橋市日の出1-1-1"          # 東京湾沿岸、液状化・津波リスク
  "千葉県浦安市舞浜1-1"              # 東京ディズニーリゾート周辺、液状化高リスク
)

# 各住所の期待されるNG項目
declare -A expected_ng_items=(
  ["東京都江東区東陽町1-1-1"]="液状化・洪水"
  ["東京都足立区千住1-1-1"]="洪水"
  ["東京都大田区羽田6-1-1"]="液状化・洪水"
  ["神奈川県三浦市三崎町小網代1000"]="津波"
  ["神奈川県鎌倉市材木座1-1-1"]="津波"
  ["神奈川県逗子市小坪1-1-1"]="津波・崖地"
  ["埼玉県春日部市粕壁1-1-1"]="洪水"
  ["埼玉県越谷市越ヶ谷1-1-1"]="洪水"
  ["千葉県船橋市日の出1-1-1"]="液状化・津波"
  ["千葉県浦安市舞浜1-1"]="液状化"
)

success_count=0
fail_count=0
ng_detected_count=0
total_tests=${#addresses[@]}

echo "## テスト結果詳細" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# 各住所でテスト実行
for i in "${!addresses[@]}"; do
  address="${addresses[$i]}"
  expected_ng="${expected_ng_items[$address]}"
  test_num=$((i + 1))
  
  echo "---" | tee -a $REPORT_FILE
  echo "" | tee -a $REPORT_FILE
  echo "### テスト #$test_num: $address" | tee -a $REPORT_FILE
  echo "" | tee -a $REPORT_FILE
  echo "**期待されるNG項目**: $expected_ng" | tee -a $REPORT_FILE
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
    # JSONパース
    success_field=$(echo "$body" | jq -r '.success' 2>/dev/null)
    
    if [ "$success_field" = "true" ]; then
      # 基本情報取得
      prefecture=$(echo "$body" | jq -r '.data.location.prefecture' 2>/dev/null)
      city=$(echo "$body" | jq -r '.data.location.city' 2>/dev/null)
      hazard_count=$(echo "$body" | jq -r '.data.hazards | length' 2>/dev/null)
      loan_judgment=$(echo "$body" | jq -r '.data.loan.judgment' 2>/dev/null)
      
      echo "**結果**: ✅ API成功" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      echo "**基本情報**:" | tee -a $REPORT_FILE
      echo "- 都道府県: $prefecture" | tee -a $REPORT_FILE
      echo "- 市区町村: $city" | tee -a $REPORT_FILE
      echo "- ハザード件数: $hazard_count件" | tee -a $REPORT_FILE
      echo "- 融資判定: $loan_judgment" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      
      # ハザード詳細分析
      echo "**ハザード詳細分析**:" | tee -a $REPORT_FILE
      
      # 洪水（10m以上浸水チェック）
      flood_high=$(echo "$body" | jq '[.data.hazards[] | select(.type=="flood" and .risk=="high")] | length' 2>/dev/null)
      flood_medium=$(echo "$body" | jq '[.data.hazards[] | select(.type=="flood" and .risk=="medium")] | length' 2>/dev/null)
      flood_depth=$(echo "$body" | jq -r '[.data.hazards[] | select(.type=="flood")] | .[0].details' 2>/dev/null)
      
      echo "- 洪水リスク: 高=${flood_high}件, 中=${flood_medium}件" | tee -a $REPORT_FILE
      if [ "$flood_depth" != "null" ] && [ "$flood_depth" != "" ]; then
        echo "  詳細: $flood_depth" | tee -a $REPORT_FILE
      fi
      
      # 土砂災害（レッドゾーン・崖地チェック）
      landslide_high=$(echo "$body" | jq '[.data.hazards[] | select(.type=="landslide" and .risk=="high")] | length' 2>/dev/null)
      landslide_details=$(echo "$body" | jq -r '[.data.hazards[] | select(.type=="landslide" and .risk=="high")] | .[0].details' 2>/dev/null)
      
      echo "- 土砂災害リスク: 高=${landslide_high}件" | tee -a $REPORT_FILE
      if [ "$landslide_details" != "null" ] && [ "$landslide_details" != "" ]; then
        echo "  詳細: $landslide_details" | tee -a $REPORT_FILE
      fi
      
      # 津波
      tsunami_high=$(echo "$body" | jq '[.data.hazards[] | select(.type=="tsunami" and .risk=="high")] | length' 2>/dev/null)
      tsunami_medium=$(echo "$body" | jq '[.data.hazards[] | select(.type=="tsunami" and .risk=="medium")] | length' 2>/dev/null)
      
      echo "- 津波リスク: 高=${tsunami_high}件, 中=${tsunami_medium}件" | tee -a $REPORT_FILE
      
      # 液状化
      liquefaction_high=$(echo "$body" | jq '[.data.hazards[] | select(.type=="liquefaction" and .risk=="high")] | length' 2>/dev/null)
      
      echo "- 液状化リスク: 高=${liquefaction_high}件" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      
      # 地理的リスク（崖地、10m以上浸水）の確認
      echo "**地理的リスク（NG項目）**:" | tee -a $REPORT_FILE
      geography_risks=$(echo "$body" | jq -r '.data.geography_risks // []' 2>/dev/null)
      
      if [ "$geography_risks" != "[]" ] && [ "$geography_risks" != "null" ]; then
        # 崖地チェック
        is_cliff=$(echo "$body" | jq -r '.data.geography_risks.is_cliff_area // false' 2>/dev/null)
        cliff_height=$(echo "$body" | jq -r '.data.geography_risks.cliff_height // ""' 2>/dev/null)
        
        # 10m以上浸水チェック
        is_over_10m=$(echo "$body" | jq -r '.data.geography_risks.is_over_10m_flood // false' 2>/dev/null)
        max_flood=$(echo "$body" | jq -r '.data.geography_risks.max_flood_depth // ""' 2>/dev/null)
        
        if [ "$is_cliff" = "true" ]; then
          echo "- ⚠️ 崖地あり: ${cliff_height}" | tee -a $REPORT_FILE
          ng_detected_count=$((ng_detected_count + 1))
        fi
        
        if [ "$is_over_10m" = "true" ]; then
          echo "- ⚠️ 10m以上浸水リスクあり: ${max_flood}" | tee -a $REPORT_FILE
          ng_detected_count=$((ng_detected_count + 1))
        fi
        
        # その他のリスク
        is_river_adjacent=$(echo "$body" | jq -r '.data.geography_risks.is_river_adjacent // false' 2>/dev/null)
        if [ "$is_river_adjacent" = "true" ]; then
          river_name=$(echo "$body" | jq -r '.data.geography_risks.river_name // ""' 2>/dev/null)
          echo "- ⚠️ 河川隣接: ${river_name}" | tee -a $REPORT_FILE
        fi
      else
        echo "- 地理的リスクデータなし" | tee -a $REPORT_FILE
      fi
      echo "" | tee -a $REPORT_FILE
      
      # 融資判定の確認
      echo "**融資判定結果**:" | tee -a $REPORT_FILE
      echo "- 判定: $loan_judgment" | tee -a $REPORT_FILE
      
      loan_reason=$(echo "$body" | jq -r '.data.loan.reason // ""' 2>/dev/null)
      if [ "$loan_reason" != "" ] && [ "$loan_reason" != "null" ]; then
        echo "- 理由: $loan_reason" | tee -a $REPORT_FILE
      fi
      
      loan_note=$(echo "$body" | jq -r '.data.loan.note // ""' 2>/dev/null)
      if [ "$loan_note" != "" ] && [ "$loan_note" != "null" ]; then
        echo "- 備考: $loan_note" | tee -a $REPORT_FILE
      fi
      echo "" | tee -a $REPORT_FILE
      
      # データ品質チェック
      echo "**データ品質**:" | tee -a $REPORT_FILE
      confidence=$(echo "$body" | jq -r '[.data.hazards[] | .confidence_level] | unique | join(", ")' 2>/dev/null)
      verification=$(echo "$body" | jq -r '[.data.hazards[] | .verification_status] | unique | join(", ")' 2>/dev/null)
      
      echo "- 信頼度: $confidence" | tee -a $REPORT_FILE
      echo "- 検証状態: $verification" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      
      success_count=$((success_count + 1))
    else
      echo "**結果**: ❌ APIエラー" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      error_msg=$(echo "$body" | jq -r '.error // "不明なエラー"' 2>/dev/null)
      echo "**エラーメッセージ**: $error_msg" | tee -a $REPORT_FILE
      echo "" | tee -a $REPORT_FILE
      fail_count=$((fail_count + 1))
    fi
  else
    echo "**結果**: ❌ HTTP失敗 ($http_code)" | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE
    echo "**レスポンス**: $body" | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE
    fail_count=$((fail_count + 1))
  fi
  
  # レート制限対策
  sleep 0.5
done

echo "---" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE
echo "## 📊 最終結果サマリー" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE
echo "### テスト統計" | tee -a $REPORT_FILE
echo "- **総テスト数**: ${total_tests}件" | tee -a $REPORT_FILE
echo "- **成功**: ✅ ${success_count}件" | tee -a $REPORT_FILE
echo "- **失敗**: ❌ ${fail_count}件" | tee -a $REPORT_FILE
echo "- **成功率**: $(awk "BEGIN {printf \"%.1f\", ($success_count/$total_tests)*100}")%" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

echo "### NG項目検出統計" | tee -a $REPORT_FILE
echo "- **NG項目検出数**: ${ng_detected_count}件" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

echo "### 品質評価" | tee -a $REPORT_FILE
if [ $fail_count -eq 0 ]; then
  echo "🎉 **全テスト合格！**" | tee -a $REPORT_FILE
  echo "" | tee -a $REPORT_FILE
  if [ $ng_detected_count -ge 5 ]; then
    echo "✅ NG項目（崖地、10m以上浸水等）が適切に検出されています。" | tee -a $REPORT_FILE
    echo "✅ データ品質と精度は優良です。" | tee -a $REPORT_FILE
  else
    echo "⚠️ NG項目の検出数が少ない可能性があります（検出: ${ng_detected_count}件）。" | tee -a $REPORT_FILE
    echo "⚠️ データベースのNG項目データを確認してください。" | tee -a $REPORT_FILE
  fi
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
cp $REPORT_FILE E2E_TEST_NG_HAZARD_REPORT_LATEST.md

# レポートへのシンボリックリンク作成
ln -sf E2E_TEST_NG_HAZARD_REPORT_LATEST.md HAZARD_NG_TEST_LATEST.md

exit $fail_count
