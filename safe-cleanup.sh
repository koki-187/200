#!/bin/bash

echo "========================================="
echo "不要ファイルの安全な削除"
echo "========================================="
echo

# バックアップ確認
echo "📦 既存のarchiveディレクトリを確認..."
du -sh archive 2>/dev/null || echo "なし"
echo

# 大きなデモ動画を削除（本番不要）
echo "🗑️ 1. デモ動画の削除..."
if [ -f "ocr_demo_video.mp4" ]; then
  SIZE=$(du -h ocr_demo_video.mp4 | cut -f1)
  echo "  ocr_demo_video.mp4 ($SIZE) を削除"
  rm ocr_demo_video.mp4
  echo "  ✅ 削除完了"
else
  echo "  ファイルが存在しません"
fi
echo

# テスト用PDFディレクトリを削除
echo "🗑️ 2. テスト用PDFディレクトリの削除..."
if [ -d "test-pdf-ocr" ]; then
  SIZE=$(du -sh test-pdf-ocr | cut -f1)
  echo "  test-pdf-ocr/ ($SIZE) を削除"
  rm -rf test-pdf-ocr
  echo "  ✅ 削除完了"
else
  echo "  ディレクトリが存在しません"
fi
echo

# 重複スクリプトの削除
echo "🗑️ 3. 重複スクリプトの削除..."
if [ -f "generate-hash.js" ]; then
  echo "  generate-hash.js を削除（.cjs版が存在）"
  rm generate-hash.js
  echo "  ✅ 削除完了"
else
  echo "  ファイルが存在しません"
fi
echo

# テスト用HTMLの削除
echo "🗑️ 4. テスト用HTMLの削除..."
if [ -f "test-deals-page.html" ]; then
  rm test-deals-page.html
  echo "  ✅ test-deals-page.html 削除完了"
else
  echo "  ファイルが存在しません"
fi
if [ -f "dist/test-login.html" ]; then
  rm dist/test-login.html
  echo "  ✅ dist/test-login.html 削除完了"
else
  echo "  ファイルが存在しません"
fi
echo

# 古い分析スクリプトをアーカイブ
echo "📦 5. 古い分析スクリプトのアーカイブ..."
if [ -f "analyze-project-structure.sh" ]; then
  mv analyze-project-structure.sh archive/test_scripts/
  echo "  ✅ analyze-project-structure.sh をアーカイブ"
fi
echo

# 容量確認
echo "📊 削除後の容量:"
echo "  プロジェクト全体: $(du -sh . 2>/dev/null | cut -f1)"
echo "  dist: $(du -sh dist 2>/dev/null | cut -f1)"
echo "  archive: $(du -sh archive 2>/dev/null | cut -f1)"
echo

echo "✅ 安全な削除完了"
