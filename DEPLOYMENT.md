# 🚀 本番デプロイメントガイド

## 📋 デプロイ前チェックリスト

### 必須作業
- [ ] Cloudflare Pagesプロジェクト作成
- [ ] D1データベース作成・マイグレーション実行
- [ ] 環境変数（Secrets）設定
- [ ] GitHub連携設定
- [ ] デプロイテスト

---

## 🔧 ステップ1: Cloudflare Pages プロジェクト作成

### 1-1. Cloudflare API Key設定（ローカル環境）

```bash
# setup_cloudflare_api_key ツールを使用
# または手動で設定
export CLOUDFLARE_API_TOKEN=your-token-here
```

### 1-2. プロジェクト作成

```bash
cd /home/user/webapp

# プロジェクト作成（mainブランチを本番ブランチに設定）
npx wrangler pages project create webapp \
  --production-branch main \
  --compatibility-date 2024-01-01
```

**注意**: プロジェクト名が重複している場合は別名（例: `webapp-2`, `land-acquisition-app`）を使用してください。

---

## 💾 ステップ2: D1データベース作成

### 2-1. 本番用D1データベース作成

```bash
# D1データベース作成
npx wrangler d1 create webapp-production

# 出力例：
# ✅ Successfully created DB 'webapp-production'!
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "webapp-production"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2-2. wrangler.jsonc 更新

`database_id` を実際の値に更新：

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-production",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // 実際のIDに変更
      "migrations_dir": "migrations"
    }
  ]
}
```

### 2-3. マイグレーション実行

```bash
# 本番データベースにマイグレーション実行
npx wrangler d1 migrations apply webapp-production

# 確認
npx wrangler d1 execute webapp-production \
  --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 2-4. 初期ユーザー作成（本番用）

**重要**: 本番環境では安全なパスワードを使用してください。

```bash
# bcryptハッシュを生成（Nodeスクリプト）
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_SECURE_PASSWORD', 10).then(console.log)"

# 出力されたハッシュを使用してユーザー作成
npx wrangler d1 execute webapp-production \
  --command="INSERT INTO users (id, email, password_hash, name, role) 
             VALUES ('admin-prod', 'admin@yourcompany.com', 
             '\$2a\$10\$...', '管理者', 'ADMIN')"
```

---

## 🔐 ステップ3: 環境変数（Secrets）設定

### 3-1. 必須シークレット

```bash
# OpenAI API Key（OCR・AI提案機能に必要）
npx wrangler pages secret put OPENAI_API_KEY --project-name webapp
# 入力: sk-proj-...

# JWT Secret（認証に必要）
npx wrangler pages secret put JWT_SECRET --project-name webapp
# 入力: ランダムな長い文字列（32文字以上推奨）

# Resend API Key（メール通知に必要）
npx wrangler pages secret put RESEND_API_KEY --project-name webapp
# 入力: re_...
```

### 3-2. シークレット確認

```bash
# 設定済みシークレット一覧表示
npx wrangler pages secret list --project-name webapp
```

### 3-3. シークレット生成例

**JWT_SECRET生成**:
```bash
# Linuxの場合
openssl rand -base64 32

# または
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🏗️ ステップ4: ビルドとデプロイ

### 4-1. ローカルビルドテスト

```bash
# ビルド実行
npm run build

# dist/ディレクトリの確認
ls -lh dist/

# 必須ファイル確認
# - _worker.js (メインアプリケーション)
# - static/ (静的ファイル)
```

### 4-2. 初回デプロイ

```bash
# ビルドしてデプロイ
npm run deploy:prod

# または手動
npm run build
npx wrangler pages deploy dist --project-name webapp
```

### 4-3. デプロイ確認

デプロイが成功すると以下のURLが表示されます：

```
✨ Deployment complete!
🌎 https://webapp.pages.dev
🌎 https://main.webapp.pages.dev
```

---

## ✅ ステップ5: デプロイ後の動作確認

### 5-1. ヘルスチェック

```bash
curl https://webapp.pages.dev/api/health
# 期待される出力: {"status":"ok","timestamp":"..."}
```

### 5-2. ログイン機能テスト

```bash
# ログインAPIテスト
curl -X POST https://webapp.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"YOUR_PASSWORD"}'

# 期待される出力:
# {"token":"...","user":{"id":"...","email":"...","role":"ADMIN"}}
```

### 5-3. Cron動作確認

```bash
# Cronトリガーをテスト実行
npx wrangler pages deployment tail --project-name webapp

# 別のターミナルで手動トリガー（テスト用）
# Cloudflareダッシュボードから「Trigger」ボタンをクリック
```

