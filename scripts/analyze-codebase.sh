#!/bin/bash
# コードベース分析スクリプト v3.153.127

echo "=== コードベース分析開始 ==="
echo ""

# 1. ファイルサイズ分析
echo "【1. 大きなファイル（100KB以上）】"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -size +100k -exec ls -lh {} \; | awk '{print $5, $9}' || echo "なし"
echo ""

# 2. 重複の可能性がある関数名
echo "【2. 重複関数名の検出】"
grep -rh "^function\|^export function\|^const.*=.*function\|^export const.*=.*function" src --include="*.ts" --include="*.tsx" | sed 's/.*function \([a-zA-Z0-9_]*\).*/\1/' | sort | uniq -d | head -20 || echo "検出なし"
echo ""

# 3. 使用されていない可能性のあるエクスポート
echo "【3. エクスポート分析】"
echo "総エクスポート数: $(grep -rh "^export" src --include="*.ts" --include="*.tsx" | wc -l)"
echo ""

# 4. importが多いファイル（依存関係が複雑）
echo "【4. import文が多いファイル（TOP 10）】"
find src -name "*.ts" -o -name "*.tsx" | xargs -I {} sh -c 'echo "$(grep -c "^import" {}) {}"' | sort -rn | head -10
echo ""

# 5. 使用されていないimport検出（簡易版）
echo "【5. 未使用の可能性があるファイル（importされていない）】"
for file in src/utils/*.ts src/utils/*.tsx; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    count=$(grep -r "from.*${filename%.*}" src --include="*.ts" --include="*.tsx" | wc -l)
    if [ "$count" -eq 1 ]; then
      echo "  - $file (import数: $count)"
    fi
  fi
done
echo ""

# 6. コメントアウトされたコード
echo "【6. コメントアウトされたコード行数】"
grep -rh "^\s*//" src --include="*.ts" --include="*.tsx" | wc -l
echo ""

# 7. console.log の数（本番環境では不要）
echo "【7. console.log の数】"
grep -rh "console.log\|console.error\|console.warn" src --include="*.ts" --include="*.tsx" | wc -l
echo ""

echo "=== 分析完了 ==="
