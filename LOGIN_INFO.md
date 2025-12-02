# ログイン情報

**最終更新**: 2025-12-02 v3.96.0 パスワードリセット実施

## 本番環境URL
**Production URL**: https://a2b11148.real-estate-200units-v2.pages.dev

## ユーザーアカウント一覧

### ✅ 全ユーザーログイン確認済み（2025-12-02）

| メールアドレス | パスワード | ロール | 備考 | ログインステータス |
|--------------|----------|--------|------|--------------------|
| navigator-187@docomo.ne.jp | **kouki187** | ADMIN | 実ユーザー（管理者） | ✅ 確認済み |
| admin@test.com | **admin123** | ADMIN | テスト管理者 | ✅ 確認済み |
| admin@200units.com | **Test1234!** | ADMIN | テスト管理者2 | ✅ 確認済み |
| agent@200units.com | **Test1234!** | AGENT | テスト担当者 | ✅ 確認済み |
| prod-test-agent@example.com | **Test1234!** | AGENT | 本番テスト担当者 | ✅ 確認済み |
| seller1@example.com | **Test1234!** | AGENT | 田中太郎（売主1） | ✅ 確認済み |
| seller2@example.com | **Test1234!** | AGENT | 佐藤花子（売主2） | ✅ 確認済み |

## ログイン手順

1. 本番環境URLにアクセス: https://a2b11148.real-estate-200units-v2.pages.dev
2. 上記のメールアドレスとパスワードでログイン
3. 初回ログイン後はパスワード変更を推奨

## 注意事項

- テスト用アカウントは全て `Test1234!` で統一されています
- `navigator-187@docomo.ne.jp` は実ユーザーのため、独自パスワードが設定されています
- セキュリティ上、本番運用時には各アカウントのパスワードを個別に変更することを強く推奨します

## パスワードリセット方法

管理者が他のユーザーのパスワードをリセットする場合:

```bash
# Wranglerを使用してD1データベースに接続
npx wrangler d1 execute real-estate-200units-db --remote

# パスワードハッシュを生成（別途Node.jsスクリプトで生成）
# UPDATE users SET password_hash = '<新しいハッシュ>' WHERE email = '<メールアドレス>';
```

または、ユーザー管理画面（実装予定）から変更可能です。