---

## 🔄 継続的デプロイ（CD）設定

### GitHub Actions連携

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install --legacy-peer-deps
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist --project-name webapp
```

**GitHubシークレット設定**:
1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. `CLOUDFLARE_API_TOKEN` を追加

---

## 🌐 カスタムドメイン設定（オプション）

### ドメイン追加

```bash
# カスタムドメイン追加
npx wrangler pages domain add yourdomain.com --project-name webapp

# サブドメイン追加
npx wrangler pages domain add app.yourdomain.com --project-name webapp
```

### DNS設定

Cloudflareダッシュボードで以下のレコードを追加：

```
Type: CNAME
Name: app (またはルートドメイン用に@)
Target: webapp.pages.dev
Proxy status: Proxied (オレンジクラウド)
```

---

## 🔍 トラブルシューティング

### デプロイエラー

**エラー**: `Build failed`
```bash
# ローカルでビルドテスト
npm run build

# エラーログ確認
npx wrangler pages deployment tail --project-name webapp
```

**エラー**: `Database binding not found`
```bash
# D1バインディング確認
npx wrangler d1 list

# wrangler.jsonc のdatabase_idが正しいか確認
```

### Cron実行エラー

```bash
# Cronログ確認
npx wrangler pages deployment tail --project-name webapp --format json | grep "Cron"

# 手動テスト実行
# Cloudflareダッシュボード → Workers & Pages → webapp → Triggers → Crons → Run now
```

### メール送信失敗

```bash
# Resend APIキー確認
npx wrangler pages secret list --project-name webapp | grep RESEND

# ローカルでテスト
curl -X POST https://webapp.pages.dev/api/email/test/deadline \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deal_id":"test-id","recipient_email":"test@example.com"}'
```

---

## 📊 本番環境監視

### Cloudflareダッシュボード

1. **Analytics**:
   - リクエスト数
   - エラーレート
   - レスポンスタイム

2. **Logs**:
   - リアルタイムログ確認
   - エラートラッキング

3. **Cron Triggers**:
   - 実行履歴
   - 成功/失敗ステータス

### Sentryエラー追跡（オプション）

```bash
npm install @sentry/browser --legacy-peer-deps

# src/index.tsx にSentry初期化コード追加
```

---

## 🔄 ロールバック手順

### 以前のデプロイに戻す

```bash
# デプロイ履歴確認
npx wrangler pages deployments list --project-name webapp

# 特定のデプロイIDにロールバック
npx wrangler pages deployments promote <DEPLOYMENT_ID> --project-name webapp
```

### 緊急時の対応

1. Cloudflareダッシュボードからロールバック
2. デプロイメント履歴から「Rollback to this deployment」をクリック

---

## 📝 デプロイ後のチェックリスト

- [ ] ヘルスチェックAPI動作確認
- [ ] ログイン機能テスト
- [ ] 案件CRUD操作テスト
- [ ] ファイルアップロード/ダウンロードテスト
- [ ] OCR機能テスト
- [ ] AI提案生成テスト
- [ ] PDFレポート生成テスト
- [ ] メール通知テスト（管理者向けテストAPI）
- [ ] Cronトリガー動作確認
- [ ] レスポンスタイム確認（< 500ms目標）
- [ ] エラーログ確認（異常なエラーがないか）

---

## 🔐 セキュリティチェックリスト

- [ ] 本番環境のパスワードが安全（12文字以上、複雑）
- [ ] JWT_SECRETがランダムで長い（32文字以上）
- [ ] APIキーがシークレットとして設定（コードに直接記載なし）
- [ ] CORS設定が適切（本番ドメインのみ許可）
- [ ] レート制限設定（Cloudflare）
- [ ] HTTPS強制（Cloudflareデフォルト）
- [ ] 定期的なセキュリティ監査

---

## 📞 サポート情報

### Cloudflare
- Dashboard: https://dash.cloudflare.com
- Docs: https://developers.cloudflare.com/pages
- Community: https://community.cloudflare.com

### プロジェクト
- GitHub: https://github.com/koki-187/200
- README: `/home/user/webapp/README.md`
- API Docs: `/home/user/webapp/API.md`（要作成）

---

## 🎉 デプロイ完了！

本番環境が正常に動作していることを確認したら、チームメンバーに通知してください。

**本番URL**: https://webapp.pages.dev（または https://yourdomain.com）

初期ログイン情報をチームと共有（セキュアな方法で）し、運用を開始してください。
