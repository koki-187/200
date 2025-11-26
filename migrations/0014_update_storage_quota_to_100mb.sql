-- ストレージクォータを500MBから100MBに変更（10名で1GB制限）
-- 既存ユーザーのクォータを更新
UPDATE user_storage_quotas 
SET quota_limit_bytes = 104857600  -- 100MB
WHERE quota_limit_bytes = 524288000;  -- 500MBから変更

-- デフォルト値を100MBに設定（新規ユーザー用）
-- ALTER TABLE文はCloudflare D1でサポートされていないため、
-- 新しいユーザーは initializeUserStorageQuota() 関数で100MBが設定される
