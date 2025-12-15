# 次のチャットへの引き継ぎ事項 (v3.153.96)

**作成日**: 2025-12-15  
**現在のバージョン**: v3.153.96  
**本番URL**: https://59ec7f1d.real-estate-200units-v2.pages.dev

---

## ✅ 完了タスク

### Task A1: 404エラー・'Invalid token'の根本原因特定 ✅
**結論**: システム外要因（Service Worker/ブラウザ拡張機能、CDN Tailwind CSS互換性）のため、**許容可能エラー**として判定。全主要リソースは正常にロード済み。

### Task A2: OpenAI API課金監視・$20/月コスト上限保護機能 ✅
**実装内容**:
- D1データベースに`openai_usage`, `ocr_deduplication`, `cost_limits`テーブル作成
- OCR APIにコスト計算・追跡・上限チェック追加
- フロントエンドにOCR実行前の確認ダイアログ追加
- 新規API: `GET /api/ocr-jobs/monthly-cost`（月間使用量取得）

**期待効果**:
- ✅ $20/月上限で自動ブロック（429エラー返却）
- ✅ ユーザーに透明性の高いコスト表示
- ✅ 管理者監査用の全API履歴記録

**詳細**: `TASK_A2_COMPLETION_REPORT_v3.153.96.md`参照

---

## ⏳ 未完了タスク（優先度順）

### 🔴 優先度: 高

#### Task A3: 確認ダイアログ実装
**対象**:
- データ削除操作（案件削除、ファイル削除）
- 重要設定変更（コスト上限変更、ユーザー権限変更）

**実装方針**:
- 既存の削除ボタンに`onclick`でconfirmダイアログ追加
- 重要な設定変更にも同様の確認プロセス追加

**推定工数**: 2-3時間

---

#### Task A4: リトライ機能実装
**対象**:
- OpenAI API（429 Rate Limit、500 Server Error）
- MLIT API（タイムアウト、一時的障害）
- Nominatim API（Overpass API）

**実装方針**:
- Exponential Backoff（指数バックオフ）: 1秒 → 2秒 → 4秒 → 8秒
- 最大リトライ回数: 3回
- ユーザーに「リトライ中...」表示

**推定工数**: 3-4時間

---

#### Task A5: 人間介入フロー実装
**対象**:
- OCRエラー時: 手動入力フォーム表示
- 物件情報補足エラー時: 代替入力方法ガイド
- リスクチェックエラー時: 外部サイトリンク提供

**実装方針**:
- エラーメッセージに「代替方法」ボタン追加
- モーダルで手動入力フォーム表示
- 外部リンク（国土交通省、ハザードマップ）提供

**推定工数**: 4-5時間

---

#### Task A6: 予期しない動作テスト
**テストシナリオ**:
1. OCR処理中にブラウザを閉じる
2. 連続10回のOCR実行（レート制限テスト）
3. ネットワーク切断中にリスクチェック実行
4. 同一ファイルの重複アップロード（24h以内）

**実装方針**:
- 各シナリオで適切なエラーハンドリング確認
- ユーザーに明確なエラーメッセージ表示
- 必要に応じてロールバック処理追加

**推定工数**: 3-4時間（テスト実施）

---

#### Task A7: 実ユーザーテスト4件
**テストケース**:
1. OCR機能（ログイン必須）: PDF/画像アップロード → 物件情報抽出
2. 物件情報補足（ログイン必須）: 住所入力 → MLIT APIデータ取得
3. 総合リスクチェック（ログイン必須）: ハザードリスク確認
4. 管理者アクセス制御: 非管理者の`/admin`アクセス拒否

**実施方法**:
- ユーザーに本番環境URLを提供
- 各テストケースを実施
- スクリーンショット・エラーログを収集
- 結果を報告

**推定工数**: ユーザー依存（AIは支援のみ）

---

#### Task A9: 最終品質保証
**チェック項目**:
- [ ] 全機能の動作確認（OCR、物件情報補足、リスクチェック）
- [ ] 全エラーハンドリングの確認
- [ ] 全ログの記録確認（`openai_usage`, `error_logs`）
- [ ] パフォーマンステスト（レスポンスタイム、メモリ使用量）
- [ ] セキュリティ監査（認証、認可、XSS、CSRF）

