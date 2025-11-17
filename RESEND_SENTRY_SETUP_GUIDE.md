# 📧 Resend & Sentry 詳細設定ガイド

## 📋 目次

1. [Resend設定（メール通知）](#resend設定メール通知)
2. [Sentry設定（エラートラッキング）](#sentry設定エラートラッキング)
3. [動作確認](#動作確認)
4. [トラブルシューティング](#トラブルシューティング)

---

## 📧 Resend設定（メール通知）

### 📊 Resend概要

**用途**: メール通知（案件更新、メンション、期限アラート等）  
**無料プラン**: 月3,000通、1日100通まで  
**必要性**: 🟡 中（なくてもコア機能は動作）  
**所要時間**: 約10分

---

### ステップ1: アカウント作成

#### 1-1. Resend公式サイトにアクセス

**URL**: https://resend.com/signup

#### 1-2. 登録方法を選択

以下のいずれかの方法で登録できます:

**方法A: GitHubで登録（推奨）**
1. "Continue with GitHub"ボタンをクリック
2. GitHubアカウントでログイン
3. Resendへのアクセス許可を承認

**方法B: Emailで登録**
1. メールアドレスを入力
2. "Continue with Email"ボタンをクリック
3. 届いたメールの確認リンクをクリック

#### 1-3. 基本情報入力

**入力項目**:
- **Name**: あなたの名前（例: Koki）
- **Company** (オプション): 会社名（空欄でもOK）
- **Use Case**: `Transactional Emails`を選択

#### 1-4. メール確認（Emailで登録した場合）

1. 登録したメールアドレスに確認メールが届く
2. "Verify Email"ボタンをクリック
3. ブラウザで自動的にダッシュボードが開く

---

### ステップ2: APIキー取得

#### 2-1. ダッシュボードにアクセス

登録完了後、自動的にダッシュボードが開きます。  
または、https://resend.com/dashboard にアクセス。

#### 2-2. API Keys メニューに移動

**手順**:
1. 左サイドバーの**"API Keys"**をクリック
2. または、https://resend.com/api-keys に直接アクセス

#### 2-3. 新しいAPIキーを作成

**手順**:
1. **"Create API Key"**ボタン（右上）をクリック

2. **APIキー情報を入力**:
   - **Name**: `real-estate-200units-production`
   - **Permission**: 
     - `Full Access`（推奨）
     - または `Sending Access`（送信のみ）
   - **Domain** (オプション): 空欄でOK

3. **"Create"**ボタンをクリック

#### 2-4. APIキーをコピー

**重要**: APIキーは一度しか表示されません！

**形式**: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**コピー方法**:
1. 表示されたAPIキーをコピー
2. 安全な場所に一時保存（メモ帳、パスワードマネージャー等）

**セキュリティ注意**:
- ⚠️ このAPIキーは二度と表示されません
- ⚠️ GitHubにコミットしないこと
- ⚠️ 公開チャンネルに貼り付けないこと

---

### ステップ3: Cloudflare Pagesに設定

#### 3-1. サンドボックスで設定コマンド実行

```bash
# 作業ディレクトリに移動
cd /home/user/webapp

# APIキーを環境変数に設定（取得したAPIキーに置き換え）
echo "re_YOUR_API_KEY_HERE" | npx wrangler pages secret put RESEND_API_KEY --project-name real-estate-200units-v2
```

**実行例**:
```bash
# 実際のAPIキーに置き換えて実行
echo "re_AbC123XyZ456..." | npx wrangler pages secret put RESEND_API_KEY --project-name real-estate-200units-v2
```

**期待される出力**:
```
⛅️ wrangler 4.47.0
───────────────────
🌀 Creating the secret for the Pages project "real-estate-200units-v2" (production)
✨ Success! Uploaded secret RESEND_API_KEY
```

#### 3-2. 設定確認

```bash
# 環境変数一覧を表示
npx wrangler pages secret list --project-name real-estate-200units-v2
```

**期待される出力**:
```
The "production" environment of your Pages project "real-estate-200units-v2" has access to the following secrets:
  - JWT_SECRET: Value Encrypted ✅
  - OPENAI_API_KEY: Value Encrypted ✅
  - RESEND_API_KEY: Value Encrypted ✅ ← 追加された
```

---

### ステップ4: 送信元ドメイン設定（オプション）

#### 4-1. 無料プランの制限

**デフォルト送信元**: `onboarding@resend.dev`

**制限**:
- 無料プランでは、デフォルトドメインからのみ送信可能
- カスタムドメイン（例: `noreply@yourdomain.com`）は**有料プラン**（$20/月）が必要

**推奨**: 
- ✅ 無料プランでもメール送信は完全に機能します
- ✅ まずはデフォルトドメインで運用開始
- ⏸️ カスタムドメインは必要に応じて後で設定

#### 4-2. カスタムドメイン設定（有料プランの場合）

**有料プランにアップグレード後**:

1. **Domains メニューに移動**:
   - 左サイドバー → "Domains"

2. **ドメインを追加**:
   - "Add Domain"ボタンをクリック
   - ドメイン名を入力（例: `yourdomain.com`）

3. **DNS設定**:
   - 表示されたDNSレコードをドメインのDNS設定に追加
   - SPF, DKIM, DMARC レコードを設定

4. **確認**:
   - Resendダッシュボードで"Verify"をクリック
   - 確認完了まで数分〜数時間

---

### ステップ5: 動作確認

#### 5-1. テストメールAPI呼び出し

**本番環境でテスト**:

```bash
# まず、ログインしてJWTトークンを取得
TOKEN=$(curl -s -X POST https://6940780f.real-estate-200units-v2.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin!2025"}' | jq -r '.token')

# テストメール送信
curl -X POST https://6940780f.real-estate-200units-v2.pages.dev/api/email/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_EMAIL@example.com",
    "subject": "Test Email from Resend",
    "html": "<h1>Hello from Resend!</h1><p>This is a test email.</p>"
  }'
```

**YOUR_EMAIL@example.com を実際のメールアドレスに置き換えてください**

#### 5-2. 期待される結果

**成功時**:
```json
{
  "success": true,
  "messageId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**メール受信**:
- 数秒〜数分以内に受信トレイに届く
- 送信元: `onboarding@resend.dev`
- 件名: "Test Email from Resend"

#### 5-3. トラブルシューティング

**メールが届かない場合**:
1. **スパムフォルダを確認**
2. **Resendダッシュボードで送信履歴確認**:
   - https://resend.com/emails
   - エラーメッセージを確認
3. **APIレスポンスのエラー確認**:
   ```json
   {
     "error": "Invalid API key"
   }
   ```
   → APIキーが間違っている可能性

---

## 🐛 Sentry設定（エラートラッキング）

### 📊 Sentry概要

**用途**: エラートラッキング、パフォーマンスモニタリング  
**無料プラン**: 月5,000エラー、1ユーザー  
**必要性**: 🟡 中（開発・デバッグに有用）  
**所要時間**: 約10分

---

### ステップ1: アカウント作成

#### 1-1. Sentry公式サイトにアクセス

**URL**: https://sentry.io/signup/

#### 1-2. 登録方法を選択

以下のいずれかの方法で登録できます:

**方法A: GitHubで登録（推奨）**
1. "Sign up with GitHub"ボタンをクリック
2. GitHubアカウントでログイン
3. Sentryへのアクセス許可を承認

**方法B: Emailで登録**
1. メールアドレスを入力
2. パスワードを設定
3. "Create Account"ボタンをクリック
4. 届いたメールの確認リンクをクリック

#### 1-3. 基本情報入力

**入力項目**:
- **Full Name**: あなたの名前
- **Organization Name**: `Real Estate 200 Units`（または任意の名前）
- **Select your role**: `Developer`を選択

#### 1-4. プラン選択

**プラン**: `Developer`（無料プラン）を選択

**無料プランの制限**:
- 月5,000エラー
- 1ユーザー
- データ保持期間: 30日

---

### ステップ2: プロジェクト作成

#### 2-1. プラットフォーム選択

**画面**: "Create a project"

**選択肢**:
1. **Platform**: `Node.js`を選択
   - または `JavaScript`
   - Cloudflare Workers用の設定

2. **Project Name**: `real-estate-200units`

3. **Alert Frequency**: `On every new issue`（推奨）

4. **Create Project**ボタンをクリック

#### 2-2. セットアップガイド画面

プロジェクト作成後、セットアップガイドが表示されます。  
**このページは後で参照できるのでスキップしてOK**

---

### ステップ3: DSN取得

#### 3-1. Project Settings に移動

**手順**:
1. 左サイドバーの**歯車アイコン（Settings）**をクリック
2. **Projects** → `real-estate-200units`を選択

#### 3-2. Client Keys (DSN) セクション

**手順**:
1. 左メニューの**"Client Keys (DSN)"**をクリック
2. または、直接URLにアクセス:
   ```
   https://sentry.io/settings/YOUR_ORG/projects/real-estate-200units/keys/
   ```

#### 3-3. DSNをコピー

**DSN形式**: 
```
https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@oXXXXXXX.ingest.sentry.io/XXXXXXX
```

**コピー方法**:
1. "DSN"セクションの値をコピー
2. 安全な場所に一時保存

**セキュリティ注意**:
- ⚠️ このDSNは公開可能（クライアントサイドで使用）
- ✅ ただし、GitHubへのコミットは避ける（環境変数で管理）

---

### ステップ4: Cloudflare Pagesに設定

#### 4-1. サンドボックスで設定コマンド実行

```bash
# 作業ディレクトリに移動
cd /home/user/webapp

# DSNを環境変数に設定（取得したDSNに置き換え）
echo "https://xxxxx@oXXXXXXX.ingest.sentry.io/XXXXXXX" | npx wrangler pages secret put SENTRY_DSN --project-name real-estate-200units-v2
```

**実行例**:
```bash
# 実際のDSNに置き換えて実行
echo "https://a1b2c3d4e5f6...@o123456.ingest.sentry.io/7890123" | npx wrangler pages secret put SENTRY_DSN --project-name real-estate-200units-v2
```

**期待される出力**:
```
⛅️ wrangler 4.47.0
───────────────────
🌀 Creating the secret for the Pages project "real-estate-200units-v2" (production)
✨ Success! Uploaded secret SENTRY_DSN
```

#### 4-2. 設定確認

```bash
# 環境変数一覧を表示
npx wrangler pages secret list --project-name real-estate-200units-v2
```

**期待される出力**:
```
The "production" environment of your Pages project "real-estate-200units-v2" has access to the following secrets:
  - JWT_SECRET: Value Encrypted ✅
  - OPENAI_API_KEY: Value Encrypted ✅
  - RESEND_API_KEY: Value Encrypted ✅
  - SENTRY_DSN: Value Encrypted ✅ ← 追加された
```

---

### ステップ5: コード統合（既に準備済み）

#### 5-1. Sentryミドルウェア確認

プロジェクトには既にSentry統合コードが準備されています:

**ファイル**: `src/middleware/error-tracking.ts`

```typescript
import * as Sentry from '@sentry/cloudflare';

export const initSentry = (env: Env) => {
  if (env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: 'production',
      tracesSampleRate: 1.0,
    });
  }
};

export const captureException = (error: Error, context?: any) => {
  Sentry.captureException(error, { extra: context });
};
```

#### 5-2. メインエントリーポイント確認

**ファイル**: `src/index.tsx`

```typescript
import { initSentry, captureException } from './middleware/error-tracking';

const app = new Hono<{ Bindings: Env }>();

// Sentry初期化
app.use('*', async (c, next) => {
  initSentry(c.env);
  await next();
});

// グローバルエラーハンドラー
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  captureException(err, { path: c.req.path });
  return c.json({ error: 'Internal server error' }, 500);
});
```

---

### ステップ6: 動作確認

#### 6-1. テストエラー送信

**方法A: 存在しないエンドポイントにアクセス**

```bash
# 404エラーを発生させる
curl https://6940780f.real-estate-200units-v2.pages.dev/api/test-sentry-error
```

**方法B: テストエラーAPIを作成（オプション）**

一時的にテストエンドポイントを追加:

```typescript
// src/index.tsx に追加
app.get('/api/test-sentry', (c) => {
  throw new Error('This is a test error for Sentry');
});
```

```bash
# ビルド&デプロイ
npm run build
npx wrangler pages deploy dist --project-name real-estate-200units-v2

