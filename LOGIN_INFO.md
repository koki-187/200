# ログイン情報

## 本番環境URL
**Production URL**: https://a2b11148.real-estate-200units-v2.pages.dev

## ユーザーアカウント一覧

### テスト用アカウント（パスワード: Test1234!）

| ユーザーID | メールアドレス | パスワード | ロール | 備考 |
|-----------|--------------|----------|--------|------|
| e3e7b2cb-3e3e-4b99-840f-7287a4c45b86 | admin@200units.com | Test1234! | ADMIN | テスト管理者 |
| 1805f040-561f-4fae-8f22-792cc852d941 | agent@200units.com | Test1234! | AGENT | テスト担当者 |
| seller-001 | seller1@example.com | Test1234! | AGENT | テスト売主1 |
| seller-002 | seller2@example.com | Test1234! | AGENT | テスト売主2 |
| user-aN7DwjL7fR | prod-test-agent@example.com | Test1234! | AGENT | 本番テスト担当者 |
| test-admin-001 | admin@test.com | Test1234! | ADMIN | テスト管理者2 |

### 実ユーザーアカウント（独自パスワード）

| ユーザーID | メールアドレス | パスワード | ロール | 備考 |
|-----------|--------------|----------|--------|------|
| admin-001 | navigator-187@docomo.ne.jp | （独自パスワード） | ADMIN | 実ユーザー |

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
