import { Hono } from 'hono';
import { Bindings } from '../types';
import { verifyToken } from '../utils/crypto';
import {
  getUserStorageQuota,
  initializeUserStorageQuota,
  calculateStorageUsage,
  STORAGE_LIMITS
} from '../utils/storage-quota';

const storageQuota = new Hono<{ Bindings: Bindings }>();

/**
 * ユーザーのストレージ使用状況を取得
 * GET /api/storage-quota
 */
storageQuota.get('/', async (c) => {
  try {
    // 認証
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const token = authHeader.substring(7);
    const { JWT_SECRET, DB } = c.env;
    
    let userId: string;
    try {
      const payload = await verifyToken(token, JWT_SECRET);
      if (!payload || !payload.userId) {
        return c.json({ error: '無効なトークンです' }, 401);
      }
      userId = payload.userId;
    } catch (err) {
      return c.json({ error: 'トークン検証に失敗しました' }, 401);
    }

    // クォータ取得
    let quota = await getUserStorageQuota(DB, userId);
    
    // クォータが存在しない場合は初期化
    if (!quota) {
      await initializeUserStorageQuota(DB, userId);
      quota = await getUserStorageQuota(DB, userId);
    }
    
    if (!quota) {
      return c.json({ error: 'ストレージクォータの取得に失敗しました' }, 500);
    }

    // 使用状況を計算
    const usage = calculateStorageUsage(quota);

    return c.json({
      success: true,
      quota: {
        user_id: quota.user_id,
        total_files: quota.total_files,
        ocr_files: quota.ocr_files,
        photo_files: quota.photo_files,
        usage: usage,
        limits: {
          r2_total: {
            bytes: STORAGE_LIMITS.R2_FREE_TIER_BYTES,
            mb: STORAGE_LIMITS.R2_FREE_TIER_MB
          },
          user_default: {
            bytes: STORAGE_LIMITS.USER_DEFAULT_QUOTA_BYTES,
            mb: STORAGE_LIMITS.USER_DEFAULT_QUOTA_MB
          },
          max_file_size: {
            bytes: STORAGE_LIMITS.MAX_FILE_SIZE_BYTES,
            mb: STORAGE_LIMITS.MAX_FILE_SIZE_MB
          }
        },
        updated_at: quota.updated_at
      }
    });

  } catch (error) {
    console.error('Storage quota get error:', error);
    return c.json({
      error: 'ストレージクォータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * ファイル別の使用状況統計を取得
 * GET /api/storage-quota/stats
 */
storageQuota.get('/stats', async (c) => {
  try {
    // 認証
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const token = authHeader.substring(7);
    const { JWT_SECRET, DB } = c.env;
    
    let userId: string;
    try {
      const payload = await verifyToken(token, JWT_SECRET);
      if (!payload || !payload.userId) {
        return c.json({ error: '無効なトークンです' }, 401);
      }
      userId = payload.userId;
    } catch (err) {
      return c.json({ error: 'トークン検証に失敗しました' }, 401);
    }

    // ファイルカテゴリー別の統計
    const stats = await DB.prepare(`
      SELECT 
        file_category,
        COUNT(*) as file_count,
        SUM(file_size) as total_size,
        AVG(file_size) as avg_size,
        MIN(file_size) as min_size,
        MAX(file_size) as max_size
      FROM uploaded_files_metadata
      WHERE user_id = ? AND is_deleted = 0
      GROUP BY file_category
    `).bind(userId).all();

    return c.json({
      success: true,
      stats: stats.results.map(row => ({
        category: row.file_category,
        file_count: row.file_count,
        total_size_bytes: row.total_size,
        total_size_mb: Math.round((row.total_size / 1024 / 1024) * 100) / 100,
        avg_size_bytes: row.avg_size,
        avg_size_mb: Math.round((row.avg_size / 1024 / 1024) * 100) / 100,
        min_size_bytes: row.min_size,
        max_size_bytes: row.max_size
      }))
    });

  } catch (error) {
    console.error('Storage stats get error:', error);
    return c.json({
      error: '統計情報の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default storageQuota;