# テストエラー送信
curl https://6940780f.real-estate-200units-v2.pages.dev/api/test-sentry
```

#### 6-2. Sentryダッシュボードで確認

**手順**:
1. **Sentryダッシュボードにアクセス**:
   - https://sentry.io/issues/

2. **Issues タブを確認**:
   - 新しいエラーが表示されているはず
   - エラー名: "This is a test error for Sentry"
   - 環境: `production`

3. **エラー詳細を確認**:
   - スタックトレース
   - リクエスト情報（URL, メソッド等）
   - 発生日時

#### 6-3. 期待される結果

**Sentryダッシュボード**:
- ✅ エラーが記録されている
- ✅ スタックトレースが表示される
- ✅ 環境が`production`になっている
- ✅ タイムスタンプが正確

**メール通知**（設定している場合）:
- ✅ 新しいエラーのアラートメールが届く

---

## ✅ 動作確認

### 全体確認チェックリスト

#### 1. 環境変数確認

```bash
npx wrangler pages secret list --project-name real-estate-200units-v2
```

**期待される出力**:
```
The "production" environment of your Pages project "real-estate-200units-v2" has access to the following secrets:
  - JWT_SECRET: Value Encrypted ✅
  - OPENAI_API_KEY: Value Encrypted ✅
  - RESEND_API_KEY: Value Encrypted ✅
  - SENTRY_DSN: Value Encrypted ✅
