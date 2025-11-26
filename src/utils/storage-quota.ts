import { D1Database } from '@cloudflare/workers-types';

/**
 * ストレージクォータ管理
 */

export interface StorageQuota {
  user_id: string;
  total_files: number;
  total_size_bytes: number;
  ocr_files: number;
  ocr_size_bytes: number;
  photo_files: number;
  photo_size_bytes: number;
  quota_limit_bytes: number;
  updated_at: string;
}

export interface StorageUsage {
  used_bytes: number;
  used_mb: number;
  limit_bytes: number;
  limit_mb: number;
  usage_percent: number;
  available_bytes: number;
  available_mb: number;
}

/**
 * ユーザーのストレージクォータを取得
 */
export async function getUserStorageQuota(
  db: D1Database,
  userId: string
): Promise<StorageQuota | null> {
  const result = await db
    .prepare('SELECT * FROM user_storage_quotas WHERE user_id = ?')
    .bind(userId)
    .first<StorageQuota>();
  
  return result || null;
}

/**
 * ユーザーのストレージクォータを初期化
 */
export async function initializeUserStorageQuota(
  db: D1Database,
  userId: string,
  quotaLimitBytes: number = 524288000 // 500MB default
): Promise<void> {
  await db
    .prepare(`
      INSERT INTO user_storage_quotas (user_id, quota_limit_bytes)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO NOTHING
    `)
    .bind(userId, quotaLimitBytes)
    .run();
}

/**
 * ストレージ使用量を計算
 */
export function calculateStorageUsage(quota: StorageQuota): StorageUsage {
  const used_bytes = quota.total_size_bytes;
  const limit_bytes = quota.quota_limit_bytes;
  const usage_percent = limit_bytes > 0 ? (used_bytes / limit_bytes) * 100 : 0;
  const available_bytes = Math.max(0, limit_bytes - used_bytes);
  
  return {
    used_bytes,
    used_mb: Math.round((used_bytes / 1024 / 1024) * 100) / 100,
    limit_bytes,
    limit_mb: Math.round((limit_bytes / 1024 / 1024) * 100) / 100,
    usage_percent: Math.round(usage_percent * 100) / 100,
    available_bytes,
    available_mb: Math.round((available_bytes / 1024 / 1024) * 100) / 100
  };
}

/**
 * ストレージクォータをチェック（アップロード前）
 */
export async function checkStorageQuota(
  db: D1Database,
  userId: string,
  additionalBytes: number
): Promise<{ allowed: boolean; message?: string; quota?: StorageQuota }> {
  // クォータ取得
  let quota = await getUserStorageQuota(db, userId);
  
  // クォータが存在しない場合は初期化
  if (!quota) {
    await initializeUserStorageQuota(db, userId);
    quota = await getUserStorageQuota(db, userId);
    if (!quota) {
      return { allowed: false, message: 'ストレージクォータの初期化に失敗しました' };
    }
  }
  
  // クォータチェック
  const newTotalSize = quota.total_size_bytes + additionalBytes;
  
  if (newTotalSize > quota.quota_limit_bytes) {
    const usage = calculateStorageUsage(quota);
    return {
      allowed: false,
      message: `ストレージ容量が不足しています。\n現在の使用量: ${usage.used_mb}MB / ${usage.limit_mb}MB\nアップロードサイズ: ${Math.round((additionalBytes / 1024 / 1024) * 100) / 100}MB\n利用可能容量: ${usage.available_mb}MB`,
      quota
    };
  }
  
  return { allowed: true, quota };
}

/**
 * ファイルアップロード時にクォータを更新
 */
export async function updateStorageQuotaOnUpload(
  db: D1Database,
  userId: string,
  fileSize: number,
  fileCategory: 'ocr_document' | 'photo' | 'other'
): Promise<void> {
  // カテゴリー別の更新
  const categoryField = 
    fileCategory === 'ocr_document' ? 'ocr' :
    fileCategory === 'photo' ? 'photo' : 'total';
  
  if (categoryField === 'total') {
    // その他のファイル
    await db
      .prepare(`
        UPDATE user_storage_quotas
        SET total_files = total_files + 1,
            total_size_bytes = total_size_bytes + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `)
      .bind(fileSize, userId)
      .run();
  } else {
    // OCRまたは写真
    await db
      .prepare(`
        UPDATE user_storage_quotas
        SET total_files = total_files + 1,
            total_size_bytes = total_size_bytes + ?,
            ${categoryField}_files = ${categoryField}_files + 1,
            ${categoryField}_size_bytes = ${categoryField}_size_bytes + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `)
      .bind(fileSize, fileSize, userId)
      .run();
  }
}

/**
 * ファイル削除時にクォータを更新
 */
export async function updateStorageQuotaOnDelete(
  db: D1Database,
  userId: string,
  fileSize: number,
  fileCategory: 'ocr_document' | 'photo' | 'other'
): Promise<void> {
  const categoryField = 
    fileCategory === 'ocr_document' ? 'ocr' :
    fileCategory === 'photo' ? 'photo' : 'total';
  
  if (categoryField === 'total') {
    await db
      .prepare(`
        UPDATE user_storage_quotas
        SET total_files = GREATEST(0, total_files - 1),
            total_size_bytes = GREATEST(0, total_size_bytes - ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `)
      .bind(fileSize, userId)
      .run();
  } else {
    await db
      .prepare(`
        UPDATE user_storage_quotas
        SET total_files = GREATEST(0, total_files - 1),
            total_size_bytes = GREATEST(0, total_size_bytes - ?),
            ${categoryField}_files = GREATEST(0, ${categoryField}_files - 1),
            ${categoryField}_size_bytes = GREATEST(0, ${categoryField}_size_bytes - ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `)
      .bind(fileSize, fileSize, userId)
      .run();
  }
}

/**
 * Cloudflare無料プランの制限
 */
export const STORAGE_LIMITS = {
  // R2 無料プラン: 10GB/月
  R2_FREE_TIER_BYTES: 10 * 1024 * 1024 * 1024, // 10GB
  R2_FREE_TIER_MB: 10 * 1024,
  
  // ユーザー別デフォルト制限: 500MB
  USER_DEFAULT_QUOTA_BYTES: 500 * 1024 * 1024, // 500MB
  USER_DEFAULT_QUOTA_MB: 500,
  
  // 推定最大ユーザー数: 10GB / 500MB = 20ユーザー
  ESTIMATED_MAX_USERS: 20,
  
  // ファイルサイズ制限
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_FILE_SIZE_MB: 10
} as const;
