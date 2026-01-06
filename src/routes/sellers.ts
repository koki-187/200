import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { authMiddleware, adminOnly } from '../utils/auth';
import type { Bindings } from '../types';

const sellers = new Hono<{ Bindings: Bindings }>();

// Apply auth middleware to all routes
sellers.use('/*', authMiddleware);

/**
 * GET /api/sellers
 * 売主一覧を取得
 */
sellers.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    console.log('[Sellers API] GET / - userId:', userId);

    const result = await c.env.DB.prepare(`
      SELECT 
        id,
        name,
        company_name,
        email,
        phone,
        address,
        notes,
        created_at
      FROM sellers
      WHERE is_deleted = 0
      ORDER BY created_at DESC
    `).all();

    console.log('[Sellers API] Found sellers:', result.results?.length || 0);

    return c.json({
      success: true,
      sellers: result.results || []
    });
  } catch (error) {
    console.error('[Sellers API] Error fetching sellers:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch sellers',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/sellers
 * 新規売主を作成
 */
sellers.post('/', adminOnly, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    console.log('[Sellers API] POST / - Creating seller:', body.name);

    const sellerId = nanoid();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO sellers (
        id,
        name,
        company_name,
        email,
        phone,
        address,
        notes,
        created_by,
        created_at,
        updated_at,
        is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(
      sellerId,
      body.name,
      body.company_name || '',
      body.email || '',
      body.phone || '',
      body.address || '',
      body.notes || '',
      userId,
      now,
      now
    ).run();

    console.log('[Sellers API] Seller created successfully:', sellerId);

    return c.json({
      success: true,
      seller_id: sellerId,
      message: '売主を作成しました'
    });
  } catch (error) {
    console.error('[Sellers API] Error creating seller:', error);
    return c.json({
      success: false,
      error: 'Failed to create seller',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/sellers/:id
 * 売主詳細を取得
 */
sellers.get('/:id', async (c) => {
  try {
    const sellerId = c.req.param('id');
    console.log('[Sellers API] GET /:id - sellerId:', sellerId);

    const seller = await c.env.DB.prepare(`
      SELECT 
        id,
        name,
        company_name,
        email,
        phone,
        address,
        notes,
        created_at,
        updated_at
      FROM sellers
      WHERE id = ? AND is_deleted = 0
    `).bind(sellerId).first();

    if (!seller) {
      return c.json({
        success: false,
        error: 'Seller not found'
      }, 404);
    }

    return c.json({
      success: true,
      seller
    });
  } catch (error) {
    console.error('[Sellers API] Error fetching seller:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch seller',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * PUT /api/sellers/:id
 * 売主情報を更新
 */
sellers.put('/:id', adminOnly, async (c) => {
  try {
    const sellerId = c.req.param('id');
    const body = await c.req.json();

    console.log('[Sellers API] PUT /:id - sellerId:', sellerId);

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE sellers
      SET 
        name = ?,
        company_name = ?,
        email = ?,
        phone = ?,
        address = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `).bind(
      body.name,
      body.company_name || '',
      body.email || '',
      body.phone || '',
      body.address || '',
      body.notes || '',
      now,
      sellerId
    ).run();

    console.log('[Sellers API] Seller updated successfully:', sellerId);

    return c.json({
      success: true,
      message: '売主情報を更新しました'
    });
  } catch (error) {
    console.error('[Sellers API] Error updating seller:', error);
    return c.json({
      success: false,
      error: 'Failed to update seller',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * DELETE /api/sellers/:id
 * 売主を削除（論理削除）
 */
sellers.delete('/:id', adminOnly, async (c) => {
  try {
    const sellerId = c.req.param('id');
    console.log('[Sellers API] DELETE /:id - sellerId:', sellerId);

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE sellers
      SET is_deleted = 1, updated_at = ?
      WHERE id = ?
    `).bind(now, sellerId).run();

    console.log('[Sellers API] Seller deleted successfully:', sellerId);

    return c.json({
      success: true,
      message: '売主を削除しました'
    });
  } catch (error) {
    console.error('[Sellers API] Error deleting seller:', error);
    return c.json({
      success: false,
      error: 'Failed to delete seller',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default sellers;
