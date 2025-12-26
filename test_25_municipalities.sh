#!/bin/bash

# 未統合25自治体のE2Eテスト
# 各自治体のAPI応答を検証

API_BASE="http://localhost:3000/api/integrated-property-search/info"

echo "=========================================="
echo "未統合25自治体 E2Eテスト"
echo "=========================================="
echo ""

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# テスト関数
test_city() {
    local address="$1"
    local city_name="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo "Testing: ${city_name} (${address})"
    
    RESPONSE=$(curl -s "${API_BASE}?address=${address}")
    
    # JSON解析
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
    VERIFICATION=$(echo "$RESPONSE" | jq -r '.data.building_regulations.verification_status // "null"')
    DATA_SOURCE=$(echo "$RESPONSE" | jq -r '.data.building_regulations.data_source // "null"')
    
    if [ "$SUCCESS" = "true" ] && [ "$VERIFICATION" != "null" ] && [ "$VERIFICATION" != "" ]; then
        echo "  ✅ PASSED"
        echo "  📊 Verification: ${VERIFICATION}"
        echo "  📄 Source: ${DATA_SOURCE}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  ❌ FAILED"
        echo "  📊 Verification: ${VERIFICATION}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo ""
}

echo "=========================================="
echo "神奈川県（9市）"
echo "=========================================="
echo ""

test_city "神奈川県横浜市西区みなとみらい1丁目1番地" "横浜市"
test_city "神奈川県平塚市浅間町1丁目1番地" "平塚市"
test_city "神奈川県小田原市荻窪1丁目1番地" "小田原市"
test_city "神奈川県三浦市城山町1丁目1番地" "三浦市"
test_city "神奈川県秦野市桜町1丁目1番地" "秦野市"
test_city "神奈川県厚木市中町1丁目1番地" "厚木市"
test_city "神奈川県伊勢原市田中1丁目1番地" "伊勢原市"
test_city "神奈川県海老名市中央1丁目1番地" "海老名市"
test_city "神奈川県座間市緑ケ丘1丁目1番地" "座間市"

echo "=========================================="
echo "千葉県（5市）"
echo "=========================================="
echo ""

test_city "千葉県習志野市津田沼1丁目1番地" "習志野市"
test_city "千葉県流山市平和台1丁目1番地" "流山市"
test_city "千葉県八千代市大和田新田1丁目1番地" "八千代市"
test_city "千葉県市原市国分寺台中央1丁目1番地" "市原市"
test_city "千葉県佐倉市海隣寺町1丁目1番地" "佐倉市"

echo "=========================================="
echo "埼玉県（11市）"
echo "=========================================="
echo ""

test_city "埼玉県川越市元町1丁目1番地" "川越市"
test_city "埼玉県越谷市越ヶ谷1丁目1番地" "越谷市"
test_city "埼玉県熊谷市宮町1丁目1番地" "熊谷市"
test_city "埼玉県春日部市中央1丁目1番地" "春日部市"
test_city "埼玉県上尾市本町1丁目1番地" "上尾市"
test_city "埼玉県戸田市上戸田1丁目1番地" "戸田市"
test_city "埼玉県蕨市中央1丁目1番地" "蕨市"
test_city "埼玉県朝霞市本町1丁目1番地" "朝霞市"
test_city "埼玉県和光市広沢1丁目1番地" "和光市"
test_city "埼玉県新座市野火止1丁目1番地" "新座市"
test_city "埼玉県久喜市下早見1丁目1番地" "久喜市"

echo "=========================================="
echo "テスト結果サマリー"
echo "=========================================="
echo "Total Tests:  ${TOTAL_TESTS}"
echo "Passed:       ${PASSED_TESTS}"
echo "Failed:       ${FAILED_TESTS}"

if [ ${FAILED_TESTS} -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", (${PASSED_TESTS}/${TOTAL_TESTS})*100}")
    echo "Success Rate: ${SUCCESS_RATE}%"
    echo ""
    echo "⚠️  Some tests failed. Please check the data integration."
    exit 1
else
    echo "Success Rate: 100.0%"
    echo ""
    echo "✅ All tests passed!"
    exit 0
fi
