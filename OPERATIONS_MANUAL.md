# 🛠️ 200戸土地仕入れ管理システム - 運用マニュアル

## 目次
1. [システム構成](#システム構成)
2. [デプロイ手順](#デプロイ手順)
3. [データベース管理](#データベース管理)
4. [ユーザー管理](#ユーザー管理)
5. [バックアップ・復元](#バックアップ復元)
6. [監視・ログ](#監視ログ)
7. [トラブルシューティング](#トラブルシューティング)

---

## システム構成

### アーキテクチャ
```
┌─────────────────┐
│  Cloudflare CDN │ ← グローバルエッジネットワーク
└────────┬────────┘
         │
┌────────▼────────┐
│ Cloudflare      │
│ Pages + Workers │ ← サーバーレス実行環境
└────────┬────────┘
         │
    ┌────┴────┬──────────┬────────────┐
    │         │          │            │
┌───▼──┐  ┌──▼──┐   ┌───▼────┐  ┌───▼────┐
│  D1  │  │ R2  │   │ OpenAI │  │ Resend │
└──────┘  └─────┘   └────────┘  └────────┘
Database  Storage    OCR API     Email API
```

### 技術スタック
- **Runtime**: Cloudflare Workers
- **Framework**: Hono v4.10.6
- **Language**: TypeScript 5.0
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Build Tool**: Vite 6.4.1

### 外部サービス
- **OpenAI API**: OCR機能（GPT-4 Vision）
- **Resend API**: メール送信
- **Sentry**: エラートラッキング

---

## デプロイ手順

### 前提条件
- Node.js 18以上
- npm または yarn
- Cloudflare アカウント
- Wrangler CLI

### 初回デプロイ

#### 1. リポジトリのクローン
```bash
git clone https://github.com/koki-187/200.git
cd 200
```

#### 2. 依存関係のインストール
```bash
npm install
```

#### 3. 環境変数の設定
```bash
# 本番環境の環境変数を設定
npx wrangler pages secret put JWT_SECRET --project-name real-estate-200units-v2
npx wrangler pages secret put OPENAI_API_KEY --project-name real-estate-200units-v2
npx wrangler pages secret put RESEND_API_KEY --project-name real-estate-200units-v2
npx wrangler pages secret put SENTRY_DSN --project-name real-estate-200units-v2
```

#### 4. データベースのセットアップ
```bash
# マイグレーション適用
npx wrangler d1 migrations apply DB --remote
```

#### 5. ビルドとデプロイ
```bash
# ビルド
npm run build

# デプロイ
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

### 更新デプロイ

#### コードの更新
```bash
# 最新コードを取得
git pull origin main

# ビルド
npm run build

# デプロイ
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

#### ゼロダウンタイムデプロイ
Cloudflare Pagesは自動的にゼロダウンタイムデプロイを実行します。
新しいバージョンが正常にデプロイされるまで、古いバージョンが稼働し続けます。

---

## データベース管理

### マイグレーション

#### マイグレーションの作成
```bash
# 新しいマイグレーションファイルを作成
npx wrangler d1 migrations create DB add_new_feature
```

#### マイグレーションの適用
```bash
# ローカル環境
npx wrangler d1 migrations apply DB --local

# 本番環境
npx wrangler d1 migrations apply DB --remote
```

### データベース操作

#### SQLの実行
```bash
# ローカル環境
npx wrangler d1 execute DB --local --command="SELECT * FROM users LIMIT 10;"

# 本番環境
npx wrangler d1 execute DB --remote --command="SELECT * FROM users LIMIT 10;"
```

#### データのエクスポート
```bash
# ローカル環境のデータをエクスポート
npx wrangler d1 export DB --local --output=backup.sql

# 本番環境のデータをエクスポート
npx wrangler d1 export DB --remote --output=production-backup.sql
```

#### データのインポート
```bash
# ローカル環境にインポート
npx wrangler d1 execute DB --local --file=backup.sql

# 本番環境にインポート（注意！）
npx wrangler d1 execute DB --remote --file=backup.sql
```

### テーブル構造

#### 主要テーブル
- **users**: ユーザー情報
- **deals**: 案件情報
- **messages**: メッセージ
- **files**: ファイル情報
- **file_versions**: ファイルバージョン履歴
- **notifications**: 通知
- **feedback**: フィードバック
- **backups**: バックアップメタデータ

---

## ユーザー管理

### 新規ユーザーの作成

#### 管理者ユーザー
```bash
# パスワードハッシュを生成
node -e "
const crypto = require('crypto');
const password = 'YourSecurePassword123';
const salt = crypto.randomBytes(16);
crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
  if (err) throw err;
  const combined = Buffer.concat([salt, derivedKey]);
  console.log('Hash:', combined.toString('base64'));
});
"

# ユーザーを作成
npx wrangler d1 execute DB --remote --command="
INSERT INTO users (id, email, password_hash, name, role, company_name)
VALUES (
  'YOUR_UUID_HERE',
  'newadmin@example.com',
  'GENERATED_HASH_HERE',
  '新規管理者',
  'ADMIN',
  '会社名'
);"
```

#### エージェントユーザー
```bash
# 同様にパスワードハッシュを生成して、roleを'AGENT'に変更
npx wrangler d1 execute DB --remote --command="
INSERT INTO users (id, email, password_hash, name, role, company_name)
VALUES (
  'YOUR_UUID_HERE',
  'newagent@example.com',
  'GENERATED_HASH_HERE',
  '新規担当者',
  'AGENT',
  '会社名'
);"
```

### ユーザーの無効化
```bash
# ユーザーを無効化（論理削除）
npx wrangler d1 execute DB --remote --command="
UPDATE users SET is_active = 0 WHERE email = 'user@example.com';"
```

### パスワードリセット
```bash
# 新しいパスワードハッシュを生成
# （上記と同じ方法）

# パスワードを更新
npx wrangler d1 execute DB --remote --command="
UPDATE users SET password_hash = 'NEW_HASH_HERE' WHERE email = 'user@example.com';"
```

---

## バックアップ・復元

### 自動バックアップ
システムは毎日自動的にバックアップを作成します（Cronトリガー使用）。

### 手動バックアップ

#### データベースバックアップ
```bash
# バックアップの作成
npx wrangler d1 export DB --remote --output="backup-$(date +%Y%m%d-%H%M%S).sql"
```

#### プロジェクトバックアップ
```bash
# プロジェクト全体をアーカイブ
tar -czf "project-backup-$(date +%Y%m%d).tar.gz" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  .
```

### 復元手順

#### データベース復元
```bash
# 1. バックアップファイルを確認
cat backup-20251117.sql

# 2. 復元（注意：既存データを上書き）
npx wrangler d1 execute DB --remote --file=backup-20251117.sql
```

#### 完全復元
```bash
# 1. バックアップを解凍
tar -xzf project-backup-20251117.tar.gz -C /path/to/restore/

# 2. 依存関係をインストール
cd /path/to/restore/
npm install

# 3. ビルドとデプロイ
npm run build
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

---

## 監視・ログ

### Cloudflare ダッシュボード

#### アクセス方法
1. https://dash.cloudflare.com にログイン
2. アカウントを選択
3. Pages > real-estate-200units-v2 を選択

#### 確認項目
- **Deployments**: デプロイ履歴とステータス
- **Analytics**: トラフィック統計
- **Functions**: Workers実行ログ

### Sentryエラートラッキング

#### アクセス方法
1. https://sentry.io にログイン
2. プロジェクトを選択

#### 確認項目
- **Issues**: エラー一覧と頻度
- **Performance**: パフォーマンスメトリクス
- **Releases**: リリース追跡

### ログの確認

#### リアルタイムログ
```bash
# Workersログをストリーム表示
npx wrangler pages deployment tail --project-name real-estate-200units-v2
```

#### D1クエリログ
Cloudflare Dashboard > D1 > クエリタブ でクエリ履歴を確認できます。

---

## トラブルシューティング

### デプロイエラー

**エラー: "Build failed"**
```bash
# ローカルでビルドを確認
npm run build

# エラーメッセージを確認
# TypeScriptエラーの場合は、型定義を修正
```

**エラー: "Authentication failed"**
```bash
# Wrangler再認証
npx wrangler login

# APIトークンの確認
npx wrangler whoami
```

### データベースエラー

**エラー: "no such table"**
```bash
# マイグレーションを適用
npx wrangler d1 migrations apply DB --remote

# マイグレーション状態を確認
npx wrangler d1 migrations list DB
```

**エラー: "database is locked"**
```bash
# 同時実行を避ける
# 一度に1つのクエリのみ実行してください
```

### パフォーマンス問題

**レスポンスが遅い**
1. Cloudflare Analyticsでボトルネックを特定
2. D1クエリを最適化（インデックスの追加）
3. キャッシュ戦略を見直し

**Workers CPU時間制限**
- 無料プラン: 10ms/リクエスト
- 有料プラン: 50ms/リクエスト
- 重い処理はバックグラウンドジョブに移行

### 外部API問題

**OpenAI APIエラー**
```bash
# APIキーを確認
npx wrangler pages secret list --project-name real-estate-200units-v2

# 使用状況を確認
# https://platform.openai.com/usage
```

**Resend APIエラー**
```bash
# 送信制限を確認
# 無料プラン: 月3,000通、1日100通
```

---

## メンテナンス計画

### 定期メンテナンス
- **毎日**: 自動バックアップの確認
- **毎週**: エラーログのレビュー
- **毎月**: パフォーマンスレビュー
- **四半期**: セキュリティアップデート

### アップグレード計画
- **依存関係の更新**: 月次
- **Cloudflare Workers Runtime**: 自動更新
- **データベーススキーマ**: 必要に応じて

---

## セキュリティ

### 環境変数の管理
- **JWT_SECRET**: 256ビットランダム文字列
- **API Keys**: 定期的にローテーション
- **パスワード**: PBKDF2で100,000イテレーション

### アクセス制御
- **CORS**: APIエンドポイントのみ有効
- **認証**: JWT Bearer token
- **RBAC**: ADMIN / AGENT ロール

### セキュリティヘッダー
- Content Security Policy
- X-Frame-Options
- Strict-Transport-Security
- X-Content-Type-Options

---

## お問い合わせ

### 技術サポート
- **GitHub Issues**: https://github.com/koki-187/200/issues
- **Email**: tech-support@200units.com（例）

---

**最終更新日**: 2025-11-17
**バージョン**: v2.0.0
