# 🔄 引き継ぎドキュメント - 無料API設定ガイド

## 📋 現在の状況

**作業日**: 2025-11-17  
**本番URL**: https://6940780f.real-estate-200units-v2.pages.dev  
**プロジェクト**: 200戸土地仕入れ管理システム v2.0.1

---

## ✅ 完了した作業

### 1. OpenAI APIキー設定

**ステータス**: ✅ 完了

**実施内容**:
```bash
# 本番環境に設定完了
npx wrangler pages secret put OPENAI_API_KEY --project-name real-estate-200units-v2
```

**用途**: 登記簿謄本OCR機能（GPT-4 Vision）

**確認方法**:
```bash
npx wrangler pages secret list --project-name real-estate-200units-v2
```

**出力**:
```
The "production" environment of your Pages project "real-estate-200units-v2" has access to the following secrets:
  - JWT_SECRET: Value Encrypted ✅
  - OPENAI_API_KEY: Value Encrypted ✅
```

---

## 📊 無料API調査結果

### ✅ 利用可能な無料API

| サービス | 無料プラン | 制限 | 用途 | 必要性 |
|---------|----------|------|------|-------|
| **Resend** | ✅ あり | 月3,000通、1日100通 | メール通知 | 🟡 中 |
| **Sentry** | ✅ あり | 月5,000エラー、1ユーザー | エラートラッキング | 🟡 中 |
| **Google Analytics 4** | ✅ 完全無料 | なし（小〜中規模） | アクセス解析 | 🟢 低 |

---

## 🔧 未設定のAPI設定手順

### 1. Resend（メール通知用）

**無料プラン**: 月3,000通、1日100通まで

#### 1-1. アカウント登録

1. **Resendにアクセス**:
   - URL: https://resend.com/signup
   - Emailで登録（GitHubでもOK）

2. **メールアドレス確認**:
   - 登録したメールアドレスに確認メールが届く
   - リンクをクリックして確認

#### 1-2. APIキー取得

1. **ダッシュボードにログイン**:
   - https://resend.com/dashboard

2. **API Keys メニューに移動**:
   - 左サイドバー → "API Keys"

3. **新しいAPIキーを作成**:
   - "Create API Key"ボタンをクリック
   - 名前: `real-estate-200units-production`
   - 権限: `Full Access`（または`Sending Access`のみ）
   - 作成後、APIキーをコピー（`re_xxxxxxxxxxxxx`形式）

#### 1-3. Cloudflare Pagesに設定

```bash
# APIキーを環境変数に設定
echo "YOUR_RESEND_API_KEY" | npx wrangler pages secret put RESEND_API_KEY --project-name real-estate-200units-v2

# 確認
npx wrangler pages secret list --project-name real-estate-200units-v2
```

#### 1-4. ドメイン設定（オプション）

**無料プランの制限**: 
- デフォルトでは `onboarding@resend.dev` から送信される
- カスタムドメインは有料プラン（$20/月）が必要

**推奨**: 無料プランでもメール送信は可能。カスタムドメインは必要に応じて後で設定。

#### 1-5. 動作確認

```bash
# ローカルでテスト（.dev.vars作成）
echo "RESEND_API_KEY=re_xxxxxxxxxxxxx" >> .dev.vars

# テストメール送信API（本番環境で確認）
curl -X POST https://6940780f.real-estate-200units-v2.pages.dev/api/email/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test email from Resend."
  }'
```

---

### 2. Sentry（エラートラッキング用）

**無料プラン**: 月5,000エラー、1ユーザー

#### 2-1. アカウント登録

1. **Sentryにアクセス**:
   - URL: https://sentry.io/signup/
   - Emailで登録（GitHubでもOK）

2. **プロジェクト作成**:
   - プラットフォーム: `JavaScript` または `Node.js`
   - プロジェクト名: `real-estate-200units`

#### 2-2. DSN取得

1. **プロジェクト設定に移動**:
   - Settings → Projects → `real-estate-200units`

2. **Client Keys (DSN) をコピー**:
   - "Client Keys (DSN)" セクション
   - DSN形式: `https://xxxxxxxxxxxxx@oXXXXXXX.ingest.sentry.io/XXXXXXX`

#### 2-3. Cloudflare Pagesに設定

```bash
# DSNを環境変数に設定
echo "YOUR_SENTRY_DSN" | npx wrangler pages secret put SENTRY_DSN --project-name real-estate-200units-v2

# 確認
npx wrangler pages secret list --project-name real-estate-200units-v2
```

#### 2-4. コード統合（既に準備済み）

