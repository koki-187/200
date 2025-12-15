#!/bin/bash

# 環境変数チェックスクリプト
# デプロイ前に実行して、必須環境変数がすべて設定されているか確認

set -e

PROJECT_NAME="real-estate-200units-v2"
REQUIRED_VARS=("OPENAI_API_KEY" "MLIT_API_KEY" "JWT_SECRET" "RESEND_API_KEY")

echo "🔍 Checking Cloudflare Pages Secrets for project: $PROJECT_NAME"
echo ""

# 環境変数リストを取得
SECRET_LIST=$(npx wrangler pages secret list --project-name "$PROJECT_NAME" --env production 2>&1)

# エラーチェック
if echo "$SECRET_LIST" | grep -q "error"; then
  echo "❌ ERROR: Failed to retrieve secret list"
  echo "$SECRET_LIST"
  exit 1
fi

# 各必須環境変数をチェック
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if echo "$SECRET_LIST" | grep -q "$var"; then
    echo "✅ $var: set"
  else
    echo "❌ $var: NOT SET"
    MISSING_VARS+=("$var")
  fi
done

echo ""

# 結果の判定
if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo "🎉 All required environment variables are set!"
  echo ""
  echo "You can proceed with deployment:"
  echo "  npm run build"
  echo "  npx wrangler pages deploy dist --project-name $PROJECT_NAME"
  exit 0
else
  echo "⚠️  WARNING: ${#MISSING_VARS[@]} required variable(s) are missing:"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  echo ""
  echo "Please set the missing variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "  echo \"YOUR_${var}\" | npx wrangler pages secret put $var --project-name $PROJECT_NAME"
  done
  exit 1
fi
