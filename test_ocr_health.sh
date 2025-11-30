#!/bin/bash

URL="https://73fb25f6.real-estate-200units-v2.pages.dev"

echo "=========================================="
echo "OCR Health Check Test"
echo "=========================================="
echo "Production URL: $URL"
echo "Date: $(date -u +"%Y/%m/%d %H:%M UTC")"
echo ""

# ログイン
echo "1. Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# OCRエンドポイントの確認（実際のファイルなしでエラー応答を確認）
echo "2. Check OCR Endpoint..."
OCR_TEST=$(curl -s -X POST "$URL/api/ocr/extract" \
  -H "Authorization: Bearer $TOKEN")

echo "OCR Endpoint Response:"
echo "$OCR_TEST" | jq '.'
echo ""

# OPENAI_API_KEY設定チェック
if echo "$OCR_TEST" | grep -q "OpenAI API keyが設定されていません"; then
  echo "❌ OpenAI API Key is NOT configured"
  echo "Please set OPENAI_API_KEY in Cloudflare Pages settings"
elif echo "$OCR_TEST" | grep -q "ファイルが指定されていません"; then
  echo "✅ OpenAI API Key is configured (endpoint is working)"
else
  echo "ℹ️  OCR Endpoint response: $OCR_TEST"
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