プロジェクトには既にSentry統合コードが準備されています:

```typescript
// src/middleware/error-tracking.ts
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
```

#### 2-5. 動作確認

1. **本番環境でエラーを意図的に発生**:
   ```bash
   # 存在しないエンドポイントにアクセス
   curl https://6940780f.real-estate-200units-v2.pages.dev/api/test-error
   ```

2. **Sentryダッシュボードで確認**:
   - https://sentry.io/issues/
   - エラーが記録されていればOK

---

### 3. Google Analytics 4（アクセス解析用）

**無料プラン**: 完全無料（小〜中規模ビジネス向け）

#### 3-1. Google Analyticsアカウント作成

1. **Google Analyticsにアクセス**:
   - URL: https://analytics.google.com/
   - Googleアカウントでログイン

2. **アカウント作成**:
   - "測定を開始"をクリック
   - アカウント名: `Real Estate 200 Units`

3. **プロパティ作成**:
   - プロパティ名: `200戸土地仕入れ管理システム`
   - タイムゾーン: 日本
   - 通貨: 日本円（JPY）

4. **ビジネス情報入力**:
   - 業種: `不動産`
   - ビジネスの規模: `小規模（従業員1～10人）`

#### 3-2. 測定IDを取得

1. **データストリーム作成**:
   - プラットフォーム: `ウェブ`
   - ウェブサイトのURL: `https://6940780f.real-estate-200units-v2.pages.dev`
   - ストリーム名: `Real Estate 200 Units - Production`

2. **測定IDをコピー**:
   - 形式: `G-XXXXXXXXXX`
   - "ストリームの詳細"ページに表示される

#### 3-3. Cloudflare Pagesに設定

```bash
# 測定IDを環境変数に設定
echo "G-XXXXXXXXXX" | npx wrangler pages secret put GA_MEASUREMENT_ID --project-name real-estate-200units-v2

# 確認
npx wrangler pages secret list --project-name real-estate-200units-v2
```

#### 3-4. コード統合（既に準備済み）

プロジェクトには既にGA4統合コードが準備されています:

```javascript
// public/static/analytics.js
(function() {
  const measurementId = window.ENV?.GA_MEASUREMENT_ID;
  if (measurementId) {
    // GA4タグをロード
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', measurementId);
  }
})();
```

#### 3-5. 動作確認

1. **本番URLにアクセス**:
   ```
   https://6940780f.real-estate-200units-v2.pages.dev
   ```

2. **リアルタイムレポートで確認**:
   - Google Analytics → レポート → リアルタイム
   - 自分のアクセスが表示されればOK（数秒〜数分かかる）

3. **デバッグモード（開発者向け）**:
   ```javascript
   // ブラウザのコンソールで確認
   console.log(window.dataLayer);
   ```

---

## 📊 設定優先度

### 🔴 高優先度（推奨）

1. **OpenAI API Key** ✅ 完了
   - OCR機能に必須
   - 既に設定済み

### 🟡 中優先度（オプション）

2. **Resend API Key**
   - メール通知機能に使用
   - なくてもコア機能は動作する
   - 無料枠: 月3,000通

3. **Sentry DSN**
   - エラートラッキング
   - 開発・デバッグに有用
   - 無料枠: 月5,000エラー

### 🟢 低優先度（オプション）

4. **Google Analytics Measurement ID**
   - アクセス解析
   - ビジネスインサイト用
   - 完全無料

---

## 🎯 推奨される設定順序

### ステップ1: 必須（既に完了）✅
```bash
✅ OpenAI API Key設定完了
✅ JWT_SECRET設定完了
```

### ステップ2: 推奨（メール通知）
```bash
1. Resendアカウント作成（5分）
2. APIキー取得
3. Cloudflare Pagesに設定
4. テストメール送信
```

### ステップ3: 推奨（エラートラッキング）
```bash
1. Sentryアカウント作成（5分）
2. プロジェクト作成
3. DSN取得
4. Cloudflare Pagesに設定
5. テストエラー送信
```

### ステップ4: オプション（アクセス解析）
```bash
1. Google Analyticsアカウント作成（10分）
2. プロパティ作成
3. 測定ID取得
4. Cloudflare Pagesに設定
5. リアルタイムレポート確認
```

---

## 🔍 動作確認方法

### 現在設定済みの環境変数

```bash
npx wrangler pages secret list --project-name real-estate-200units-v2
```

