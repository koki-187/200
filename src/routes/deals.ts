import { Hono } from 'hono';
import { Bindings, Deal } from '../types';
import { Database } from '../db/queries';
import { authMiddleware, adminOnly } from '../utils/auth';
import { calculate48HourDeadline } from '../utils/businessTime';
import { nanoid } from 'nanoid';
import { createEmailService } from '../utils/email';
import { validateData, dealSchema, dealUpdateSchema } from '../utils/validation';

const deals = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
deals.use('*', authMiddleware);

// 案件一覧取得（ページネーション対応）
deals.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    
    // ページネーションパラメータ取得
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    
    // ステータスフィルター
    const status = c.req.query('status');
    
    const db = new Database(c.env.DB);
    
    // フィルタリング付きクエリ
    let query = `
      SELECT * FROM deals
      WHERE ${role === 'ADMIN' ? '1=1' : 'seller_id = ?'}
    `;
    const params: any[] = role === 'ADMIN' ? [] : [userId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    // 合計件数を取得
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const totalCount = countResult?.total || 0;
    
    // ページネーション付きでデータ取得
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    const dealsList = result.results || [];
    
    return c.json({
      deals: dealsList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get deals error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 案件詳細取得
deals.get('/:id', async (c) => {
  try {
    const dealId = c.req.param('id');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';

    const db = new Database(c.env.DB);
    const deal = await db.getDealById(dealId);

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    // 権限チェック
    if (role === 'AGENT' && deal.seller_id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json({ deal });
  } catch (error) {
    console.error('Get deal error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 案件作成（管理者のみ）
deals.post('/', adminOnly, async (c) => {
  try {
    const body = await c.req.json();
    const userId = c.get('userId') as string;

    // Zodバリデーション
    const validation = validateData(dealSchema, body);
    if (!validation.success) {
      return c.json({ error: 'Validation failed', details: validation.errors }, 400);
    }

    const db = new Database(c.env.DB);
    const settings = await db.getSettings();
    const holidays = settings ? JSON.parse(settings.holidays) : [];

    // 営業日48h期限を計算
    const deadline = calculate48HourDeadline(new Date(), holidays);

    const newDeal: Omit<Deal, 'created_at' | 'updated_at'> = {
      id: nanoid(),
      title: body.title,
      status: 'NEW',
      buyer_id: userId,
      seller_id: body.seller_id,
      location: body.location,
      station: body.station,
      walk_minutes: body.walk_minutes,
      land_area: body.land_area,
      zoning: body.zoning,
      building_coverage: body.building_coverage,
      floor_area_ratio: body.floor_area_ratio,
      height_district: body.height_district,
      fire_zone: body.fire_zone,
      road_info: body.road_info,
      frontage: body.frontage,
      building_area: body.building_area,
      structure: body.structure,
      built_year: body.built_year,
      yield_rate: body.yield_rate,
      occupancy_status: body.occupancy_status,
      current_status: body.current_status,
      desired_price: body.desired_price,
      remarks: body.remarks,
      missing_fields: JSON.stringify([]),
      reply_deadline: deadline.toISOString()
    };

    await db.createDeal(newDeal);

    // 新規案件通知メール送信（エージェントへ）
    try {
      const resendApiKey = c.env.RESEND_API_KEY;
      if (resendApiKey) {
        const seller = await db.getUserById(body.seller_id);
        if (seller?.email) {
          const emailService = createEmailService(resendApiKey);
          await emailService.sendNewDealNotification(
            seller.email,
            newDeal.title,
            {
              location: newDeal.location,
              station: newDeal.station,
              deadline: newDeal.reply_deadline
            }
          );
          console.log(`New deal notification sent to ${seller.email}`);
        }
      }
    } catch (emailError) {
      // メール送信失敗してもエラーレスポンスは返さない（ログのみ）
      console.error('Failed to send new deal notification email:', emailError);
    }

    return c.json({ deal: newDeal }, 201);
  } catch (error) {
    console.error('Create deal error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 案件更新
deals.put('/:id', async (c) => {
  try {
    const dealId = c.req.param('id');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    const body = await c.req.json();

    // Zodバリデーション
    const validation = validateData(dealUpdateSchema, { ...body, id: dealId });
    if (!validation.success) {
      return c.json({ error: 'Validation failed', details: validation.errors }, 400);
    }

    const db = new Database(c.env.DB);
    const deal = await db.getDealById(dealId);

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    // 権限チェック
    if (role === 'AGENT' && deal.seller_id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    await db.updateDeal(dealId, body);

    const updatedDeal = await db.getDealById(dealId);
    return c.json({ deal: updatedDeal });
  } catch (error) {
    console.error('Update deal error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 案件削除（管理者のみ）
deals.delete('/:id', adminOnly, async (c) => {
  try {
    const dealId = c.req.param('id');
    const db = new Database(c.env.DB);

    await db.deleteDeal(dealId);

    return c.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Delete deal error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default deals;
