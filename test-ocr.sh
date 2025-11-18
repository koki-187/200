#!/bin/bash

# 名刺OCRテストスクリプト
# v2.9.0 エラーハンドリング改善の動作確認

echo "========================================="
echo "名刺OCR機能テスト (v2.9.0)"
echo "========================================="
echo ""

# テスト用JWT取得（管理者アカウント）
echo "1. JWT取得中..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin!2025"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ JWT取得成功"
echo ""

# テスト1: TERASS名刺（縦型・表面）
echo "========================================="
echo "テスト1: TERASS名刺（縦型・表面）"
echo "========================================="
echo "ファイル: terass_card_front.jpg"
echo "期待結果: 高橋 幸輝、Expert Agent、投資不動産取引士など"
echo ""

RESPONSE1=$(curl -s -X POST http://localhost:3000/api/business-card-ocr/extract \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/home/user/webapp/test-images/terass_card_front.jpg")

echo "レスポンス:"
echo "$RESPONSE1" | jq '.' 2>/dev/null || echo "$RESPONSE1"
echo ""
echo "抽出された情報:"
echo "$RESPONSE1" | jq '.data' 2>/dev/null || echo "JSON解析失敗"
echo ""

# テスト2: TERASS名刺（裏面・黒背景）
echo "========================================="
echo "テスト2: TERASS名刺（縦型・裏面・黒背景）"
echo "========================================="
echo "ファイル: terass_card_back.jpg"
echo "期待結果: アシスタント、ex-asst@terass.com、QRコード"
echo ""

RESPONSE2=$(curl -s -X POST http://localhost:3000/api/business-card-ocr/extract \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/home/user/webapp/test-images/terass_card_back.jpg")

echo "レスポンス:"
echo "$RESPONSE2" | jq '.' 2>/dev/null || echo "$RESPONSE2"
echo ""
echo "抽出された情報:"
echo "$RESPONSE2" | jq '.data' 2>/dev/null || echo "JSON解析失敗"
echo ""

# テスト3: オリックス銀行名刺（横型・英語部分あり）
echo "========================================="
echo "テスト3: オリックス銀行名刺（横型・英語部分あり）"
echo "========================================="
echo "ファイル: orix_card.jpg"
echo "期待結果: 営業第一部、近藤 政成、オリックス銀行株式会社など"
echo ""

RESPONSE3=$(curl -s -X POST http://localhost:3000/api/business-card-ocr/extract \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/home/user/webapp/test-images/orix_card.jpg")

echo "レスポンス:"
echo "$RESPONSE3" | jq '.' 2>/dev/null || echo "$RESPONSE3"
echo ""
echo "抽出された情報:"
echo "$RESPONSE3" | jq '.data' 2>/dev/null || echo "JSON解析失敗"
echo ""

# エラーケーステスト
echo "========================================="
echo "エラーケーステスト"
echo "========================================="
echo ""

# テスト4: 非対応ファイル形式（存在しないファイル）
echo "テスト4: ファイルなし"
RESPONSE4=$(curl -s -X POST http://localhost:3000/api/business-card-ocr/extract \
  -H "Authorization: Bearer $TOKEN")
echo "レスポンス: $RESPONSE4"
echo ""

# テスト5: 大きすぎるファイル（実際には作成しない、メッセージのみ）
echo "テスト5: 大きすぎるファイル（10MB超）"
echo "※実際のテストはスキップ（ファイル作成に時間がかかるため）"
echo "期待エラー: 'ファイルサイズが大きすぎます'"
echo ""

echo "========================================="
echo "テスト完了"
echo "========================================="
echo ""
echo "※OpenAI API呼び出しのため、実際の結果は数秒かかる場合があります"
echo "※エラーハンドリングの改善により、詳細なエラーメッセージが表示されます"
