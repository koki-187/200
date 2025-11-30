#!/bin/bash

URL="https://73fb25f6.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "OCR File Upload Test"
echo "=========================================="
echo "Production URL: $URL"
echo ""

# ログイン
echo "1. Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

# シンプルなテキストファイルを作成（OCRの代わりに）
echo "2. Creating test file..."
cat > test_property.txt << 'TESTFILE'
物件概要書

物件名: テスト物件
所在地: 東京都千代田区丸の内1-1-1
価格: 5,000万円
土地面積: 100㎡
建物面積: 80㎡
用途地域: 商業地域
建蔽率: 80%
容積率: 600%
TESTFILE

echo "✅ Test file created"
echo ""

# OCRエンドポイントにファイルをアップロード
echo "3. Testing OCR endpoint..."
OCR_RESPONSE=$(curl -s -X POST "$URL/api/ocr/extract" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_property.txt")

echo "OCR Response:"
echo "$OCR_RESPONSE" | jq '.'
echo ""

# OpenAI API Key設定チェック
if echo "$OCR_RESPONSE" | grep -q "OpenAI API keyが設定されていません"; then
  echo "❌ RESULT: OpenAI API Key is NOT configured"
  echo "   Action Required: Set OPENAI_API_KEY in Cloudflare Pages settings"
  echo "   Status: OCR機能は使用できません"
elif echo "$OCR_RESPONSE" | grep -q "success.*true"; then
  echo "✅ RESULT: OCR processing succeeded"
  echo "   OpenAI API Key is properly configured"
  echo "   Status: OCR機能は正常に動作しています"
elif echo "$OCR_RESPONSE" | grep -q "error"; then
  ERROR_MSG=$(echo "$OCR_RESPONSE" | jq -r '.error // .details // "Unknown error"')
  echo "⚠️  RESULT: OCR processing failed"
  echo "   Error: $ERROR_MSG"
  echo "   Status: OpenAI API Key設定を確認してください"
else
  echo "ℹ️  RESULT: Unexpected response"
  echo "   Status: 詳細な確認が必要です"
fi

# クリーンアップ
rm -f test_property.txt

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
