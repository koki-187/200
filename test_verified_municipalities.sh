#!/bin/bash

# 11 VERIFIED自治体のE2Eテスト
echo "=========================================="
echo "E2E Test: 11 VERIFIED Municipalities"
echo "=========================================="

BASE_URL="http://localhost:3000"

# テスト対象の自治体リスト
declare -a ADDRESSES=(
  "東京都千代田区九段南1丁目1番地"
  "東京都中央区築地1丁目1番地"
  "東京都新宿区歌舞伎町1丁目1番地"
  "東京都江東区豊洲1丁目1番地"
  "東京都品川区大井1丁目1番地"
  "東京都目黒区目黒1丁目1番地"
  "東京都大田区蒲田1丁目1番地"
  "東京都板橋区板橋1丁目1番地"
  "東京都江戸川区中央1丁目1番地"
  "神奈川県川崎市川崎区宮本町1番地"
  "神奈川県相模原市中央区中央1丁目1番地"
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
    
    # VERIFIEDであればOK（拡張テーブルデータは不要）
    if [[ "$HAS_SUCCESS" == "true" && -n "$HAS_BUILDING_REG" && ( "$HAS_VERIFICATION" == "VERIFIED" || "$HAS_VERIFICATION" == "verified" ) ]]; then
      echo "✅ SUCCESS: Data retrieved and verified"
      echo "   Data source: $HAS_DATA_SOURCE"
      echo "   Confidence: $(echo "$RESPONSE" | jq -r '.data.building_regulations.confidence_level // "N/A"')"
      echo "   Apartment construction: $(echo "$RESPONSE" | jq -r '.data.building_regulations.details.apartment_construction_feasible // "N/A"')"
      MIN_UNIT_AREA=$(echo "$RESPONSE" | jq -r '.data.building_regulations.details.building_design.min_unit_area // empty')
      if [[ -n "$MIN_UNIT_AREA" && "$MIN_UNIT_AREA" != "null" ]]; then
        echo "   Min unit area: ${MIN_UNIT_AREA}㎡"
      fi
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
      echo "❌ FAIL: Missing required fields or not VERIFIED"
      echo "   verification_status: $HAS_VERIFICATION"
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
echo "Success rate: $(echo "scale=1; $SUCCESS_COUNT * 100 / ${#ADDRESSES[@]}" | bc)%"
echo "=========================================="

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✅ All E2E tests passed!"
  exit 0
else
  echo "⚠️ Some E2E tests failed"
  exit 1
fi
