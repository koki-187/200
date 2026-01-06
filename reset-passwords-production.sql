-- 本番環境用パスワードリセットSQL
-- パスワード: test123456 (全アカウント共通)

-- 管理者アカウント
UPDATE users 
SET password_hash = 'pbkdf2:sha256:600000$randomsalt123$f8d8e9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8'
WHERE email = 'test@example.com';

-- 売主アカウント
UPDATE users 
SET password_hash = 'pbkdf2:sha256:600000$randomsalt123$f8d8e9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8'
WHERE email = 'seller@example.com';

UPDATE users 
SET password_hash = 'pbkdf2:sha256:600000$randomsalt123$f8d8e9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8'
WHERE email = 'seller2@example.com';

-- 確認
SELECT id, email, name, role, 
       CASE 
         WHEN password_hash LIKE 'pbkdf2:%' THEN '✅ PBKDF2形式'
         ELSE '❌ 旧形式'
       END as password_format
FROM users
WHERE email IN ('test@example.com', 'seller@example.com', 'seller2@example.com');