```

#### 2. Resend動作確認

```bash
# ログイン
TOKEN=$(curl -s -X POST https://6940780f.real-estate-200units-v2.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin!2025"}' | jq -r '.token')

# テストメール送信
curl -X POST https://6940780f.real-estate-200units-v2.pages.dev/api/email/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_EMAIL@example.com",
    "subject": "Test",
    "html": "<p>Test email</p>"
  }'
```

**確認項目**:
- ✅ メールが受信トレイに届く
- ✅ 送信元: `onboarding@resend.dev`
- ✅ Resendダッシュボードで送信履歴確認

#### 3. Sentry動作確認

```bash
# テストエラー発生
curl https://6940780f.real-estate-200units-v2.pages.dev/api/nonexistent-endpoint
```

**確認項目**:
- ✅ Sentryダッシュボード（https://sentry.io/issues/）にエラーが表示
- ✅ エラー詳細が確認できる
- ✅ アラートメールが届く（設定している場合）

---

## 🔧 トラブルシューティング

### Resend関連

#### 問題1: メールが届かない

**原因**:
- APIキーが間違っている
- スパムフォルダに振り分けられている
- メールアドレスが無効

**解決方法**:
1. **スパムフォルダを確認**
2. **Resendダッシュボードで送信履歴確認**:
   - https://resend.com/emails
   - "Failed"ステータスの場合、エラーメッセージを確認
3. **APIキーを再設定**:
   ```bash
   echo "re_NEW_API_KEY" | npx wrangler pages secret put RESEND_API_KEY --project-name real-estate-200units-v2
   ```

#### 問題2: "Invalid API key" エラー

**原因**: APIキーが正しくない、または期限切れ

**解決方法**:
1. Resendダッシュボードで新しいAPIキーを作成
2. 再度設定:
   ```bash
   echo "re_NEW_API_KEY" | npx wrangler pages secret put RESEND_API_KEY --project-name real-estate-200units-v2
   ```

#### 問題3: レート制限エラー

**エラーメッセージ**: "Rate limit exceeded"

**原因**: 1日100通制限に達した（無料プラン）

**解決方法**:
- 翌日まで待つ
- または、有料プランにアップグレード（$20/月）

---

### Sentry関連

#### 問題1: エラーがSentryに表示されない

**原因**:
- DSNが間違っている
- Sentry初期化コードが実行されていない

**解決方法**:
1. **DSNを再確認**:
   ```bash
   npx wrangler pages secret list --project-name real-estate-200units-v2
   ```
2. **DSNを再設定**:
   ```bash
   echo "https://xxxxx@oXXX.ingest.sentry.io/XXX" | npx wrangler pages secret put SENTRY_DSN --project-name real-estate-200units-v2
   ```
3. **ビルド&再デプロイ**:
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name real-estate-200units-v2
   ```

