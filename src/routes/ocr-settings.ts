import { Hono } from 'hono';
import type { Bindings } from '../types';
import { authMiddleware } from '../utils/auth';

const ocrSettings = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
ocrSettings.use('*', authMiddleware);

/**
 * OCR設定を取得
 * GET /api/ocr-settings
 */
ocrSettings.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    // ユーザーの設定を取得
    const result = await c.env.DB.prepare(`
      SELECT 
        id,
        user_id,
        auto_save_history,
        default_confidence_threshold,
        enable_batch_processing,
        max_batch_size,
        created_at,
        updated_at
      FROM ocr_settings
      WHERE user_id = ?
    `).bind(user.id).first();

    // 設定が存在しない場合はデフォルト値を返す
    if (!result) {
      return c.json({
        success: true,
        settings: {
          auto_save_history: 1,
          default_confidence_threshold: 0.7,
          enable_batch_processing: 1,
          max_batch_size: 20,
          is_default: true
        }
      });
    }

    return c.json({
      success: true,
      settings: {
        ...result,
        is_default: false
      }
    });

  } catch (error) {
    console.error('OCR settings fetch error:', error);
    return c.json({
      error: 'OCR設定の取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * OCR設定を更新（存在しない場合は作成）
 * PUT /api/ocr-settings
 */
ocrSettings.put('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const body = await c.req.json();
    const {
      auto_save_history,
      default_confidence_threshold,
      enable_batch_processing,
      max_batch_size
    } = body;

    // バリデーション
    if (default_confidence_threshold !== undefined) {
      if (typeof default_confidence_threshold !== 'number' || 
          default_confidence_threshold < 0 || 
          default_confidence_threshold > 1) {
        return c.json({
          error: 'default_confidence_thresholdは0.0〜1.0の範囲で指定してください'
        }, 400);
      }
    }

    if (max_batch_size !== undefined) {
      if (typeof max_batch_size !== 'number' || 
          max_batch_size < 1 || 
          max_batch_size > 50) {
        return c.json({
          error: 'max_batch_sizeは1〜50の範囲で指定してください'
        }, 400);
      }
    }

    // 既存の設定を確認
    const existing = await c.env.DB.prepare(`
      SELECT id FROM ocr_settings WHERE user_id = ?
    `).bind(user.id).first();

    if (existing) {
      // 更新
      await c.env.DB.prepare(`
        UPDATE ocr_settings
        SET 
          auto_save_history = COALESCE(?, auto_save_history),
          default_confidence_threshold = COALESCE(?, default_confidence_threshold),
          enable_batch_processing = COALESCE(?, enable_batch_processing),
          max_batch_size = COALESCE(?, max_batch_size),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        auto_save_history !== undefined ? auto_save_history : null,
        default_confidence_threshold !== undefined ? default_confidence_threshold : null,
        enable_batch_processing !== undefined ? enable_batch_processing : null,
        max_batch_size !== undefined ? max_batch_size : null,
        user.id
      ).run();

      return c.json({
        success: true,
        message: 'OCR設定を更新しました'
      });
    } else {
      // 新規作成
      await c.env.DB.prepare(`
        INSERT INTO ocr_settings (
          user_id,
          auto_save_history,
          default_confidence_threshold,
          enable_batch_processing,
          max_batch_size
        )
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        user.id,
        auto_save_history !== undefined ? auto_save_history : 1,
        default_confidence_threshold !== undefined ? default_confidence_threshold : 0.7,
        enable_batch_processing !== undefined ? enable_batch_processing : 1,
        max_batch_size !== undefined ? max_batch_size : 20
      ).run();

      return c.json({
        success: true,
        message: 'OCR設定を作成しました'
      });
    }

  } catch (error) {
    console.error('OCR settings update error:', error);
    return c.json({
      error: 'OCR設定の更新に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * OCR設定をリセット（デフォルト値に戻す）
 * DELETE /api/ocr-settings
 */
ocrSettings.delete('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    await c.env.DB.prepare(`
      DELETE FROM ocr_settings WHERE user_id = ?
    `).bind(user.id).run();

    return c.json({
      success: true,
      message: 'OCR設定をデフォルトに戻しました'
    });

  } catch (error) {
    console.error('OCR settings reset error:', error);
    return c.json({
      error: 'OCR設定のリセットに失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default ocrSettings;
