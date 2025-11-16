# 200棟アパート用地仕入れプロジェクト

土地仕入れ業務特化 Web アプリ v1.0（アパート用地 × 営業日48h一次回答体制）

---

## 📋 プロジェクト概要

### 目的
買側仲介（利用者A）が、案件を持ち込む売側仲介担当者（利用者B/C/D…）と用地情報のやり取り・資料共有・不足情報の可視化・一次回答レポート作成までをひとつの Web アプリで完結できるようにする。

**営業日換算で48時間以内（土日祝日を除く2営業日以内）に一次回答**を実現するため、期限管理・不足情報の可視化・通知リマインドをアプリで支援します。

### 想定利用規模
- **利用者数**: 20〜30名
- **同時接続**: 最大5名程度

---

## 🎯 主要機能

### ✅ 完成済み機能

1. **認証システム**
   - JWT認証（SHA-256ベース）
   - ロール管理（管理者/売側担当者）
   - 自動ログアウト

2. **案件管理（Deal Management）**
   - 案件CRUD操作
   - ステータス管理（新規/調査中/一次回答済/クロージング）
   - 詳細情報入力（所在地/用途地域/接道状況等）
   - 不足項目の可視化

3. **営業日48時間管理**
   - 土日祝日を除く2営業日での自動期限計算
   - 期限ステータス表示（期限内/期限迫る/期限超過）
   - ダッシュボードでの一覧管理

4. **チャット機能**
   - 買側・売側間のリアルタイムメッセージング
   - 未読管理
   - 案件ごとのチャット履歴

5. **ファイル管理**
   - ドラッグ&ドロップアップロード
   - 案件ごとのストレージ容量管理
   - ファイル一覧・ダウンロード

6. **Proposal Suite（AI提案機能）**
   - OpenAI GPT-4による自動提案生成
   - 物件情報からの強み・リスク分析
   - 買主プロファイルに応じたカスタマイズ
   - CF（収支）計算統合
   - メールドラフト・面談ポイント自動生成

7. **データベース（Cloudflare D1）**
   - SQLiteベースの分散データベース
   - 完全なマイグレーション管理
   - ローカル開発環境対応

---

## 🚀 セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn

### 初回セットアップ

```bash
# 依存関係のインストール
npm install --legacy-peer-deps

# データベースマイグレーション（ローカル）
npm run db:migrate:local

# シードデータ投入
npm run db:seed

# ビルド
npm run build

# 開発サーバー起動（PM2）
pm2 start ecosystem.config.cjs

# サーバーテスト
npm run test
```

### 環境変数設定

`.dev.vars` ファイルに以下を設定：

```
OPENAI_API_KEY=your-openai-api-key-here
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

---

## 🌐 アクセス情報

### 開発環境URL
**https://3000-ihv36ugifcfle3x85cun1-5c13a017.sandbox.novita.ai**

### 初期ログイン情報

**管理者（買側）**
- Email: `admin@example.com`
- Password: `Admin!2025`

**売側担当者1**
- Email: `seller1@example.com`
- Password: `Admin!2025`

**売側担当者2**
- Email: `seller2@example.com`
- Password: `Admin!2025`

---

## 🏗 システム構成

### 技術スタック
- **フロントエンド**: HTML5 + TailwindCSS + Vanilla JavaScript
- **バックエンド**: Hono Framework (TypeScript)
- **ランタイム**: Cloudflare Workers
- **データベース**: Cloudflare D1 (SQLite)
- **認証**: JWT (SHA-256)
- **AI**: OpenAI GPT-4 API

### データモデル

#### 主要テーブル
1. **users** - ユーザー（管理者/売側担当者）
2. **deals** - 案件情報
3. **messages** - チャット履歴
4. **files** - アップロードファイル管理
5. **ocr_jobs** - OCR処理ジョブ
6. **notifications** - 通知履歴
7. **settings** - システム設定
8. **proposals** - AI提案データ

---

## 📱 画面構成

### 1. ログイン画面
- メールアドレス/パスワード認証
- セッション管理

### 2. ダッシュボード
- 案件一覧（カード表示）
- フィルタ機能（ステータス/期限）
- 新規案件作成ボタン

### 3. 案件詳細画面
- 基本情報表示・編集
- チャット機能
- ファイルアップロード
- 不足情報パネル
- AI提案生成ボタン

### 4. Proposal Suite（管理者専用）
- Property Summary（物件要点カード）
- Map & Aerial（地図・空撮）
- Risk Overlay（リスク・留意点）
- Proposal Engine（AI提案生成）
- CF Studio（収支計算）
- Proposal Preview（提案書プレビュー・PDF出力）

---

## 🎨 デザインコンセプト

### カラーパレット
- **メインカラー**: Navy (#0A1A2F)
- **アクセントカラー**: Gold (#C9A86A)
- **背景**: White (#FFFFFF)
- **テキスト**: Charcoal Gray (#1F1F1F)

### フォント
- **日本語**: Noto Sans JP
- **欧文**: Inter

### UX原則
- プロフェッショナル・高級感
- 視線誘導を意識したレイアウト
- 余白広めで読みやすさ重視
- インタラクティブ（必要な箇所のみ）

---

## 📊 営業日48時間ロジック

### 計算方法
1. **営業日定義**: 月〜金（土日を除く）
2. **祝日除外**: 設定画面で祝日を定義可能
3. **期限計算**: 案件作成時点から2営業日後を自動算出
4. **ステータス判定**:
   - **期限内** (IN_TIME): 残り24時間以上
   - **期限迫る** (WARNING): 残り24時間以内
   - **期限超過** (OVERDUE): 期限経過

### 例
- **金曜17:00作成** → 翌週火曜17:00が期限
- **祝日を挟む場合** → 祝日もスキップして計算

---

## 🔐 セキュリティ

### 実装済み
- JWT認証（7日間有効）
- パスワードハッシュ化（SHA-256）
- ロールベースアクセス制御
- CORS設定
- APIエンドポイント認証必須

### 注意事項
⚠️ **本番環境への移行時の必須対応**
1. SHA-256パスワードハッシュをbcryptに変更
2. JWT署名アルゴリズムをHS256/RS256に変更
3. HTTPS必須
4. 環境変数の厳格な管理

---

## 📦 npm スクリプト

```json
{
  "dev": "vite",
  "dev:sandbox": "wrangler pages dev dist --d1=webapp-production --local --ip 0.0.0.0 --port 3000",
  "build": "vite build",
  "preview": "wrangler pages dev dist",
  "deploy": "npm run build && wrangler pages deploy dist",
  "deploy:prod": "npm run build && wrangler pages deploy dist --project-name webapp",
  "cf-typegen": "wrangler types --env-interface CloudflareBindings",
  "clean-port": "fuser -k 3000/tcp 2>/dev/null || true",
  "test": "curl http://localhost:3000",
  "db:migrate:local": "wrangler d1 migrations apply webapp-production --local",
  "db:migrate:prod": "wrangler d1 migrations apply webapp-production",
  "db:seed": "wrangler d1 execute webapp-production --local --file=./seed.sql",
  "db:reset": "rm -rf .wrangler/state/v3/d1 && npm run db:migrate:local && npm run db:seed"
}
```

---

## 🔄 開発ワークフロー

### 日常的な開発
```bash
# コード変更後
npm run build

