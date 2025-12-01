#!/bin/bash

echo "========================================="
echo "不要ファイル・コード最適化チェック"
echo "========================================="
echo

# テストスクリプトファイルの確認
echo "📁 テストスクリプトファイル:"
ls -lh *.sh 2>/dev/null || echo "なし"
echo

# ログファイルの確認
echo "📋 ログファイル:"
ls -lh *.log 2>/dev/null || echo "なし"
echo

# 一時ファイルの確認
echo "🗑️ 一時ファイル:"
find . -name "*.tmp" -o -name "*.bak" -o -name "*~" 2>/dev/null | head -10
echo

# node_modules サイズ
echo "📦 node_modules サイズ:"
du -sh node_modules 2>/dev/null || echo "なし"
echo

# dist サイズ
echo "🎯 dist サイズ:"
du -sh dist 2>/dev/null || echo "なし"
echo

# アーカイブディレクトリ
echo "📚 archive ディレクトリ:"
du -sh archive 2>/dev/null || echo "なし"
echo

# 重複ドキュメントチェック
echo "📄 ドキュメントファイル:"
ls -lh *.md 2>/dev/null | wc -l
echo "個のドキュメント"
echo

# コード統計
echo "💻 コード統計:"
echo "TypeScript files: $(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)"
echo "Total lines of code: $(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
echo

echo "✅ チェック完了"
