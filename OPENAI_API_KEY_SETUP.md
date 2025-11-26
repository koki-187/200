# OpenAI APIキー設定手順

## 🚨 重要: OCR機能を使用するために必要です

現在、OCR（光学文字認識）機能が動作していない理由は、**OpenAI APIキーが設定されていない**ためです。

### エラーメッセージ例
```
Incorrect API key provided: sk-your-***************here
```

## 📋 手順

### 1. OpenAI APIキーを取得

1. [OpenAI Platform](https://platform.openai.com/)にアクセス
2. アカウントにログイン（なければ新規登録）
3. 左メニューの「API Keys」をクリック
4. 「Create new secret key」をクリック
5. キー名を入力（例: "real-estate-ocr"）
6. 生成されたAPIキーをコピー（`sk-proj-...`で始まる文字列）
   - ⚠️ この画面を閉じると二度と表示されないため、必ずコピーしてください

### 2. ローカル開発環境に設定

`.dev.vars`ファイルを編集します：

```bash
# 現在の設定（プレースホルダー）
OPENAI_API_KEY=sk-your-openai-api-key-here

# ↓ 実際のAPIキーに置き換える
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxx
```

**編集手順：**

```bash
cd /home/user/webapp

# .dev.varsファイルを編集
nano .dev.vars

# または、コマンドで直接置き換え
sed -i 's/sk-your-openai-api-key-here/sk-proj-YOUR_ACTUAL_API_KEY/' .dev.vars
```

**変更後、ローカルサーバーを再起動：**

```bash
# PM2でサーバーを再起動
pm2 restart webapp

# または、ポートをクリーンして再起動
fuser -k 3000/tcp
pm2 start ecosystem.config.cjs
```

### 3. 本番環境（Cloudflare Pages）に設定

本番環境では、Wranglerコマンドを使用してシークレットを設定します：

```bash
cd /home/user/webapp

# OpenAI APIキーをシークレットとして設定
npx wrangler pages secret put OPENAI_API_KEY --project-name real-estate-200units-v2
# → プロンプトが表示されたら、実際のAPIキーを入力してEnter

# JWT_SECRETも設定（未設定の場合）
npx wrangler pages secret put JWT_SECRET --project-name real-estate-200units-v2
# → プロンプトが表示されたら、ランダムな長い文字列を入力してEnter
```

**設定を確認：**

```bash
# シークレット一覧を表示
npx wrangler pages secret list --project-name real-estate-200units-v2
```

### 4. 動作確認

**ローカル環境：**

```bash
# OCR機能をテスト
python3 /tmp/test_local_ocr.py
```

**本番環境：**

1. ブラウザで `https://real-estate-200units-v2.pages.dev/deals/new` にアクセス
2. ログイン（Email: `navigator-187@docomo.ne.jp`, Password: `kouki187`）
3. 「OCR自動入力」セクションで画像ファイルを選択
4. OCR処理が開始されることを確認
5. 処理完了後、抽出されたデータが表示されることを確認

## 💰 OpenAI APIの料金について

OCR機能では、OpenAIの`gpt-4o`モデルを使用しています。

**料金目安（2024年11月時点）：**
- 画像1枚の処理：約 $0.01〜$0.03
- 1,000枚処理した場合：約 $10〜$30

**節約のヒント：**
- OCR処理は必要な場合のみ実行する
- テスト時は少数の画像で確認する
- OpenAI APIの使用量制限を設定する（OpenAI Platform > Settings > Limits）

## 🔒 セキュリティ上の注意

1. **APIキーを公開しない**
   - GitHubやSlackなど、公開の場にAPIキーを投稿しない
   - `.dev.vars`ファイルは`.gitignore`に含まれているため、Gitにはコミットされません

2. **APIキーの権限を制限**
   - OpenAI Platformで、必要最小限の権限のみを付与

3. **定期的にローテーション**
   - セキュリティのため、定期的に新しいAPIキーを生成し、古いキーを無効化

## ❓ トラブルシューティング

### エラー: "Incorrect API key provided"

→ APIキーが正しく設定されていません。上記の手順を再確認してください。

### エラー: "You exceeded your current quota"

→ OpenAI APIの利用制限に達しています。OpenAI Platformで以下を確認：
- 請求情報が設定されているか
- 利用可能なクレジットが残っているか
- 使用量制限に達していないか

### OCR処理が遅い

→ 正常な動作です。画像1枚の処理に10〜20秒かかります。
- 画像サイズが大きい場合、処理時間が長くなります
- 複数ファイルを同時に処理すると、さらに時間がかかります

## 📞 サポート

問題が解決しない場合は、以下の情報を添えてお問い合わせください：

1. エラーメッセージの全文
2. 設定したAPIキーの先頭6文字（例: `sk-pro...`）
3. ブラウザのコンソールログ（F12 → Console）
4. 実行環境（ローカル / 本番）

---

**最終更新**: 2025-11-26  
**バージョン**: v3.50.1
