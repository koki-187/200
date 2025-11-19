import { Hono } from 'hono';
import type { Bindings } from '../types';

const ocrHistory = new Hono<{ Bindings: Bindings }>();

/**
 * OCR履歴を保存
 * POST /api/ocr-history
 */
ocrHistory.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const body = await c.req.json();
    const {
      file_names,
      extracted_data,
      confidence_score,
      processing_time_ms,
      is_edited
    } = body;

    if (!file_names || !extracted_data) {
      return c.json({ error: 'file_namesとextracted_dataが必要です' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO ocr_history (
        user_id, 
        file_names, 
        extracted_data, 
        confidence_score, 
        processing_time_ms, 
        is_edited
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      JSON.stringify(file_names),
      JSON.stringify(extracted_data),
      confidence_score || null,
      processing_time_ms || null,
      is_edited || 0
    ).run();

    return c.json({
      success: true,
      history_id: result.meta.last_row_id,
      message: 'OCR履歴を保存しました'
    });

  } catch (error) {
    console.error('OCR history save error:', error);
    return c.json({
      error: 'OCR履歴の保存に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * OCR履歴一覧を取得
 * GET /api/ocr-history
 */
ocrHistory.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const { results } = await c.env.DB.prepare(`
      SELECT 
        id,
        file_names,
        extracted_data,
        confidence_score,
        processing_time_ms,
        is_edited,
        created_at
      FROM ocr_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.id, limit, offset).all();

    // JSON文字列をパース
    const histories = results.map((row: any) => ({
      ...row,
      file_names: JSON.parse(row.file_names),
      extracted_data: JSON.parse(row.extracted_data)
    }));

    return c.json({
      success: true,
      histories,
      count: histories.length
    });

  } catch (error) {
    console.error('OCR history fetch error:', error);
    return c.json({
      error: 'OCR履歴の取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * OCR履歴詳細を取得
 * GET /api/ocr-history/:id
 */
ocrHistory.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
      SELECT 
        id,
        file_names,
        extracted_data,
        confidence_score,
        processing_time_ms,
        is_edited,
        created_at
      FROM ocr_history
      WHERE id = ? AND user_id = ?
    `).bind(id, user.id).first();

    if (!result) {
      return c.json({ error: 'OCR履歴が見つかりません' }, 404);
    }

    const history = {
      ...result,
      file_names: JSON.parse(result.file_names as string),
      extracted_data: JSON.parse(result.extracted_data as string)
    };

    return c.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('OCR history fetch error:', error);
    return c.json({
      error: 'OCR履歴の取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * OCR履歴を削除
 * DELETE /api/ocr-history/:id
 */
ocrHistory.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
      DELETE FROM ocr_history
      WHERE id = ? AND user_id = ?
    `).bind(id, user.id).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'OCR履歴が見つかりません' }, 404);
    }

    return c.json({
      success: true,
      message: 'OCR履歴を削除しました'
    });

  } catch (error) {
    console.error('OCR history delete error:', error);
    return c.json({
      error: 'OCR履歴の削除に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default ocrHistory;
