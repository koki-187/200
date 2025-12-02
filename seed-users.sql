-- テストユーザー作成用SQLファイル
-- パスワード: "test123456" と "seller123" (PBKDF2ハッシュ化済み)

-- 注意: これらのハッシュはNode.js cryptoで生成されたものなので、
-- 実際にはCloudflare Workersで動作しない可能性があります。
-- ブラウザからログインして新しいユーザーを作成することを推奨します。

-- 一時的な解決策として、簡単なパスワードハッシュを使用
-- 実際の運用では、ブラウザのUIから正しいPBKDF2ハッシュを生成すること

-- テスト管理者（メールアドレス: test@example.com, パスワード: test123456）
INSERT OR REPLACE INTO users (id, email, password_hash, name, role, created_at, updated_at) 
VALUES ('admin-001', 'test@example.com', 'jv2Yd8o3HwtMXiJ0sfT4XKgkLxYzlc6W56dwuG0kL2uWkWKQT8hemwsIMqzjaiUy', 'テスト管理者', 'ADMIN', datetime('now'), datetime('now'));

-- テスト売主（メールアドレス: seller@example.com, パスワード: seller123）
INSERT OR REPLACE INTO users (id, email, password_hash, name, role, created_at, updated_at) 
VALUES ('seller-001', 'seller@example.com', 'Q+OtwTWqhkQk/J6MSyOeDcpF7iZLSfg3ZezR5gXMpn7XVXJRwHknt5fvRx6tL6Uh', 'テスト売主', 'AGENT', datetime('now'), datetime('now'));

-- ユーザー確認
SELECT id, email, name, role FROM users;
