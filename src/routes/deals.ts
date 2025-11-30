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

    // 新規案件通知（メール + D1通知）
    try {
      const seller = await db.getUserById(body.seller_id);
      
      // D1データベースに通知を保存（管理者用）
      const { createNotification } = await import('./notifications');
      
      // 管理者への通知を作成
      const adminUsers = await c.env.DB.prepare(
        'SELECT id FROM users WHERE role = ? LIMIT 10'
      ).bind('ADMIN').all();

      for (const admin of (adminUsers.results || [])) {
        await createNotification(
          c.env.DB,
          admin.id as string,
          'NEW_DEAL',
          `新規案件登録: ${newDeal.title}`,
          `${seller?.name || '担当者'}が新しい案件を登録しました。\n所在地: ${newDeal.location || '未設定'}\n最寄駅: ${newDeal.station || '未設定'}`,
          `/deals/${newDeal.id}`
        );
      }
      
      console.log(`✅ D1 notifications created for ${adminUsers.results?.length || 0} admin(s)`);

      // メール送信を試みる（失敗しても続行）
      const resendApiKey = c.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.warn('⚠️ RESEND_API_KEY not configured - using D1 notifications only');
      } else {
        const emailService = createEmailService(resendApiKey);
        
        // エージェントへの通知
        if (seller?.email) {
          const agentResult = await emailService.sendNewDealNotification(
            seller.email,
            newDeal.title,
            {
              location: newDeal.location,
              station: newDeal.station,
              deadline: newDeal.reply_deadline
            }
          );
          if (agentResult.success) {
            console.log(`✅ Email notification sent to agent: ${seller.email} (MessageID: ${agentResult.messageId})`);
          } else {
            console.error(`❌ Failed to send email to agent: ${seller.email} - Error: ${agentResult.error}`);
          }
        }

        // 管理者へのメール通知
        const adminEmail = 'realestate.navigator01@gmail.com';
        const adminResult = await emailService.sendAdminNewDealNotification(
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
        if (adminResult.success) {
          console.log(`✅ Email notification sent to admin: ${adminEmail} (MessageID: ${adminResult.messageId})`);
        } else {
          console.warn(`⚠️ Email failed but D1 notification was created - Error: ${adminResult.error}`);
        }
      }
    } catch (notificationError) {
      // 通知失敗してもエラーレスポンスは返さない（ログのみ）
      console.error('❌ Failed to send notifications:', notificationError);
      if (notificationError instanceof Error) {
        console.error('Error details:', notificationError.message);
        console.error('Stack trace:', notificationError.stack);
      }
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

    // ステータス変更の検出
    const statusChanged = body.status && body.status !== deal.status;
    const oldStatus = deal.status;

    await db.updateDeal(dealId, body);

    const updatedDeal = await db.getDealById(dealId);
    
    // ステータス変更時の通知を送信
    if (statusChanged && updatedDeal) {
      try {
        const { createNotification } = await import('./notifications');
        
        // ステータス変更の日本語表示
        const statusMap: Record<string, string> = {
          'NEW': '新規',
          'REVIEWING': 'レビュー中',
          'NEGOTIATING': '交渉中',
          'CONTRACTED': '契約済み',
          'REJECTED': '却下'
        };
        
        const oldStatusText = statusMap[oldStatus] || oldStatus;
        const newStatusText = statusMap[updatedDeal.status] || updatedDeal.status;
        
        // 関係者への通知（担当エージェントと管理者）
        const notificationRecipients = [];
        
        // 担当エージェント
        if (updatedDeal.seller_id && updatedDeal.seller_id !== userId) {
          notificationRecipients.push(updatedDeal.seller_id);
        }
        
        // 管理者（更新者が管理者でない場合）
        if (role !== 'ADMIN') {
          const adminUsers = await c.env.DB.prepare(
            'SELECT id FROM users WHERE role = ? LIMIT 10'
          ).bind('ADMIN').all();
          
          for (const admin of (adminUsers.results || [])) {
            if (admin.id !== userId) {
              notificationRecipients.push(admin.id as string);
            }
          }
        }
        
        // 重複を排除
        const uniqueRecipients = [...new Set(notificationRecipients)];
        
        // 通知を作成
        for (const recipientId of uniqueRecipients) {
          await createNotification(
            c.env.DB,
            recipientId,
            'STATUS_CHANGE',
            `案件ステータス変更: ${updatedDeal.title}`,
            `ステータスが「${oldStatusText}」から「${newStatusText}」に変更されました。\n所在地: ${updatedDeal.location || '未設定'}`,
            `/deals/${dealId}`
          );
        }
        
        console.log(`✅ Status change notifications created for ${uniqueRecipients.length} user(s)`);
      } catch (notifError) {
        console.error('Failed to send status change notification:', notifError);
        // 通知失敗してもDeal更新は成功とする
      }
    }

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
    const updatedDeals = [];
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
        
        // 通知用に更新後のDealを保存
        const updatedDeal = await db.getDealById(dealId);
        if (updatedDeal) {
          updatedDeals.push({ 
            deal: updatedDeal, 
            oldStatus: deal.status 
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          deal_id: dealId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // バルク更新の通知を送信
    if (updatedDeals.length > 0) {
      try {
        const { createNotification } = await import('./notifications');
        const userId = c.get('userId') as string;
        
        // ステータス変更の日本語表示
        const statusMap: Record<string, string> = {
          'NEW': '新規',
          'REVIEWING': 'レビュー中',
          'NEGOTIATING': '交渉中',
          'CONTRACTED': '契約済み',
          'REJECTED': '却下'
        };
        
        const newStatusText = statusMap[status] || status;
        
        // 関係する全てのエージェントに通知
        const notifiedUsers = new Set<string>();
        
        for (const { deal } of updatedDeals) {
          if (deal.seller_id && deal.seller_id !== userId) {
            if (!notifiedUsers.has(deal.seller_id)) {
              await createNotification(
                c.env.DB,
                deal.seller_id,
                'STATUS_CHANGE',
                `案件ステータス一括変更`,
                `${updatedDeals.length}件の案件のステータスが「${newStatusText}」に変更されました。`,
                `/deals`
              );
              notifiedUsers.add(deal.seller_id);
            }
          }
        }
        
        console.log(`✅ Bulk status change notifications sent to ${notifiedUsers.size} user(s)`);
      } catch (notifError) {
        console.error('Failed to send bulk status change notification:', notifError);
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

// 古いテストデータの一括削除（管理者のみ）
deals.delete('/batch/cleanup', adminOnly, async (c) => {
  try {
    const db = new Database(c.env.DB);
    const { older_than_days } = await c.req.json();
    
    if (!older_than_days || older_than_days < 1) {
      return c.json({ error: '削除対象期間（日数）を指定してください' }, 400);
    }

    // 指定日数より古いDealを削除（テストデータのみを対象）
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - older_than_days);
    const cutoffISO = cutoffDate.toISOString();

    // 削除対象の案件を取得
    const { results: oldDeals } = await c.env.DB.prepare(`
      SELECT id, title, created_at 
      FROM deals 
      WHERE created_at < ? 
        AND (
          title LIKE '%テスト%' 
          OR title LIKE '%test%' 
          OR title LIKE '%Test%'
          OR title LIKE '%完全版%'
          OR remarks LIKE '%テスト%'
        )
      ORDER BY created_at ASC
    `).bind(cutoffISO).all();

    if (!oldDeals || oldDeals.length === 0) {
      return c.json({ 
        success: true,
        message: '削除対象のデータはありません',
        deleted_count: 0
      });
    }

    let deletedCount = 0;
    const errors = [];

    for (const deal of oldDeals) {
      try {
        // 関連ファイルを削除
        await c.env.DB.prepare('DELETE FROM deal_files WHERE deal_id = ?').bind(deal.id).run();
        
        // メッセージを削除
        await c.env.DB.prepare('DELETE FROM messages WHERE deal_id = ?').bind(deal.id).run();
        
        // 通知を削除
        await c.env.DB.prepare('DELETE FROM notifications WHERE deal_id = ?').bind(deal.id).run();
        
        // Dealを削除
        await c.env.DB.prepare('DELETE FROM deals WHERE id = ?').bind(deal.id).run();
        
        deletedCount++;
      } catch (error) {
        errors.push({ 
          id: deal.id, 
          title: deal.title,
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return c.json({
      success: true,
      message: `${deletedCount}件の古いテストデータを削除しました`,
      deleted_count: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return c.json({ error: 'データ削除に失敗しました' }, 500);
  }
});

export default deals;