#### 問題2: エラーが重複して記録される

**原因**: 同じエラーが複数回発生している

**解決方法**:
- Sentryは自動的にエラーをグルーピングします
- ダッシュボードで"Merge"機能を使用して手動でマージ可能

#### 問題3: パフォーマンスデータが表示されない

**原因**: トランザクションサンプリングレートが低い

**解決方法**:
`src/middleware/error-tracking.ts`でサンプリングレートを調整:
```typescript
Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 1.0, // 100%サンプリング
});
```

---

## 📊 設定完了後の状態

### 環境変数（全体）

```bash
npx wrangler pages secret list --project-name real-estate-200units-v2
```

**最終的な出力**:
```
The "production" environment of your Pages project "real-estate-200units-v2" has access to the following secrets:
  - JWT_SECRET: Value Encrypted ✅ (認証)
  - OPENAI_API_KEY: Value Encrypted ✅ (OCR)
  - RESEND_API_KEY: Value Encrypted ✅ (メール通知)
  - SENTRY_DSN: Value Encrypted ✅ (エラートラッキング)
```

### 有効化された機能

| 機能 | 状態 | 用途 |
|-----|------|------|
| JWT認証 | ✅ 動作中 | ユーザーログイン |
| OpenAI OCR | ✅ 動作中 | 登記簿謄本解析 |
| Resendメール通知 | ✅ 動作中 | 案件更新、メンション通知 |
| Sentryエラートラッキング | ✅ 動作中 | エラー監視、デバッグ |