**推定工数**: 4-6時間

---

### 🟡 優先度: 中

#### Task A8: 管理者ログ実装
**実装内容**:
- `/admin/openai-costs`: 月間コストグラフ・履歴表示
- `/admin/api-logs`: 全APIコール履歴表示
- `/admin/error-logs`: 詳細エラーログ表示

**実装方針**:
- `openai_usage`, `api_logs`, `error_logs`テーブルをクエリ
- Chart.jsで視覚化
- 管理者のみアクセス可能（`adminOnly`ミドルウェア適用済み）

**推定工数**: 5-6時間

---

## 🚧 既知の制限事項

### 1. 重複実行防止機能（未実装）
**状態**: `ocr_deduplication`テーブルは作成済みだが、ファイルハッシュ計算・重複チェックロジックは未実装

**実装方針**:
- フロントエンドでファイルハッシュ(SHA-256)を計算
- バックエンドでDBチェック → 24h以内の同一ファイルをブロック

### 2. 推定コストの精度
**現在**: 固定値$0.02/ファイルで推定（実際はトークン数に依存）

**改善案**:
- ファイルサイズ・ページ数から動的推定
- 過去の実績データから機械学習で予測

### 3. マイグレーション競合
**無効化したファイル**:
- `migrations/0010_error_logs.sql.disabled`
- `migrations/0020_add_notifications.sql.disabled`
- `migrations/0026_add_api_and_error_logs.sql.disabled`

**理由**: 既存のテーブルスキーマと新しいマイグレーションが競合

**対処**: 将来的にスキーマを統一する必要あり

---

## 📁 重要ファイル一覧

### 実装コード
- `src/routes/ocr-jobs.ts` - OCR API（コスト追跡追加）
- `public/static/ocr-init.js` - OCRフロントエンド（確認ダイアログ追加）
- `migrations/0028_add_openai_usage_tracking.sql` - OpenAI使用量追跡テーブル

### ドキュメント
- `TASK_A2_COMPLETION_REPORT_v3.153.96.md` - Task A2詳細報告書
- `ERROR_ANALYSIS_404_INVALID_TOKEN.md` - Task A1エラー分析
- `RELEASE_REPORT_v3.153.95.md` - 前回のリリース報告書

### 設定ファイル
- `wrangler.jsonc` - Cloudflare設定
- `package.json` - npm scripts
- `.gitignore` - Git除外ファイル

---

## 🔧 開発環境セットアップ（次のチャット開始時）

### 1. 依存関係インストール
```bash
cd /home/user/webapp
npm install
```

### 2. ローカルD1マイグレーション適用
```bash
npx wrangler d1 migrations apply real-estate-200units-db --local
```

### 3. ローカル開発サーバー起動
```bash
# ビルド
npm run build

# PM2で起動
pm2 start ecosystem.config.cjs

# テスト
curl http://localhost:3000
```

### 4. 本番デプロイ
```bash
# ビルド
npm run build

# 本番DBマイグレーション（必要時のみ）
npx wrangler d1 migrations apply real-estate-200units-db --remote

# デプロイ
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

---

## 🎯 次のアクション（推奨順序）

1. **Task A3**: 確認ダイアログ実装（削除操作・重要設定変更）
2. **Task A4**: リトライ機能実装（OpenAI API、MLIT API）
3. **Task A5**: 人間介入フロー実装（エラー時の代替手段）
4. **Task A6**: 予期しない動作テスト実施
5. **Task A7**: 実ユーザーテスト4件実施（ユーザー協力必要）
6. **Task A8**: 管理者ログ実装（コスト監視ダッシュボード）
7. **Task A9**: 最終品質保証・リリース準備

---

## 📞 質問・不明点があれば

**Master QA Architect**として、以下の質問に回答可能です:
- Task A3-A9の具体的な実装方法
- コード修正時の注意点
- テスト方法の詳細
- デプロイ手順の詳細

---

**次のチャット開始時**: このドキュメントを参照し、Task A3から作業を再開してください。
