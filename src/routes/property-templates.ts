import { Hono } from 'hono';
import type { Database } from '../types';
import { authMiddleware } from '../utils/auth';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 認証ミドルウェアを全ルートに適用
app.use('*', authMiddleware);

// プリセットテンプレート定義（土地仕入れ業務特化）
const PRESET_TEMPLATES = {
  residential_land: {
    name: '住宅用地（標準）',
    type: 'residential_land',
    description: '一般的な住宅用地の標準設定',
    data: {
      zoning: '第一種低層住居専用地域',
      building_coverage_ratio: 60,
      floor_area_ratio: 200,
      front_road_width: 6,
      estimated_units: 1,
      land_shape: '整形地',
      topography: '平坦',
      utility_status: '上下水道・都市ガス完備',
    }
  },
  apartment_land: {
    name: 'マンション用地（200棟向け）',
    type: 'apartment_land',
    description: '200棟マンション用地の推奨設定',
    data: {
      zoning: '第二種住居地域',
      building_coverage_ratio: 60,
      floor_area_ratio: 300,
      front_road_width: 8,
      estimated_units: 200,
      land_shape: '整形地',
      topography: '平坦',
      utility_status: '上下水道・都市ガス完備',
      parking_requirement: '駐車場100%',
    }
  },
  commercial_land: {
    name: '商業用地',
    type: 'commercial_land',
    description: '商業施設向けの土地設定',
    data: {
      zoning: '商業地域',
      building_coverage_ratio: 80,
      floor_area_ratio: 400,
      front_road_width: 10,
      estimated_units: 1,
      land_shape: '整形地',
      topography: '平坦',
      utility_status: '上下水道・都市ガス完備',
    }
  },
  investment_land: {
    name: '投資用地（高利回り）',
    type: 'investment_land',
    description: '投資目的の土地向け設定',
    data: {
      zoning: '準住居地域',
      building_coverage_ratio: 70,
      floor_area_ratio: 250,
      front_road_width: 6,
      estimated_units: 1,
      land_shape: '整形地',
      topography: '平坦',
      utility_status: '上下水道完備',
    }
  }
};

// GET /api/property-templates - テンプレート一覧取得
app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const db: Database = {
      prepare: (query: string) => c.env.DB.prepare(query),
    };

    // プリセットテンプレートを取得
    const presets = Object.entries(PRESET_TEMPLATES).map(([key, value]) => ({
      id: `preset_${key}`,
      template_name: value.name,
      template_type: value.type,
      template_data: JSON.stringify(value.data),
      description: value.description,
      is_shared: 1,
      is_preset: true,
      use_count: 0,
      created_at: new Date().toISOString(),
    }));

    // ユーザーのカスタムテンプレートを取得
    const userTemplates = await db.prepare(`
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
      WHERE user_id = ? OR is_shared = 1
      ORDER BY use_count DESC, created_at DESC
    `).bind(userId).all();

    const customTemplates = (userTemplates.results || []).map((t: any) => ({
      ...t,
      is_preset: false,
      description: `カスタムテンプレート（${t.is_shared ? '共有' : '個人'}）`,
    }));

    // プリセット + カスタムテンプレートを返却
    return c.json({
      success: true,
      templates: [...presets, ...customTemplates],
      presetCount: presets.length,
      customCount: customTemplates.length,
    });
  } catch (error: any) {
    console.error('テンプレート一覧取得エラー:', error);
    return c.json({ 
      error: 'テンプレート一覧の取得に失敗しました',
      details: error.message 
    }, 500);
  }
});

// GET /api/property-templates/presets - プリセット一覧のみ取得
app.get('/presets', async (c) => {
  try {
    const presets = Object.entries(PRESET_TEMPLATES).map(([key, value]) => ({
      id: `preset_${key}`,
      key: key,
      template_name: value.name,
      template_type: value.type,
      template_data: value.data,
      description: value.description,
      is_preset: true,
    }));

    return c.json({
      success: true,
      presets: presets,
      count: presets.length,
    });
  } catch (error: any) {
    console.error('プリセット取得エラー:', error);
    return c.json({ 
      error: 'プリセット一覧の取得に失敗しました',
      details: error.message 
    }, 500);
  }
});

// GET /api/property-templates/:id - テンプレート詳細取得
app.get('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const templateId = c.req.param('id');

    // プリセットテンプレートの場合
    if (templateId.startsWith('preset_')) {
      const presetKey = templateId.replace('preset_', '');
      const preset = PRESET_TEMPLATES[presetKey as keyof typeof PRESET_TEMPLATES];
      
      if (!preset) {
        return c.json({ error: 'テンプレートが見つかりません' }, 404);
      }

      return c.json({
        success: true,
        template: {
          id: templateId,
          template_name: preset.name,
          template_type: preset.type,
          template_data: preset.data,
          description: preset.description,
          is_preset: true,
        }
      });
    }

    // カスタムテンプレートの場合
    const db: Database = {
      prepare: (query: string) => c.env.DB.prepare(query),
    };

    const result = await db.prepare(`
      SELECT * FROM property_templates
      WHERE id = ? AND (user_id = ? OR is_shared = 1)
    `).bind(templateId, userId).first();

    if (!result) {
      return c.json({ error: 'テンプレートが見つかりません' }, 404);
    }

    return c.json({
      success: true,
      template: {
        ...result,
        template_data: JSON.parse(result.template_data as string),
        is_preset: false,
      }
    });
  } catch (error: any) {
    console.error('テンプレート詳細取得エラー:', error);
    return c.json({ 
      error: 'テンプレート詳細の取得に失敗しました',
      details: error.message 
    }, 500);
  }
});

