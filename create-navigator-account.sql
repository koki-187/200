-- navigator-187@docomo.ne.jp アカウントの作成
-- Password: test123456

INSERT INTO users (
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
  -- この password_hash は一時的なものです
  -- 実際のパスワードハッシュはCloudflare Workers環境で生成する必要があります
  'TEMP_HASH_NEEDS_RESET',
  datetime('now'),
  datetime('now')
);

-- 確認
SELECT id, email, name, role FROM users WHERE email = 'navigator-187@docomo.ne.jp';
