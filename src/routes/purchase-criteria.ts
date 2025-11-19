import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { checkPurchaseCriteria, savePurchaseCheckResult } from '../utils/purchaseCriteria';
import type { DealData, PurchaseCriteria } from '../utils/purchaseCriteria';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/purchase-criteria
 * 買取条件マスタ一覧取得
 */
app.get('/', async (c) => {
  try {
    const { DB } = c.env;
    
    const result = await DB
      .prepare('SELECT * FROM purchase_criteria WHERE is_active = 1 ORDER BY criteria_type, priority, id')
      .all<PurchaseCriteria>();
    
    // criteria_typeごとにグループ化
    const criteria = result.results || [];
    const grouped = {
      target_areas: criteria.filter(c => c.criteria_type === 'TARGET_AREA'),
      excluded_areas: criteria.filter(c => c.criteria_type === 'EXCLUDED_AREA'),
      conditions: criteria.filter(c => c.criteria_type === 'CONDITION')
    };
    
    return c.json({
      success: true,
      data: grouped,
      total: criteria.length
    });
  } catch (error) {
    console.error('買取条件取得エラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '買取条件の取得に失敗しました'
    }, 500);
  }
});

/**
 * POST /api/purchase-criteria/check
 * 案件の買取条件チェック実行
 */
app.post('/check', async (c) => {
  try {
    const { DB } = c.env;
    const dealData: DealData = await c.req.json();
    
    if (!dealData.id || !dealData.location) {
      return c.json({
        success: false,
        error: '案件IDと所在地は必須です'
      }, 400);
    }
    
    // 買取条件チェック実行
    const checkResult = await checkPurchaseCriteria(DB, dealData);
    
    // dealが実在する場合のみDB保存
    const dealExists = await DB
      .prepare('SELECT id FROM deals WHERE id = ?')
      .bind(dealData.id)
      .first();
    
    if (dealExists) {
      await savePurchaseCheckResult(DB, dealData.id, checkResult);
    }
    
    return c.json({
      success: true,
      data: checkResult,
      saved_to_db: !!dealExists
    });
  } catch (error) {
    console.error('買取条件チェックエラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '買取条件チェックに失敗しました'
    }, 500);
  }
});

/**
 * GET /api/purchase-criteria/check/:dealId
 * 案件の買取条件チェック結果取得
 */
app.get('/check/:dealId', async (c) => {
  try {
    const { DB } = c.env;
    const dealId = c.req.param('dealId');
    
    const result = await DB
      .prepare(`
        SELECT * FROM deal_purchase_check 
        WHERE deal_id = ? 
        ORDER BY checked_at DESC 
        LIMIT 1
      `)
      .bind(dealId)
      .first();
    
    if (!result) {
      return c.json({
        success: false,
        error: 'チェック結果が見つかりません'
      }, 404);
    }
    
    // JSONフィールドをパース
    const checkResult = {
      ...result,
      passed_conditions: JSON.parse(result.passed_conditions as string),
      failed_conditions: JSON.parse(result.failed_conditions as string),
      special_flags: JSON.parse(result.special_flags as string),
      recommendations: JSON.parse(result.recommendations as string)
    };
    
    return c.json({
      success: true,
      data: checkResult
    });
  } catch (error) {
    console.error('チェック結果取得エラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'チェック結果の取得に失敗しました'
    }, 500);
  }
});

export default app;
