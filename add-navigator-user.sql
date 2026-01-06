-- navigator-187@docomo.ne.jp アカウント作成
-- パスワードは最初のログイン後にブラウザで変更してください

-- このハッシュは seed-users.sql と同じ形式を使用
-- Password: test123456
INSERT OR IGNORE INTO users (
  id,
  email,
  name,
  role,
  password_hash,
  created_at,
  updated_at
) VALUES (
  'user-navigator-187',
  'navigator-187@docomo.ne.jp',
  'Navigator User',
  'ADMIN',
  'jv2Yd8o3HwtMXiJ0sfT4XKgkLxYzlc6W56dwuG0kL2uWkWKQT8hemwsIMqzjaiUy',
  datetime('now'),
  datetime('now')
);

SELECT 'User created:' as status, id, email, name, role FROM users WHERE email = 'navigator-187@docomo.ne.jp';
