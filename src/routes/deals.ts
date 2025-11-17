import { Hono } from 'hono';
import { Bindings, Deal } from '../types';
import { Database } from '../db/queries';
import { authMiddleware, adminOnly } from '../utils/auth';
import { calculate48HourDeadline } from '../utils/businessTime';
import { nanoid } from 'nanoid';

const deals = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
deals.use('*', authMiddleware);

// 案件一覧取得
deals.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    
    const db = new Database(c.env.DB);
    const dealsList = await db.getDeals(userId, role);

    return c.json({ deals: dealsList });
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
      current_status: body.current_status,
      desired_price: body.desired_price,
      remarks: body.remarks,
      missing_fields: JSON.stringify([]),
      reply_deadline: deadline.toISOString()
    };

    await db.createDeal(newDeal);

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