---

## 🎉 完了チェックリスト

### Resend
- [ ] アカウント作成完了
- [ ] APIキー取得
- [ ] Cloudflare Pagesに設定
- [ ] テストメール送信成功
- [ ] Resendダッシュボードで送信履歴確認

### Sentry
- [ ] アカウント作成完了
- [ ] プロジェクト作成
- [ ] DSN取得
- [ ] Cloudflare Pagesに設定
- [ ] テストエラー送信成功
- [ ] Sentryダッシュボードでエラー確認

### 全体確認
- [ ] 環境変数4つすべて設定完了
- [ ] 本番環境が正常稼働
- [ ] メール通知動作確認
- [ ] エラートラッキング動作確認

---

## 📞 サポート

### 公式ドキュメント
- **Resend Docs**: https://resend.com/docs
- **Sentry Docs**: https://docs.sentry.io/

### コミュニティ
- **Resend Discord**: https://resend.com/discord
- **Sentry Discord**: https://discord.gg/sentry

### トラブル時の連絡先
- **Resend Support**: support@resend.com
- **Sentry Support**: https://sentry.zendesk.com/

---

**作成日**: 2025-11-17  
**バージョン**: v2.0.1  
**本番URL**: https://6940780f.real-estate-200units-v2.pages.dev

**次のステップ**: このガイドに従ってResendとSentryを設定してください！
