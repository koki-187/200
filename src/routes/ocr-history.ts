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
 * OCR履歴一覧を取得（検索・フィルター・ソート・ページネーション対応）
 * GET /api/ocr-history?search=物件名&minConfidence=0.7&maxConfidence=1.0&limit=20&offset=0&sortBy=date_desc&dateFrom=2025-01-01&dateTo=2025-12-31
 */
ocrHistory.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const search = c.req.query('search') || '';
    const minConfidence = parseFloat(c.req.query('minConfidence') || '0');
    const maxConfidence = parseFloat(c.req.query('maxConfidence') || '1');
    const sortBy = c.req.query('sortBy') || 'date_desc';
    const dateFrom = c.req.query('dateFrom') || '';
    const dateTo = c.req.query('dateTo') || '';

    // 動的なWHERE句を構築
    let whereConditions = ['user_id = ?'];
    const params: any[] = [user.id];

    if (minConfidence > 0 || maxConfidence < 1) {
      whereConditions.push('confidence_score >= ? AND confidence_score <= ?');
      params.push(minConfidence, maxConfidence);
    }

    // 日付範囲フィルター
    if (dateFrom) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(dateTo);
    }

    const whereClause = whereConditions.join(' AND ');

    // ソート条件を決定
    let orderBy = 'created_at DESC';
    switch (sortBy) {
      case 'date_asc':
        orderBy = 'created_at ASC';
        break;
      case 'date_desc':
        orderBy = 'created_at DESC';
        break;
      case 'confidence_asc':
        orderBy = 'confidence_score ASC';
        break;
      case 'confidence_desc':
        orderBy = 'confidence_score DESC';
        break;
    }

    // 総件数を取得（ページネーション用）
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM ocr_history
      WHERE ${whereClause}
    `).bind(...params).first();

    const totalCount = countResult?.total || 0;

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
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    // JSON文字列をパースし、検索フィルターを適用
    let histories = results.map((row: any) => ({
      ...row,
      file_names: JSON.parse(row.file_names),
      extracted_data: JSON.parse(row.extracted_data)
    }));

    // 検索フィルター（物件名・所在地検索）
    let filteredHistories = histories;
    if (search) {
      filteredHistories = histories.filter((h: any) => {
        const data = h.extracted_data;
        const propertyName = data.property_name?.value || data.property_name || '';
        const location = data.location?.value || data.location || '';
        return propertyName.includes(search) || location.includes(search);
      });
    }

    return c.json({
      success: true,
      histories: filteredHistories,
      total: totalCount,
      count: filteredHistories.length,
      filters: {
        search,
        minConfidence,
        maxConfidence,
        sortBy,
        dateFrom,
        dateTo
      }
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
