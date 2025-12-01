#!/bin/bash

echo "========================================="
echo "プロジェクト構成詳細分析"
echo "========================================="
echo

# ルートディレクトリのファイル
echo "📁 ルートディレクトリのファイル:"
ls -lah | grep -v "^d" | grep -v "^total" | awk '{print $9, $5}' | grep -v "^$"
echo

# .gitignoreの確認
echo "🚫 .gitignoreの内容:"
head -20 .gitignore 2>/dev/null || echo "なし"
echo

# node_modules外のJavaScript/TypeScriptファイル
echo "📝 TypeScript/JavaScriptファイル数:"
echo "src/: $(find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" 2>/dev/null | wc -l) files"
echo

# ドキュメントファイル
echo "📚 ドキュメントファイル:"
ls -lh *.md 2>/dev/null | wc -l
echo "個のMarkdownファイル"
ls -lh *.md 2>/dev/null | awk '{print $9, $5}'
echo

# 設定ファイル
echo "⚙️ 設定ファイル:"
ls -lh *.json *.jsonc *.cjs *.config.* 2>/dev/null | awk '{print $9, $5}'
echo

# テストファイル・スクリプト
echo "🧪 テストスクリプト（ルート）:"
ls -lh *.sh 2>/dev/null | awk '{print $9, $5}'
echo

# archiveディレクトリ
echo "📦 archiveディレクトリ:"
du -sh archive 2>/dev/null || echo "なし"
if [ -d "archive" ]; then
  echo "  サブディレクトリ:"
  find archive -type d | head -10
fi
echo

# distディレクトリ
echo "🎯 distディレクトリ:"
du -sh dist 2>/dev/null || echo "なし"
if [ -d "dist" ]; then
  echo "  主要ファイル:"
  ls -lh dist/ | head -10
fi
echo

# .wranglerディレクトリ
echo "🔧 .wranglerディレクトリ:"
du -sh .wrangler 2>/dev/null || echo "なし"
echo

# 大きなファイル（10MB以上）
echo "🐘 大きなファイル（1MB以上）:"
find . -type f -size +1M ! -path "./node_modules/*" ! -path "./.git/*" 2>/dev/null | head -10
echo

# 古いログファイル
echo "📋 ログファイル（.log）:"
find . -name "*.log" ! -path "./node_modules/*" ! -path "./.git/*" 2>/dev/null
echo

# 一時ファイル
echo "🗑️ 一時ファイル（.tmp, .bak, ~）:"
find . \( -name "*.tmp" -o -name "*.bak" -o -name "*~" \) ! -path "./node_modules/*" ! -path "./.git/*" 2>/dev/null
echo

# 重複の可能性があるファイル
echo "🔍 重複の可能性があるファイル:"
echo "  HANDOVER_*.md:"
ls -lh HANDOVER_*.md 2>/dev/null | wc -l
echo "  個"
echo

echo "✅ 分析完了"