**期待される出力**:
```
The "production" environment of your Pages project "real-estate-200units-v2" has access to the following secrets:
  - JWT_SECRET: Value Encrypted ✅
  - OPENAI_API_KEY: Value Encrypted ✅
  - RESEND_API_KEY: Value Encrypted （未設定の場合は表示されない）
  - SENTRY_DSN: Value Encrypted （未設定の場合は表示されない）
  - GA_MEASUREMENT_ID: Value Encrypted （未設定の場合は表示されない）
```

### OCR機能のテスト

```bash
# OCR APIエンドポイントにアクセス
curl -X POST https://6940780f.real-estate-200units-v2.pages.dev/api/ocr/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "test-file-id"
  }'
```

---

## 📁 プロジェクト情報

### 本番環境
- **URL**: https://6940780f.real-estate-200units-v2.pages.dev
- **APIドキュメント**: https://6940780f.real-estate-200units-v2.pages.dev/api/docs
- **プロジェクト名**: `real-estate-200units-v2`

### データベース
- **D1データベース**: `real-estate-200units-db`
- **Database ID**: `4df8f06f-eca1-48b0-9dcc-a17778913760`

### ログイン情報（テスト用）
- **Email**: `admin@example.com`
- **Password**: `Admin!2025`
- **Role**: ADMIN

### GitHub
- **リポジトリ**: https://github.com/koki-187/200
- **ブランチ**: `main`

---

## 📝 次のChatでやること

### 🔴 高優先度

1. **Resend設定**（推奨）:
   - アカウント作成
   - APIキー取得
   - 環境変数設定
   - テストメール送信

2. **Sentry設定**（推奨）:
   - アカウント作成
   - プロジェクト作成
   - DSN取得
   - 環境変数設定
   - テストエラー送信

### 🟡 中優先度

3. **Google Analytics設定**（オプション）:
   - アカウント作成
   - プロパティ作成
   - 測定ID取得
   - 環境変数設定
   - アクセス確認

4. **バリデーションエラーハンドリング改善**:
   - Zodスキーマ導入
   - 400エラーを適切に返す
   - 詳細なエラーメッセージ

### 🟢 低優先度

5. **R2ストレージ有効化**（オプション）:
   - Cloudflareダッシュボードから有効化
   - バケット作成
   - 設定追加
   - 再デプロイ

6. **カスタムドメイン設定**（オプション）:
   - ドメイン購入
   - DNS設定
   - Cloudflare Pages接続

---

## 🔗 重要なURL

### 無料API登録ページ
- **Resend**: https://resend.com/signup
- **Sentry**: https://sentry.io/signup/
- **Google Analytics**: https://analytics.google.com/

### ドキュメント
- **Resend Docs**: https://resend.com/docs
- **Sentry Docs**: https://docs.sentry.io/
- **GA4 Docs**: https://support.google.com/analytics/

### 管理画面
- **Cloudflare Dashboard**: https://dash.cloudflare.com/
- **Cloudflare Pages**: https://dash.cloudflare.com/pages/view/real-estate-200units-v2
- **D1 Database**: https://dash.cloudflare.com/d1

---

## ✅ チェックリスト

### 完了済み
- [x] OpenAI APIキー設定
- [x] JWT_SECRET設定
- [x] D1データベース作成・マイグレーション
- [x] 本番デプロイ
- [x] エラーテスト実施（7/9 PASS）

### 次のChatで実施
- [ ] Resend設定
- [ ] Sentry設定
- [ ] Google Analytics設定
- [ ] バリデーションエラー改善
- [ ] R2ストレージ有効化（オプション）

---

## 🎉 まとめ

### 現在の状態
- ✅ **OpenAI API**: 設定完了、OCR機能利用可能
- ✅ **JWT_SECRET**: 設定完了、認証動作中
- ✅ **本番環境**: 稼働中
- ⏸️ **Resend**: 未設定（メール通知は動作しない）
- ⏸️ **Sentry**: 未設定（エラートラッキング未稼働）
- ⏸️ **Google Analytics**: 未設定（アクセス解析未稼働）

### 無料APIの利点
- ✅ すべて無料プランあり
- ✅ クレジットカード不要（Resend, Sentry）
- ✅ 小〜中規模ビジネスに十分な機能
- ✅ 簡単にアップグレード可能

### 次のアクション
1. このドキュメントを参考にResend設定（推奨）
2. Sentry設定（推奨）
3. Google Analytics設定（オプション）
4. バリデーションエラー改善（コード修正）

---

**作成日**: 2025-11-17  
**バージョン**: v2.0.1  
**作成者**: AI Assistant

**本番URL**: https://6940780f.real-estate-200units-v2.pages.dev  
**次のChat**: このドキュメントを参照して無料API設定を完了させてください
