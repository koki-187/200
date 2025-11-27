-- ストレージクォータを2GBに更新（一般ユーザー）、管理者は10GB
-- 2025-11-27

-- 既存の一般ユーザーのストレージクォータを2GBに更新
UPDATE user_storage_quotas
SET quota_limit_bytes = 2147483648  -- 2GB (2 * 1024 * 1024 * 1024)
WHERE quota_limit_bytes = 1073741824  -- 現在の1GB
AND user_id NOT IN (SELECT id FROM users WHERE role = 'ADMIN');

-- 管理者のストレージクォータを10GBに設定
UPDATE user_storage_quotas
SET quota_limit_bytes = 10737418240  -- 10GB (10 * 1024 * 1024 * 1024)
WHERE user_id IN (SELECT id FROM users WHERE role = 'ADMIN');

-- 既存の管理者で未設定の場合は挿入
INSERT OR IGNORE INTO user_storage_quotas (user_id, quota_limit_bytes, total_size_bytes, ocr_files, ocr_size_bytes)
SELECT id, 10737418240, 0, 0, 0
FROM users
WHERE role = 'ADMIN'
AND id NOT IN (SELECT user_id FROM user_storage_quotas);
