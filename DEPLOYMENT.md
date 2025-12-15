# 🚀 デプロイメントガイド - 200棟土地仕入れ管理システム

**最終更新**: 2025-12-15  
**対象**: Cloudflare Pages本番環境

---

## 📋 目次

1. [必須環境変数の設定](#必須環境変数の設定)
2. [デプロイ前チェックリスト](#デプロイ前チェックリスト)
3. [デプロイ手順](#デプロイ手順)
4. [デプロイ後テスト](#デプロイ後テスト)
5. [トラブルシューティング](#トラブルシューティング)

---

## 🔑 必須環境変数の設定

### ⚠️ 重要な注意事項

**`.dev.vars` ファイルはローカル開発専用です！**
- `.dev.vars` の内容は本番環境に**一切反映されません**
- 本番環境にはCloudflare Pages Secretsを使用して手動で設定が必要

### 環境変数の設定方法

#### 1. OPENAI_API_KEY（OCR機能用）

**取得方法**:
1. https://platform.openai.com/account/api-keys にアクセス
2. 「Create new secret key」をクリック
3. キーをコピー（形式: `sk-proj-...`）

**設定コマンド**:
```bash
echo "YOUR_OPENAI_API_KEY" | npx wrangler pages secret put OPENAI_API_KEY --project-name real-estate-200units-v2
```

**テスト方法**:
```bash
curl https://20c655ab.real-estate-200units-v2.pages.dev/api/ocr-jobs/test-openai
```

成功時のレスポンス:
```json
{
  "success": true,
  "model": "gpt-4o"
}
```

---

#### 2. MLIT_API_KEY（物件情報補足・リスクチェック用）

**取得方法**:
1. MLIT（国土交通省）のAPI利用登録ページにアクセス
2. 利用規約に同意してAPIキーを取得
3. キーをコピー

**設定コマンド**:
```bash
echo "YOUR_MLIT_API_KEY" | npx wrangler pages secret put MLIT_API_KEY --project-name real-estate-200units-v2
```

**テスト方法**:
```bash
curl https://20c655ab.real-estate-200units-v2.pages.dev/api/reinfolib/test
```

成功時のレスポンス:
```json
{
  "success": true,
  "message": "REINFOLIB API is working"
}
```

---

#### 3. JWT_SECRET（認証用）

**生成方法**:
```bash
openssl rand -base64 32
```

**設定コマンド**:
```bash
echo "YOUR_JWT_SECRET" | npx wrangler pages secret put JWT_SECRET --project-name real-estate-200units-v2
```

---

#### 4. RESEND_API_KEY（メール通知用）

**取得方法**:
1. https://resend.com/api-keys にアクセス
2. APIキーを作成（形式: `re_...`）

**設定コマンド**:
```bash
echo "YOUR_RESEND_API_KEY" | npx wrangler pages secret put RESEND_API_KEY --project-name real-estate-200units-v2
```

---

#### 5. SENTRY_DSN（エラートラッキング用、オプション）

**取得方法**:
1. https://sentry.io/ にアクセス
2. プロジェクトを作成してDSNを取得

**設定コマンド**:
```bash
echo "YOUR_SENTRY_DSN" | npx wrangler pages secret put SENTRY_DSN --project-name real-estate-200units-v2
```

---

### 環境変数の確認方法

**すべての設定済み環境変数を確認**:
```bash
npx wrangler pages secret list --project-name real-estate-200units-v2 --env production
```

**期待される出力**:
```
The "production" environment of your Pages project "real-estate-200units-v2" has access to the following secrets:
  - JWT_SECRET: Value Encrypted
  - MLIT_API_KEY: Value Encrypted
  - OPENAI_API_KEY: Value Encrypted
  - RESEND_API_KEY: Value Encrypted
  - SENTRY_DSN: Value Encrypted
```

---

## ✅ デプロイ前チェックリスト

デプロイを実行する前に、以下の項目をすべて確認してください：

### ローカル環境での確認

- [ ] `.dev.vars` ファイルに最新のAPIキーが設定されている
- [ ] `npm install` で依存関係がインストール済み
- [ ] `npm run dev` でローカルサーバーが起動できる
- [ ] ローカル環境でOCR機能が動作する（ファイルアップロード→自動入力）
- [ ] ローカル環境で物件情報補足機能が動作する
- [ ] ローカル環境でリスクチェック機能が動作する
- [ ] すべてのコード変更がGitにコミット済み

### 本番環境の確認

- [ ] Cloudflare Pages Secretsがすべて設定されている（上記コマンドで確認）
- [ ] 本番環境のURLが正しい
- [ ] 前回のデプロイが正常に動作している

### コードの確認

- [ ] エラーハンドリングが適切に実装されている
- [ ] コンソールエラーがない（開発者ツールで確認）
- [ ] TypeScriptのコンパイルエラーがない
- [ ] `npm run build` が成功する

---

## 🚀 デプロイ手順

### 1. ビルド

```bash
cd /home/user/webapp
npm run build
```

**確認ポイント**:
- `dist/` ディレクトリが生成される
- `dist/_worker.js` が存在する
- `dist/_routes.json` が存在する
- ビルドエラーがない

### 2. デプロイ

```bash
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

**確認ポイント**:
- ファイルアップロードが成功する
- Workerのコンパイルが成功する
- デプロイURLが表示される（例: `https://XXXXXXXX.real-estate-200units-v2.pages.dev`）

### 3. デプロイURLの記録

デプロイ成功後、表示されたURLをメモしてください。

**例**:
```
✨ Deployment complete! Take a peek over at https://20c655ab.real-estate-200units-v2.pages.dev
```

---

## 🧪 デプロイ後テスト

デプロイ完了後、**必ず**以下のテストを実施してください。

### テスト1: Health Check（最優先）

```bash
curl https://20c655ab.real-estate-200units-v2.pages.dev/api/health | jq .
```

**期待される結果**:
```json
{
  "status": "healthy",
  "services": {
    "environment_variables": {
      "status": "healthy",
      "details": {
        "OPENAI_API_KEY": "set",
        "JWT_SECRET": "set",
        "MLIT_API_KEY": "set"
      }
    },
    "openai_api": {
      "status": "healthy",
      "response_time_ms": "fast"
    },
    "d1_database": {
      "status": "healthy"
    }
  }
}
```

**❌ エラーの場合**:
- `"status": "unhealthy"` → 環境変数が正しく設定されていない
- `"openai_api": {"status": "error"}` → OPENAI_API_KEYが無効
- 環境変数を再確認して設定し直す

---

### テスト2: OCR機能

```bash
curl https://20c655ab.real-estate-200units-v2.pages.dev/api/ocr-jobs/test-openai | jq .
```

**期待される結果**:
```json
{
  "success": true,
  "model": "gpt-4o"
}
```

**❌ エラーの場合**:
```json
{
  "error": "401 Unauthorized - Incorrect API key provided"
}
```
→ OPENAI_API_KEYを再設定

---

### テスト3: MLIT API（物件情報補足）

```bash
curl https://20c655ab.real-estate-200units-v2.pages.dev/api/reinfolib/test | jq .
```

**期待される結果**:
```json
{
  "success": true,
  "message": "REINFOLIB API is working"
}
```

**❌ エラーの場合**:
```json
{
  "error": "MLIT_API_KEYが設定されていません"
}
```
→ MLIT_API_KEYを再設定

---

### テスト4: 管理者ダッシュボード

ブラウザで以下のURLにアクセス:

1. **メインダッシュボード**: https://20c655ab.real-estate-200units-v2.pages.dev/admin
2. **ヘルスチェック**: https://20c655ab.real-estate-200units-v2.pages.dev/admin/health-check
3. **100回テスト**: https://20c655ab.real-estate-200units-v2.pages.dev/admin/100-tests
4. **自動エラー改善**: https://20c655ab.real-estate-200units-v2.pages.dev/admin/error-improvement

**確認ポイント**:
- ページが正常にロードされる
- コンソールエラーがない（開発者ツールで確認）
- 各機能が動作する

---

### テスト5: 実際のログイン・OCR実行

1. https://20c655ab.real-estate-200units-v2.pages.dev にアクセス
2. テストアカウントでログイン
3. `/deals/new` で案件作成ページにアクセス
4. PDFファイルをアップロードしてOCR実行
5. 物件情報補足ボタンをクリック
6. リスクチェックボタンをクリック

**確認ポイント**:
- すべての機能がエラーなく動作する
- フォームに情報が自動入力される
- エラーダイアログが表示されない

---

## 🔧 トラブルシューティング

### 問題1: Health Checkが `unhealthy` を返す

**原因**: 環境変数が設定されていない

**解決方法**:
```bash
# 環境変数を確認
npx wrangler pages secret list --project-name real-estate-200units-v2

# 不足している環境変数を設定
echo "YOUR_API_KEY" | npx wrangler pages secret put ENV_VAR_NAME --project-name real-estate-200units-v2

# 再デプロイ
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

---

### 問題2: OCR機能が `401 Unauthorized` を返す

**原因**: OPENAI_API_KEYが無効または期限切れ

**解決方法**:
1. https://platform.openai.com/account/api-keys で新しいAPIキーを作成
2. 新しいキーを設定:
```bash
echo "NEW_OPENAI_API_KEY" | npx wrangler pages secret put OPENAI_API_KEY --project-name real-estate-200units-v2
```
3. 再デプロイ

---

### 問題3: MLIT APIが動作しない

**原因**: MLIT_API_KEYが設定されていない、または無効

**解決方法**:
```bash
# キーを再設定
echo "YOUR_MLIT_API_KEY" | npx wrangler pages secret put MLIT_API_KEY --project-name real-estate-200units-v2

# テスト
curl https://20c655ab.real-estate-200units-v2.pages.dev/api/reinfolib/test
```

---

### 問題4: デプロイが失敗する

**原因**: Gitコミットメッセージに日本語が含まれている

**解決方法**:
```bash
# 英語のみでコミット
git commit -m "Deploy version X.X.X - Bug fixes and improvements"

# デプロイ
npx wrangler pages deploy dist --project-name real-estate-200units-v2 --commit-dirty=true
```

---

## 📊 デプロイ後の運用

### 毎回のデプロイ後に実施すること

1. ✅ Health Check APIを実行
2. ✅ OCR APIテストを実行
3. ✅ MLIT APIテストを実行
4. ✅ 管理者ダッシュボードにアクセス
5. ✅ 実際のログイン・OCR実行テスト

### 定期的に実施すること（月1回推奨）

1. ✅ すべての環境変数が最新かつ有効であることを確認
2. ✅ APIキーのローテーション（セキュリティベストプラクティス）
3. ✅ 管理者ダッシュボードの100回テストを実行
4. ✅ エラーログを確認

---

## 🎯 重要なポイント

### ⚠️ 絶対に忘れないこと

1. **`.dev.vars` は本番環境に反映されない！**
   - 必ずCloudflare Pages Secretsで設定する

2. **デプロイ後は必ずテストを実施！**
   - Health Check APIを最優先で実行
   - すべてのAPI疎通テストを実施

3. **環境変数は定期的に棚卸し**
   - APIキーの有効期限を確認
   - 不要な環境変数を削除

4. **エラーが発生したら即座に対応**
   - Health Check APIで問題を特定
   - 環境変数を再設定
   - 再デプロイ＆再テスト

---

## 📞 サポート

問題が解決しない場合は、以下の情報を含めて報告してください：

1. デプロイURL
2. エラーメッセージ
3. Health Check APIの結果
4. 環境変数の設定状況（キーの値は含めない）
5. 実施したトラブルシューティング手順

---

**デプロイガイド v1.0 - 2025-12-15**