// POST /api/property-templates - カスタムテンプレート作成
app.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const body = await c.req.json();
    const { template_name, template_type, template_data, is_shared } = body;

    // バリデーション
    if (!template_name || !template_type || !template_data) {
      return c.json({ 
        error: 'テンプレート名、タイプ、データは必須です' 
      }, 400);
    }

    const db: Database = {
      prepare: (query: string) => c.env.DB.prepare(query),
    };

    // テンプレートを作成
    const result = await db.prepare(`
      INSERT INTO property_templates 
      (user_id, template_name, template_type, template_data, is_shared, use_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `).bind(
      userId,
      template_name,
      template_type,
      typeof template_data === 'string' ? template_data : JSON.stringify(template_data),
      is_shared ? 1 : 0
    ).run();

    return c.json({
      success: true,
      message: 'テンプレートを作成しました',
      templateId: result.meta.last_row_id,
    }, 201);
  } catch (error: any) {
    console.error('テンプレート作成エラー:', error);
    return c.json({ 
      error: 'テンプレートの作成に失敗しました',
      details: error.message 
    }, 500);
  }
});

// PUT /api/property-templates/:id - カスタムテンプレート更新
app.put('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const templateId = c.req.param('id');

    // プリセットテンプレートは更新不可
    if (templateId.startsWith('preset_')) {
      return c.json({ 
        error: 'プリセットテンプレートは更新できません' 
      }, 400);
    }

    const body = await c.req.json();
    const { template_name, template_type, template_data, is_shared } = body;

    const db: Database = {
      prepare: (query: string) => c.env.DB.prepare(query),
    };

    // 所有者確認
    const existing = await db.prepare(`
      SELECT user_id FROM property_templates WHERE id = ?
    `).bind(templateId).first();

    if (!existing) {
      return c.json({ error: 'テンプレートが見つかりません' }, 404);
    }

    if (existing.user_id !== userId) {
      return c.json({ error: '権限がありません' }, 403);
    }

    // 更新
    await db.prepare(`
      UPDATE property_templates
      SET template_name = ?,
          template_type = ?,
          template_data = ?,
          is_shared = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      template_name,
      template_type,
      typeof template_data === 'string' ? template_data : JSON.stringify(template_data),
      is_shared ? 1 : 0,
      templateId
    ).run();

    return c.json({
      success: true,
      message: 'テンプレートを更新しました',
    });
  } catch (error: any) {
    console.error('テンプレート更新エラー:', error);
    return c.json({ 
      error: 'テンプレートの更新に失敗しました',
      details: error.message 
    }, 500);
  }
});

// DELETE /api/property-templates/:id - カスタムテンプレート削除
app.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const templateId = c.req.param('id');

    // プリセットテンプレートは削除不可
    if (templateId.startsWith('preset_')) {
      return c.json({ 
        error: 'プリセットテンプレートは削除できません' 
      }, 400);
    }

    const db: Database = {
      prepare: (query: string) => c.env.DB.prepare(query),
    };

    // 所有者確認
    const existing = await db.prepare(`
      SELECT user_id FROM property_templates WHERE id = ?
    `).bind(templateId).first();

    if (!existing) {
      return c.json({ error: 'テンプレートが見つかりません' }, 404);
    }

    if (existing.user_id !== userId) {
      return c.json({ error: '権限がありません' }, 403);
    }

    // 削除
    await db.prepare(`
      DELETE FROM property_templates WHERE id = ?
    `).bind(templateId).run();

    return c.json({
      success: true,
      message: 'テンプレートを削除しました',
    });
  } catch (error: any) {
    console.error('テンプレート削除エラー:', error);
    return c.json({ 
      error: 'テンプレートの削除に失敗しました',
      details: error.message 
    }, 500);
  }
});

// POST /api/property-templates/:id/use - テンプレート使用回数を増やす
app.post('/:id/use', async (c) => {
  try {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const templateId = c.req.param('id');

    // プリセットテンプレートの場合はカウント不要
    if (templateId.startsWith('preset_')) {
      return c.json({
        success: true,
        message: 'プリセットテンプレートの使用回数は記録されません',
      });
    }

    const db: Database = {
      prepare: (query: string) => c.env.DB.prepare(query),
    };

    // 使用回数を増やす
    await db.prepare(`
      UPDATE property_templates
      SET use_count = use_count + 1
      WHERE id = ?
    `).bind(templateId).run();

    return c.json({
      success: true,
      message: 'テンプレート使用回数を記録しました',
    });
  } catch (error: any) {
    console.error('テンプレート使用回数更新エラー:', error);
    return c.json({ 
      error: '使用回数の更新に失敗しました',
      details: error.message 
    }, 500);
  }
});

export default app;
