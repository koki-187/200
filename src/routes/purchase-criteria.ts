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

/**
 * POST /api/purchase-criteria/special-case
 * 特別案件申請（クライテリア非該当時）
 */
app.post('/special-case', async (c) => {
  try {
    const { DB } = c.env;
    const { deal_id, reason } = await c.req.json();
    
    if (!deal_id || !reason) {
      return c.json({
        success: false,
        error: '案件IDと理由は必須です'
      }, 400);
    }
    
    // 案件の存在確認
    const deal = await DB
      .prepare('SELECT id, title FROM deals WHERE id = ?')
      .bind(deal_id)
      .first();
    
    if (!deal) {
      return c.json({
        success: false,
        error: '案件が見つかりません'
      }, 404);
    }
    
    // 特別案件フラグと理由を設定
    await DB
      .prepare(`
        UPDATE deals 
        SET is_special_case = 1,
            special_case_reason = ?,
            special_case_status = 'PENDING',
            updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(reason, deal_id)
      .run();
    
    return c.json({
      success: true,
      message: '特別案件として申請しました。管理者の承認をお待ちください。'
    });
  } catch (error) {
    console.error('特別案件申請エラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '特別案件申請に失敗しました'
    }, 500);
  }
});

/**
 * PUT /api/purchase-criteria/special-case/:dealId/review
 * 特別案件の承認/却下（管理者のみ）
 */
app.put('/special-case/:dealId/review', async (c) => {
  try {
    const { DB } = c.env;
    const dealId = c.req.param('dealId');
    const { status, reviewer_id } = await c.req.json();
    
    if (!status || !reviewer_id) {
      return c.json({
        success: false,
        error: 'ステータスとレビュアーIDは必須です'
      }, 400);
    }
    
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return c.json({
        success: false,
        error: '有効なステータスを指定してください（APPROVED, REJECTED）'
      }, 400);
    }
    
    // 案件の存在確認
    const deal = await DB
      .prepare('SELECT id, title, is_special_case FROM deals WHERE id = ?')
      .bind(dealId)
      .first();
    
    if (!deal) {
      return c.json({
        success: false,
        error: '案件が見つかりません'
      }, 404);
    }
    
    if (!deal.is_special_case) {
      return c.json({
        success: false,
        error: 'この案件は特別案件ではありません'
      }, 400);
    }
    
    // 特別案件ステータスを更新
    await DB
      .prepare(`
        UPDATE deals 
        SET special_case_status = ?,
            special_case_reviewed_by = ?,
            special_case_reviewed_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(status, reviewer_id, dealId)
      .run();
    
    return c.json({
      success: true,
      message: status === 'APPROVED' ? '特別案件を承認しました' : '特別案件を却下しました'
    });
  } catch (error) {
    console.error('特別案件レビューエラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '特別案件レビューに失敗しました'
    }, 500);
  }
});

/**
 * GET /api/purchase-criteria/special-cases
 * 特別案件一覧取得（管理者用）
 */
app.get('/special-cases', async (c) => {
  try {
    const { DB } = c.env;
    const status = c.req.query('status') || 'PENDING';
    
    let query = `
      SELECT d.*, u.name as seller_name 
      FROM deals d
      LEFT JOIN users u ON d.seller_id = u.id
      WHERE d.is_special_case = 1
    `;
    
    const params: any[] = [];
    
    if (status && status !== 'ALL') {
      query += ' AND d.special_case_status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const result = await DB.prepare(query).bind(...params).all();
    
    return c.json({
      success: true,
      data: result.results || [],
      total: result.results?.length || 0
    });
  } catch (error) {
    console.error('特別案件一覧取得エラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '特別案件一覧の取得に失敗しました'
    }, 500);
  }
});

export default app;
