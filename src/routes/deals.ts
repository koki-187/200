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

// 案件一覧取得（拡張ソート/フィルター、ページネーション対応）
deals.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    
    // ページネーションパラメータ取得
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    
    // フィルターパラメータ取得
    const status = c.req.query('status');
    const location = c.req.query('location');
    const station = c.req.query('station');
    const minPrice = c.req.query('min_price');
    const maxPrice = c.req.query('max_price');
    const minArea = c.req.query('min_area');
    const maxArea = c.req.query('max_area');
    const zoning = c.req.query('zoning');
    const sellerId = c.req.query('seller_id');
    const buyerId = c.req.query('buyer_id');
    const search = c.req.query('search'); // タイトル、所在地、備考の全文検索
    
    // ソートパラメータ取得
    const sortBy = c.req.query('sort_by') || 'created_at';
    const sortOrder = (c.req.query('sort_order') || 'desc').toLowerCase();
    
    // 許可されたソート列
    const allowedSortColumns = [
      'created_at', 'updated_at', 'title', 'status', 
      'desired_price', 'land_area', 'location', 'reply_deadline'
    ];
    
    const orderColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    const db = new Database(c.env.DB);
    
    // フィルタリング付きクエリ
    let query = `
      SELECT * FROM deals
      WHERE ${role === 'ADMIN' ? '1=1' : 'seller_id = ?'}
    `;
    const params: any[] = role === 'ADMIN' ? [] : [userId];
    
    // ステータスフィルター
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    // 所在地フィルター（部分一致）
    if (location) {
      query += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    
    // 最寄駅フィルター（部分一致）
    if (station) {
      query += ' AND station LIKE ?';
      params.push(`%${station}%`);
    }
    
    // 価格範囲フィルター
    if (minPrice) {
      query += ' AND desired_price >= ?';
      params.push(parseInt(minPrice));
    }
    if (maxPrice) {
      query += ' AND desired_price <= ?';
      params.push(parseInt(maxPrice));
    }
    
    // 土地面積範囲フィルター
    if (minArea) {
      query += ' AND land_area >= ?';
      params.push(parseFloat(minArea));
    }
    if (maxArea) {
      query += ' AND land_area <= ?';
      params.push(parseFloat(maxArea));
    }
    
    // 用途地域フィルター（部分一致）
    if (zoning) {
      query += ' AND zoning LIKE ?';
      params.push(`%${zoning}%`);
    }
    
    // セラーIDフィルター（管理者のみ）
    if (sellerId && role === 'ADMIN') {
      query += ' AND seller_id = ?';
      params.push(sellerId);
    }
    
    // バイヤーIDフィルター（管理者のみ）
    if (buyerId && role === 'ADMIN') {
      query += ' AND buyer_id = ?';
      params.push(buyerId);
    }
    
    // 全文検索（タイトル、所在地、備考）
    if (search) {
      query += ' AND (title LIKE ? OR location LIKE ? OR remarks LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // 合計件数を取得
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const totalCount = countResult?.total || 0;
    
    // ソートとページネーション付きでデータ取得
    query += ` ORDER BY ${orderColumn} ${orderDirection} LIMIT ? OFFSET ?`;
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
      },
      filters: {
        status,
        location,
        station,
        min_price: minPrice,
        max_price: maxPrice,
        min_area: minArea,
        max_area: maxArea,
        zoning,
        seller_id: sellerId,
        buyer_id: buyerId,
        search
      },
      sort: {
        by: orderColumn,
        order: orderDirection
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

    // 新規案件通知メール送信（エージェントと管理者へ）
    try {
      const resendApiKey = c.env.RESEND_API_KEY;
      if (resendApiKey) {
        const emailService = createEmailService(resendApiKey);
        const seller = await db.getUserById(body.seller_id);
        
        // エージェントへの通知
        if (seller?.email) {
          await emailService.sendNewDealNotification(
            seller.email,
            newDeal.title,
            {
              location: newDeal.location,
              station: newDeal.station,
              deadline: newDeal.reply_deadline
            }
          );
          console.log(`New deal notification sent to agent: ${seller.email}`);
        }

        // 管理者への通知（realestate.navigator01@gmail.com）
        const adminEmail = 'realestate.navigator01@gmail.com';
        await emailService.sendAdminNewDealNotification(
          adminEmail,
          newDeal.title,
          {
            location: newDeal.location,
            station: newDeal.station,
            deadline: newDeal.reply_deadline,
            sellerName: seller?.name,
            sellerEmail: seller?.email,
            buyerId: userId
          }
        );
        console.log(`New deal notification sent to admin: ${adminEmail}`);
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

// バルクステータス更新（管理者のみ）
deals.post('/bulk/status', adminOnly, async (c) => {
  try {
    const body = await c.req.json();
    const { deal_ids, status } = body;

    if (!Array.isArray(deal_ids) || deal_ids.length === 0) {
      return c.json({ error: 'deal_ids must be a non-empty array' }, 400);
    }

    if (!status) {
      return c.json({ error: 'status is required' }, 400);
    }

    // ステータスの妥当性チェック
    const validStatuses = ['NEW', 'REVIEWING', 'NEGOTIATING', 'CONTRACTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return c.json({ 
        error: 'Invalid status',
        valid_statuses: validStatuses 
      }, 400);
    }

    const db = new Database(c.env.DB);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ deal_id: string; error: string }>
    };

    // 各案件を更新
    for (const dealId of deal_ids) {
      try {
        const deal = await db.getDealById(dealId);
        if (!deal) {
          results.failed++;
          results.errors.push({ deal_id: dealId, error: 'Deal not found' });
          continue;
        }

        await db.updateDeal(dealId, { status });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          deal_id: dealId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return c.json({
      message: `Bulk status update completed`,
      results
    });
  } catch (error) {
    console.error('Bulk status update error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// バルク削除（管理者のみ）
deals.post('/bulk/delete', adminOnly, async (c) => {
  try {
    const body = await c.req.json();
    const { deal_ids } = body;

    if (!Array.isArray(deal_ids) || deal_ids.length === 0) {
      return c.json({ error: 'deal_ids must be a non-empty array' }, 400);
    }

    const db = new Database(c.env.DB);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ deal_id: string; error: string }>
    };

    // 各案件を削除
    for (const dealId of deal_ids) {
      try {
        await db.deleteDeal(dealId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          deal_id: dealId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return c.json({
      message: `Bulk delete completed`,
      results
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// バルクエージェント割り当て（管理者のみ）
deals.post('/bulk/assign', adminOnly, async (c) => {
  try {
    const body = await c.req.json();
    const { deal_ids, seller_id } = body;

    if (!Array.isArray(deal_ids) || deal_ids.length === 0) {
      return c.json({ error: 'deal_ids must be a non-empty array' }, 400);
    }

    if (!seller_id) {
      return c.json({ error: 'seller_id is required' }, 400);
    }

    const db = new Database(c.env.DB);
    
    // エージェントが存在するか確認
    const seller = await db.getUserById(seller_id);
    if (!seller) {
      return c.json({ error: 'Seller not found' }, 404);
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ deal_id: string; error: string }>
    };

    // 各案件のエージェントを更新
    for (const dealId of deal_ids) {
      try {
        const deal = await db.getDealById(dealId);
        if (!deal) {
          results.failed++;
          results.errors.push({ deal_id: dealId, error: 'Deal not found' });
          continue;
        }

        await db.updateDeal(dealId, { seller_id });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          deal_id: dealId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return c.json({
      message: `Bulk assignment completed`,
      results,
      assigned_to: {
        id: seller.id,
        name: seller.name,
        email: seller.email
      }
    });
  } catch (error) {
    console.error('Bulk assignment error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default deals;
