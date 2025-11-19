import { Hono } from 'hono';
import type { Bindings } from '../types';

const propertyTemplates = new Hono<{ Bindings: Bindings }>();

/**
 * テンプレートを作成
 * POST /api/property-templates
 */
propertyTemplates.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const body = await c.req.json();
    const {
      template_name,
      template_type,
      template_data,
      is_shared
    } = body;

    if (!template_name || !template_type || !template_data) {
      return c.json({
        error: 'template_name, template_type, template_dataが必要です'
      }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO property_templates (
        user_id,
        template_name,
        template_type,
        template_data,
        is_shared
      )
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      user.id,
      template_name,
      template_type,
      JSON.stringify(template_data),
      is_shared || 0
    ).run();

    return c.json({
      success: true,
      template_id: result.meta.last_row_id,
      message: 'テンプレートを作成しました'
    });

  } catch (error) {
    console.error('Template creation error:', error);
    return c.json({
      error: 'テンプレートの作成に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * テンプレート一覧を取得
 * GET /api/property-templates
 */
propertyTemplates.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const type = c.req.query('type');
    let query = `
      SELECT 
        id,
        template_name,
        template_type,
        template_data,
        is_shared,
        use_count,
        created_at,
        updated_at
      FROM property_templates
      WHERE (user_id = ? OR is_shared = 1)
    `;
    
    const params: any[] = [user.id];

    if (type) {
      query += ` AND template_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY use_count DESC, created_at DESC`;

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    const templates = results.map((row: any) => ({
      ...row,
      template_data: JSON.parse(row.template_data)
    }));

    return c.json({
      success: true,
      templates,
      count: templates.length
    });

  } catch (error) {
    console.error('Template fetch error:', error);
    return c.json({
      error: 'テンプレートの取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * テンプレート詳細を取得
 * GET /api/property-templates/:id
 */
propertyTemplates.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
      SELECT 
        id,
        template_name,
        template_type,
        template_data,
        is_shared,
        use_count,
        created_at,
        updated_at
      FROM property_templates
      WHERE id = ? AND (user_id = ? OR is_shared = 1)
    `).bind(id, user.id).first();

    if (!result) {
      return c.json({ error: 'テンプレートが見つかりません' }, 404);
    }

    const template = {
      ...result,
      template_data: JSON.parse(result.template_data as string)
    };

    return c.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Template fetch error:', error);
    return c.json({
      error: 'テンプレートの取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * テンプレート使用回数を更新
 * POST /api/property-templates/:id/use
 */
propertyTemplates.post('/:id/use', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const id = c.req.param('id');

    await c.env.DB.prepare(`
      UPDATE property_templates
      SET use_count = use_count + 1
      WHERE id = ? AND (user_id = ? OR is_shared = 1)
    `).bind(id, user.id).run();

    return c.json({
      success: true,
      message: '使用回数を更新しました'
    });

  } catch (error) {
    console.error('Template use update error:', error);
    return c.json({
      error: '使用回数の更新に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * テンプレートを更新
 * PUT /api/property-templates/:id
 */
propertyTemplates.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    const {
      template_name,
      template_type,
      template_data,
      is_shared
    } = body;

    const result = await c.env.DB.prepare(`
      UPDATE property_templates
      SET 
        template_name = COALESCE(?, template_name),
        template_type = COALESCE(?, template_type),
        template_data = COALESCE(?, template_data),
        is_shared = COALESCE(?, is_shared),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(
      template_name || null,
      template_type || null,
      template_data ? JSON.stringify(template_data) : null,
      is_shared !== undefined ? is_shared : null,
      id,
      user.id
    ).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'テンプレートが見つかりません' }, 404);
    }

    return c.json({
      success: true,
      message: 'テンプレートを更新しました'
    });

  } catch (error) {
    console.error('Template update error:', error);
    return c.json({
      error: 'テンプレートの更新に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * テンプレートを削除
 * DELETE /api/property-templates/:id
 */
propertyTemplates.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
      DELETE FROM property_templates
      WHERE id = ? AND user_id = ?
    `).bind(id, user.id).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'テンプレートが見つかりません' }, 404);
    }

    return c.json({
      success: true,
      message: 'テンプレートを削除しました'
    });

  } catch (error) {
    console.error('Template delete error:', error);
    return c.json({
      error: 'テンプレートの削除に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default propertyTemplates;
