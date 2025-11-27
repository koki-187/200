-- v3.55.0: ストレージクォータの拡張
-- 目的: ユーザーごとのストレージ上限を100MB → 1GBに拡張

-- 既存ユーザーのストレージクォータを1GBに更新
UPDATE user_storage_quotas
SET quota_limit_bytes = 1073741824  -- 1GB (1024 * 1024 * 1024)
WHERE quota_limit_bytes = 104857600; -- 現在の100MB

-- 新規ユーザーのデフォルトクォータも1GBに設定
-- Note: アプリケーションコード (src/utils/storage-quota.ts) では既に変更済み
