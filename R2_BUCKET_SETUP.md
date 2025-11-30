# R2バケット設定ガイド

## 概要

ファイルアップロード機能を有効にするには、Cloudflare PagesプロジェクトにR2バケットをバインドする必要があります。

## 現在の状態

- ✅ R2バケット作成済み: `real-estate-files`
- ✅ wrangler.jsonc設定済み
- ⚠️ Cloudflare Pagesプロジェクトへのバインディング設定が必要

## 設定手順

### 1. Cloudflare Dashboardにログイン

https://dash.cloudflare.com にアクセスしてログイン

### 2. Pagesプロジェクトに移動

1. 左サイドバーから「Workers & Pages」を選択
2. `real-estate-200units-v2`プロジェクトをクリック

### 3. R2バケットをバインド

1. 「Settings」タブをクリック
2. 「Functions」セクションを見つける
3. 「R2 bucket bindings」を見つける
4. 「Add binding」をクリック
5. 以下を入力:
   - **Variable name**: `FILES_BUCKET`
   - **R2 bucket**: `real-estate-files` を選択
6. 「Save」をクリック

### 4. 再デプロイ

設定を適用するには、再デプロイが必要です:

```bash
cd /home/user/webapp
npm run build
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

## 確認方法

ファイルアップロードをテスト:

```bash
# ログイン
TOKEN=$(curl -s -X POST "https://[YOUR-DEPLOYMENT].real-estate-200units-v2.pages.dev/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}' | jq -r '.token')

# テストファイルをアップロード
echo "Test file" > test.txt
curl -X POST "https://[YOUR-DEPLOYMENT].real-estate-200units-v2.pages.dev/api/r2/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt" \
  -F "dealId=test-deal" \
  -F "folder=deals"

# ストレージ使用量を確認
curl "https://[YOUR-DEPLOYMENT].real-estate-200units-v2.pages.dev/api/r2/storage/usage" \
  -H "Authorization: Bearer $TOKEN"
```

成功すると、`totalSizeMB`が0.00以上の値になります。

## トラブルシューティング

### エラー: "アップロードに失敗しました"

**原因**: R2バケットバインディングが設定されていない

**解決策**: 上記の設定手順3を実施

### エラー: "FILES_BUCKET is undefined"

**原因**: バインディング名が間違っている

**解決策**: Cloudflare Dashboardで`FILES_BUCKET`という名前で設定されているか確認

### ストレージ使用量が常に0MB

**原因1**: ファイルがまだアップロードされていない  
**原因2**: R2バケットへのアクセス権限がない

**解決策**: 
1. テストファイルをアップロードしてみる
2. Cloudflare Dashboardで`real-estate-files`バケットにファイルが存在するか確認

## 追加情報

### R2バケット情報

- **バケット名**: `real-estate-files`
- **作成日**: 2025-11-27
- **場所**: Cloudflareグローバルネットワーク

### ストレージクォータ

- **一般ユーザー**: 3GB
- **管理者**: 20GB
- **合計容量**: 50GB（想定）

### ファイルタイプ

サポートされているファイルタイプ:
- PDF (.pdf)
- 画像 (.jpg, .jpeg, .png, .gif)
- Microsoft Office (.doc, .docx, .xls, .xlsx)
- ZIP (.zip)
- テキスト (.txt, .csv)

最大ファイルサイズ: 10MB

## 参考リンク

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Pages Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