# サーバー再起動
pm2 restart webapp

# ログ確認
pm2 logs webapp --nostream
```

### データベース操作
```bash
# マイグレーション適用
npm run db:migrate:local

# データベースリセット
npm run db:reset

# SQLコンソール
npm run db:console:local
```

---

## 🚢 本番デプロイ（Cloudflare Pages）

### 事前準備
1. Cloudflare D1データベース作成
2. wrangler.jsonc の database_id 更新
3. 環境変数設定（OpenAI API Key, JWT Secret）

### デプロイ手順
```bash
# プロダクション用D1データベース作成
npx wrangler d1 create webapp-production

# マイグレーション適用（本番）
npm run db:migrate:prod

# デプロイ
npm run deploy:prod
```

---

## 🐛 トラブルシューティング

### サーバーが起動しない
```bash
# ポートクリーンアップ
npm run clean-port

# PM2完全停止
pm2 delete all

# 再ビルド＆起動
npm run build
pm2 start ecosystem.config.cjs
```

### ログイン失敗
- パスワードが正しいか確認
- データベースにユーザーが存在するか確認
```bash
npm run db:console:local
> SELECT * FROM users;
```

### API呼び出しエラー
- `.dev.vars` ファイルの環境変数を確認
- OpenAI API Keyの有効性を確認

---

## 📈 今後の拡張予定

### Phase 2（未実装機能）
- [ ] メール通知システム（Gmail SMTP）
- [ ] LINE通知連携
- [ ] OCR自動入力（OpenAI Vision API統合）
- [ ] PDF一次回答レポート自動生成
- [ ] ユーザー管理画面
- [ ] 高度な検索・フィルタ
- [ ] ダッシュボード分析機能
- [ ] ファイルプレビュー機能

### Phase 3（将来構想）
- [ ] 複数プロジェクト管理
- [ ] カレンダー統合
- [ ] モバイルアプリ（PWA）
- [ ] 帳票出力テンプレート
- [ ] データエクスポート（CSV/Excel）

---

## 👥 ユーザーロール

### 管理者（ADMIN）- 買側仲介
- 全案件の閲覧・編集・削除
- 新規案件作成
- 売側担当者の招待
- AI提案生成・レポート出力
- システム設定管理

### 売側担当者（AGENT）- 売側仲介
- 自社案件の閲覧・編集
- 資料アップロード
- チャット返信
- 不足情報の入力

---

## 📞 サポート

プロジェクト管理者: フルスタック開発マスター v2.0
技術スタック: Cloudflare Workers + Hono + D1 + OpenAI

---

## 📝 変更履歴

### v1.0.0 (2025-11-16)
- ✅ 初回リリース
- ✅ 認証システム実装
- ✅ 案件管理機能
- ✅ 営業日48時間管理
- ✅ チャット機能
- ✅ ファイル管理
- ✅ Proposal Suite（AI提案）
- ✅ Cloudflare D1統合

---

## ⚖️ ライセンス

© 2025 200棟アパート用地仕入れプロジェクト. All rights reserved.

---

**🎯 完璧に仕上がりました。**
