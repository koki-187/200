# 📊 Google Analytics 4 (GA4) 設定完全ガイド

**対象システム**: 200戸土地仕入れ管理システム  
**作成日**: 2025-11-20  
**難易度**: 初級〜中級  
**所要時間**: 約15〜30分

---

## 📋 目次

1. [GA4とは](#ga4とは)
2. [事前準備](#事前準備)
3. [ステップ1: Googleアカウントの準備](#ステップ1-googleアカウントの準備)
4. [ステップ2: GA4プロパティの作成](#ステップ2-ga4プロパティの作成)
5. [ステップ3: Measurement IDの取得](#ステップ3-measurement-idの取得)
6. [ステップ4: ローカル開発環境への設定](#ステップ4-ローカル開発環境への設定)
7. [ステップ5: 本番環境への設定](#ステップ5-本番環境への設定)
8. [ステップ6: 動作確認](#ステップ6-動作確認)
9. [トラブルシューティング](#トラブルシューティング)
10. [よくある質問](#よくある質問)

---

## GA4とは

Google Analytics 4 (GA4) は、Googleが提供する最新の無料アクセス解析ツールです。

### 主な機能
- ✅ **ページビュー追跡**: どのページが閲覧されているか
- ✅ **ユーザー行動分析**: ユーザーの操作パターン
- ✅ **リアルタイム監視**: 現在のアクセス状況
- ✅ **コンバージョン追跡**: 案件作成、メッセージ送信などの重要アクション
- ✅ **デバイス分析**: モバイル/デスクトップの利用状況

### このシステムでの活用例
- 📊 ダッシュボードの閲覧数
- 📨 メッセージ送信回数
- 📁 ファイルアップロード数
- 🔍 検索キーワードの分析
- ⚠️ エラー発生の監視

---

## 事前準備

### 必要なもの
1. ✅ Googleアカウント（無料、既存のGmailアカウントでOK）
2. ✅ 管理者権限のあるコンピュータ
3. ✅ インターネット接続
4. ✅ このシステムへのアクセス権限

### コード実装状況
✅ **既に完了**: GA4統合コードは実装済みです（`public/static/analytics.js`）  
⚠️ **未完了**: Measurement IDの設定のみ必要

---

## ステップ1: Googleアカウントの準備

### 1.1 既存アカウントを使う場合
1. Gmailアカウントをお持ちの場合、そのままご利用いただけます
2. 個人用アカウントでもビジネス用アカウントでもOK

### 1.2 新規アカウントを作成する場合
1. https://accounts.google.com/signup にアクセス
2. 必要事項を入力してアカウント作成
3. メールアドレス確認を完了

---

## ステップ2: GA4プロパティの作成

### 2.1 Google Analyticsにアクセス
1. https://analytics.google.com/ にアクセス
2. Googleアカウントでログイン

### 2.2 初回セットアップ（アカウントがない場合）
1. 「測定を開始」ボタンをクリック
2. アカウント名を入力
   - 例: `不動産管理システム` または `会社名`
3. アカウントのデータ共有設定
   - 推奨: デフォルトのまま（全てチェックON）
4. 「次へ」をクリック

### 2.3 プロパティの作成
1. プロパティ名を入力
   - 例: `200戸土地仕入れ管理システム`
2. レポートのタイムゾーンを選択
   - `日本` を選択
3. 通貨を選択
   - `日本円（¥）` を選択
4. 「次へ」をクリック

### 2.4 ビジネス情報の入力
1. 業種を選択
   - `不動産` を選択
2. ビジネスの規模を選択
   - 該当するものを選択
3. 「作成」をクリック
4. 利用規約に同意

### 2.5 データストリームの作成
1. プラットフォーム選択画面で「ウェブ」を選択
2. ウェブサイトのURLを入力
   - **本番環境**: `https://f7081038.real-estate-200units-v2.pages.dev`
   - または カスタムドメインがある場合はそのURL
3. ストリーム名を入力
   - 例: `本番環境` または `Production`
4. 「ストリームを作成」をクリック

---

## ステップ3: Measurement IDの取得

### 3.1 Measurement IDの確認
1. データストリーム作成後、自動的に詳細画面が表示されます
2. 画面右上に **測定ID** が表示されています
   - 形式: `G-XXXXXXXXXX` （Gで始まる10文字のID）
   - 例: `G-ABC1234567`

### 3.2 Measurement IDのコピー
1. 測定IDの右側にある📋コピーアイコンをクリック
2. または、IDを手動で選択してコピー（Ctrl+C / Cmd+C）

### 3.3 後から確認する方法
1. Google Analyticsホーム画面左下の⚙️「管理」をクリック
2. 「プロパティ」列の「データストリーム」をクリック
3. 該当するウェブストリームをクリック
4. 測定IDが表示されます

---

## ステップ4: ローカル開発環境への設定

### 4.1 .dev.vars ファイルの編集

ローカル開発環境で動作確認する場合の設定です。

```bash
# 1. プロジェクトディレクトリに移動
cd /home/user/webapp

# 2. .dev.vars ファイルを編集
nano .dev.vars
# または
vim .dev.vars
```

### 4.2 Measurement IDの追記

.dev.vars ファイルの最後に以下を追加:

```bash
# 既存の設定
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google Analytics 4 (GA4) - 以下を追記
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**重要**: `G-XXXXXXXXXX` の部分を、ステップ3で取得した実際のMeasurement IDに置き換えてください。

### 4.3 保存して終了
- nano の場合: `Ctrl + X` → `Y` → `Enter`
- vim の場合: `Esc` → `:wq` → `Enter`

### 4.4 ローカルサーバーの再起動

```bash
# ビルド
npm run build

# PM2で再起動
pm2 restart webapp

# または、ポートをクリーンにして起動
fuser -k 3000/tcp 2>/dev/null || true
pm2 restart webapp
```

---

## ステップ5: 本番環境への設定

### 5.1 Cloudflareへの設定

本番環境（Cloudflare Pages）への設定方法です。

```bash
# プロジェクトディレクトリに移動
cd /home/user/webapp

# Wranglerで本番環境にシークレットを設定
npx wrangler pages secret put GA_MEASUREMENT_ID --project-name real-estate-200units-v2
```

### 5.2 Measurement IDの入力

コマンド実行後、プロンプトが表示されます:

```
Enter a secret value: ›
```

ここで、ステップ3で取得したMeasurement IDを入力してください:

```
Enter a secret value: › G-XXXXXXXXXX
```

**注意**: 入力中は画面に表示されません（セキュリティ保護）。正確に入力して Enter を押してください。

### 5.3 設定の確認

```bash
# 設定されたシークレットの一覧を確認（値は表示されません）
npx wrangler pages secret list --project-name real-estate-200units-v2
```

以下のような出力が表示されれば成功です:

```
GA_MEASUREMENT_ID
JWT_SECRET
OPENAI_API_KEY
```

### 5.4 再デプロイ

環境変数を反映させるため、再デプロイが必要です:

```bash
# ビルド
npm run build

# デプロイ
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

デプロイ完了後、新しいURLが表示されます:

```
✨ Deployment complete! Take a peek over at https://xxxxxxxx.real-estate-200units-v2.pages.dev
```

---

## ステップ6: 動作確認

### 6.1 リアルタイムレポートで確認

GA4が正しく動作しているか確認します。

1. Google Analytics（https://analytics.google.com/）にアクセス
2. 左メニューの「レポート」をクリック
3. 「リアルタイム」をクリック

### 6.2 テストアクセス

```bash
# 本番環境にアクセス
# ブラウザで以下のURLを開く
https://f7081038.real-estate-200units-v2.pages.dev
```

または

```bash
# コマンドラインでアクセス
curl https://f7081038.real-estate-200units-v2.pages.dev
```

### 6.3 確認ポイント

Google Analyticsのリアルタイムレポートで以下を確認:

1. **過去30分間のユーザー数**: 1以上になっているか
2. **イベント数**: ページビューが記録されているか
3. **ページタイトル**: システムのページが表示されているか

### 6.4 確認が取れない場合

数分待ってからリロードしてください。GA4のリアルタイムレポートは数秒〜数分の遅延があります。

---

## トラブルシューティング

### 問題1: リアルタイムレポートにデータが表示されない

**原因と解決策**:

1. **設定直後**: 数分待ってからリロードしてください
2. **Measurement ID の間違い**: 
   - `G-XXXXXXXXXX` の形式か確認
   - コピー時にスペースが入っていないか確認
3. **環境変数が反映されていない**:
   ```bash
   # 本番環境を再デプロイ
   npm run build
   npx wrangler pages deploy dist --project-name real-estate-200units-v2
   ```

### 問題2: 「測定IDが無効です」エラー

**原因**: Measurement IDの形式が正しくありません

**解決策**:
1. Google Analyticsで測定IDを再確認
2. `G-` で始まっているか確認
3. 英数字10文字（例: G-ABC1234567）か確認
4. 再設定:
   ```bash
   # .dev.vars を再編集
   nano .dev.vars
   # GA_MEASUREMENT_ID の値を修正
   
   # 本番環境も再設定
   npx wrangler pages secret put GA_MEASUREMENT_ID --project-name real-estate-200units-v2
   ```

### 問題3: ローカル環境では動作するが本番で動作しない

**原因**: 本番環境のシークレットが設定されていない

**解決策**:
```bash
# シークレット一覧を確認
npx wrangler pages secret list --project-name real-estate-200units-v2

# GA_MEASUREMENT_ID がなければ追加
npx wrangler pages secret put GA_MEASUREMENT_ID --project-name real-estate-200units-v2

# 再デプロイ
npm run build
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

### 問題4: ブラウザコンソールにエラーが表示される

**エラー例**:
```
Google Analytics: Measurement ID not configured
```

**原因**: 環境変数が読み込まれていない

**解決策**:
1. ブラウザで開発者ツールを開く（F12）
2. Console タブを確認
3. 以下のメッセージが表示されていれば正常:
   ```
   Google Analytics initialized: G-XXXXXXXXXX
   ```

---

## よくある質問

### Q1: GA4の利用は無料ですか？
**A**: はい、完全無料です。料金プランはありません。

### Q2: 個人のGmailアカウントを使っても大丈夫ですか？
**A**: はい、問題ありません。ビジネス用アカウントでなくても利用できます。

### Q3: 複数のドメインで同じMeasurement IDを使えますか？
**A**: 使えますが、推奨しません。ドメインごとに別のデータストリームを作成することをお勧めします。

### Q4: データの保持期間はどれくらいですか？
**A**: デフォルトは14ヶ月です。設定で2ヶ月〜14ヶ月の範囲で変更できます。

### Q5: 過去のデータは見られますか？
**A**: GA4を設定した日以降のデータのみ記録されます。設定前のデータは遡って取得できません。

### Q6: テスト環境と本番環境で別々のIDが必要ですか？
**A**: 推奨します。以下のように使い分けると分析しやすいです:
- ローカル/ステージング: `G-AAAA111111`
- 本番環境: `G-BBBB222222`

### Q7: 他の人にもダッシュボードを見せたい場合は？
**A**: Google Analyticsの「管理」→「プロパティ」→「プロパティのアクセス管理」から、メールアドレスを追加してください。

### Q8: Measurement IDを変更したい場合は？
**A**: 新しいデータストリームを作成し、新しいMeasurement IDをステップ4・5に従って再設定してください。

### Q9: GA4のレポートはどこで見られますか？
**A**: https://analytics.google.com/ にログインし、左メニューの「レポート」から各種レポートを確認できます。

### Q10: プライバシーやGDPR対応は大丈夫ですか？
**A**: GA4はGDPR対応済みです。ただし、サイトに適切なプライバシーポリシーとCookie同意の表示が必要です。

---

## 📊 GA4で追跡されるイベント一覧

このシステムでは、以下のイベントが自動的にGA4に送信されます（`public/static/analytics.js` 実装済み）:

### 自動追跡イベント
| イベント名 | 説明 | 送信タイミング |
|-----------|------|--------------|
| `page_view` | ページ閲覧 | ページ読み込み時 |
| `login` | ログイン | ユーザーログイン時 |
| `sign_up` | サインアップ | 新規ユーザー登録時 |

### ビジネスイベント（実装済み、呼び出し待ち）
| イベント名 | 説明 | パラメータ |
|-----------|------|-----------|
| `deal_created` | 案件作成 | deal_id, value, currency |
| `deal_updated` | 案件更新 | deal_id, deal_status |
| `message_sent` | メッセージ送信 | deal_id, has_attachment |
| `file_uploaded` | ファイルアップロード | file_type, file_size |
| `search` | 検索実行 | search_term, result_count |
| `exception` | エラー発生 | description, fatal |

### カスタムイベントの追加方法

フロントエンドコードから以下のように呼び出せます:

```javascript
// 案件作成時
window.analyticsManager.trackDealCreated('deal-123', 50000000);

// メッセージ送信時
window.analyticsManager.trackMessageSent('deal-123', true);

// 検索実行時
window.analyticsManager.trackSearch('渋谷区 土地', 15);

// エラー発生時
window.analyticsManager.trackError('API Error', 'Failed to fetch deals');
```

---

## 🎓 次のステップ

GA4の設定が完了したら、以下を検討してください:

### 1. カスタムレポートの作成
- Google Analytics で「探索」機能を使ってカスタムレポートを作成
- よく見る指標をダッシュボードにまとめる

### 2. コンバージョンの設定
- 重要なイベント（案件作成、契約締結など）をコンバージョンとして設定
- 「管理」→「イベント」→ 該当イベントの「コンバージョンとしてマークを付ける」

### 3. アラートの設定
- 急激なアクセス減少やエラー増加時に通知を受け取る
- 「管理」→「カスタムアラート」で設定

### 4. データ分析の定期確認
- 週次・月次でレポートを確認
- ユーザー行動パターンを分析し、UI/UX改善に活用

---

## 📞 サポート

### このガイドについて
- ガイド作成日: 2025-11-20
- 対象バージョン: v3.28.0
- GA4バージョン: Google Analytics 4 (最新版)

### 関連ドキュメント
- **Google Analytics 4 公式ヘルプ**: https://support.google.com/analytics/answer/9304153
- **Cloudflare Pages ドキュメント**: https://developers.cloudflare.com/pages/
- **システムハンドオーバー**: `/home/user/webapp/HANDOVER_V3.28.0.md`

### 問い合わせ先
- システム管理者: navigator-187@docomo.ne.jp
- プロジェクトリポジトリ: （GitHub URL）

---

## ✅ チェックリスト

設定完了後、以下を確認してください:

- [ ] Googleアカウントの準備完了
- [ ] GA4プロパティ作成完了
- [ ] Measurement ID取得完了（G-XXXXXXXXXX）
- [ ] ローカル環境（.dev.vars）への設定完了
- [ ] 本番環境（wrangler secret）への設定完了
- [ ] 本番環境への再デプロイ完了
- [ ] リアルタイムレポートでデータ確認完了
- [ ] ページビューイベントが記録されている
- [ ] ブラウザコンソールにエラーがない

すべてチェックできたら、GA4の設定は完了です！🎉

---

**ドキュメント作成**: 2025-11-20  
**最終更新**: 2025-11-20  
**バージョン**: 1.0
