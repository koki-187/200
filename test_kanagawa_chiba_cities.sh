#!/bin/bash

# E2Eテスト: 神奈川県4市 + 千葉県5市 VERIFIED自治体
echo "=========================================="
echo "E2E Test: Kanagawa 4 cities + Chiba 5 cities"
echo "=========================================="

BASE_URL="http://localhost:3000"

# テスト対象の自治体リスト（市レベルで検索）
declare -a ADDRESSES=(
  "神奈川県藤沢市"
  "神奈川県茅ヶ崎市"
  "神奈川県大和市"
  "神奈川県横須賀市"
  "千葉県千葉市"
  "千葉県船橋市"
  "千葉県市川市"
  "千葉県松戸市"
  "千葉県柏市"
)

SUCCESS_COUNT=0
FAIL_COUNT=0

for ADDRESS in "${ADDRESSES[@]}"; do
  echo ""
  echo "Testing: $ADDRESS"
  ENCODED_ADDRESS=$(printf %s "$ADDRESS" | jq -sRr @uri)
  
  RESPONSE=$(curl -s "$BASE_URL/api/integrated-property-search/info?address=$ENCODED_ADDRESS")
  
  # JSONパース可能かチェック
  if echo "$RESPONSE" | jq -e . >/dev/null 2>&1; then
    # 主要フィールドの存在確認
    HAS_SUCCESS=$(echo "$RESPONSE" | jq -r '.success // empty')
    HAS_BUILDING_REG=$(echo "$RESPONSE" | jq -r '.data.building_regulations // empty')
    HAS_VERIFICATION=$(echo "$RESPONSE" | jq -r '.data.building_regulations.verification_status // empty')
    HAS_DATA_SOURCE=$(echo "$RESPONSE" | jq -r '.data.building_regulations.data_source // empty')
    
    # VERIFIEDまたはverifiedであればOK
    if [[ "$HAS_SUCCESS" == "true" && -n "$HAS_BUILDING_REG" && ( "$HAS_VERIFICATION" == "VERIFIED" || "$HAS_VERIFICATION" == "verified" ) ]]; then
      echo "✅ SUCCESS: Data retrieved and verified"
      echo "   Data source: $HAS_DATA_SOURCE"
      echo "   Confidence: $(echo "$RESPONSE" | jq -r '.data.building_regulations.confidence_level // "N/A"')"
      echo "   Development guideline: $(echo "$RESPONSE" | jq -r '.data.building_regulations.details.development_guideline // "N/A"')"
      MIN_UNIT_AREA=$(echo "$RESPONSE" | jq -r '.data.building_regulations.details.building_design.min_unit_area // empty')
      if [[ -n "$MIN_UNIT_AREA" && "$MIN_UNIT_AREA" != "null" ]]; then
        echo "   Min unit area: ${MIN_UNIT_AREA}㎡"
      fi
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
      echo "❌ FAIL: Missing required fields or not VERIFIED"
      echo "   verification_status: $HAS_VERIFICATION"
      echo "   Response preview: $(echo "$RESPONSE" | jq -c '.data.building_regulations | {verification_status, data_source}')"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
  else
    echo "❌ FAIL: Invalid JSON response"
    echo "   Response: $RESPONSE"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo ""
echo "=========================================="
echo "E2E Test Results Summary"
echo "=========================================="
echo "Total tests: ${#ADDRESSES[@]}"
echo "Success: $SUCCESS_COUNT"
echo "Failed: $FAIL_COUNT"
if [ ${#ADDRESSES[@]} -gt 0 ]; then
  SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", $SUCCESS_COUNT * 100 / ${#ADDRESSES[@]}}")
  echo "Success rate: ${SUCCESS_RATE}%"
else
  echo "Success rate: 0%"
fi
echo "=========================================="

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✅ All E2E tests passed!"
  exit 0
else
  echo "⚠️ Some E2E tests failed"
  exit 1
fi
