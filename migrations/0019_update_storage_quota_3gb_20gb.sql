-- ストレージクォータを3GB（一般ユーザー）、20GB（管理者）に更新
-- 2025-11-27

-- 既存の一般ユーザーのストレージクォータを3GBに更新
UPDATE user_storage_quotas
SET quota_limit_bytes = 3221225472  -- 3GB (3 * 1024 * 1024 * 1024)
WHERE quota_limit_bytes < 10737418240  -- 10GB未満（一般ユーザー）
AND user_id NOT IN (SELECT id FROM users WHERE role = 'ADMIN');

-- 管理者のストレージクォータを20GBに設定
UPDATE user_storage_quotas
SET quota_limit_bytes = 21474836480  -- 20GB (20 * 1024 * 1024 * 1024)
WHERE user_id IN (SELECT id FROM users WHERE role = 'ADMIN');

-- 既存の管理者で未設定の場合は挿入
INSERT OR IGNORE INTO user_storage_quotas (user_id, quota_limit_bytes, total_size_bytes, ocr_files, ocr_size_bytes)
SELECT id, 21474836480, 0, 0, 0
FROM users
WHERE role = 'ADMIN'
AND id NOT IN (SELECT user_id FROM user_storage_quotas);
