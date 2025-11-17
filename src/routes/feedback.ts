import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

// JWT認証を適用（フィードバック送信は認証必須）
app.use('*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET || 'default-secret-key-change-in-production',
  });
  return jwtMiddleware(c, next);
});

// フィードバックスキーマ
const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'other']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().optional(),
  url: z.string().url().optional(),
  browser: z.string().optional(),
  screenshot: z.string().optional(), // Base64エンコードされた画像
});

// フィードバックを送信
app.post('/', zValidator('json', feedbackSchema), async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.userId || payload.sub;
  const data = c.req.valid('json');

  try {
    // ユーザー情報を取得
    const user = await c.env.DB.prepare(`
      SELECT name, email FROM users WHERE id = ?
    `).bind(userId).first();

    // フィードバックを保存
    const result = await c.env.DB.prepare(`
      INSERT INTO feedback (
        user_id, type, title, description, priority, category, url, browser, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `).bind(
      userId,
      data.type,
      data.title,
      data.description,
      data.priority || 'medium',
      data.category || null,
      data.url || null,
      data.browser || null
    ).run();

    const feedbackId = result.meta.last_row_id;

    // スクリーンショットがあればR2に保存
    if (data.screenshot) {
      try {
        const base64Data = data.screenshot.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        await c.env.R2.put(`feedback/${feedbackId}/screenshot.png`, buffer, {
          httpMetadata: {
            contentType: 'image/png',
          },
        });

        // スクリーンショットのパスを更新
        await c.env.DB.prepare(`
          UPDATE feedback SET screenshot_path = ? WHERE id = ?
        `).bind(`feedback/${feedbackId}/screenshot.png`, feedbackId).run();
      } catch (error) {
        console.error('Failed to save screenshot:', error);
      }
    }

    return c.json({
      message: 'フィードバックを送信しました',
      feedbackId,
      status: 'success'
    }, 201);
  } catch (error: any) {
    console.error('Failed to submit feedback:', error);
    return c.json({ error: 'フィードバックの送信に失敗しました' }, 500);
  }
});

// フィードバック一覧を取得（管理者のみ）
app.get('/', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.userId || payload.sub;

  // 管理者権限確認
  const user = await c.env.DB.prepare(`
    SELECT role FROM users WHERE id = ?
  `).bind(userId).first();

  if (user?.role !== 'admin') {
    // 一般ユーザーは自分のフィードバックのみ取得
    const { results } = await c.env.DB.prepare(`
      SELECT id, type, title, description, priority, status, created_at
      FROM feedback
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    return c.json({ feedback: results });
  }

  // 管理者は全フィードバックを取得
  const { status, type, priority } = c.req.query();
  
  let query = `
    SELECT f.*, u.name as user_name, u.email as user_email
    FROM feedback f
    JOIN users u ON f.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    query += ' AND f.status = ?';
    params.push(status);
  }
  if (type) {
    query += ' AND f.type = ?';
    params.push(type);
  }
  if (priority) {
    query += ' AND f.priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY f.created_at DESC LIMIT 100';

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({ feedback: results });
});

// 特定のフィードバックを取得
app.get('/:id', async (c) => {
  const feedbackId = c.req.param('id');
  const payload = c.get('jwtPayload');
  const userId = payload.userId || payload.sub;

  try {
    const feedback = await c.env.DB.prepare(`
      SELECT f.*, u.name as user_name, u.email as user_email
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `).bind(feedbackId).first();

    if (!feedback) {
      return c.json({ error: 'フィードバックが見つかりません' }, 404);
    }

    // 権限確認（自分のフィードバックまたは管理者）
    const user = await c.env.DB.prepare(`
      SELECT role FROM users WHERE id = ?
    `).bind(userId).first();

    if (feedback.user_id !== userId && user?.role !== 'admin') {
      return c.json({ error: 'アクセス権限がありません' }, 403);
    }

    // スクリーンショットURLを追加
    if (feedback.screenshot_path) {
      feedback.screenshot_url = `/api/feedback/${feedbackId}/screenshot`;
    }

    return c.json({ feedback });
  } catch (error: any) {
    console.error('Failed to get feedback:', error);
    return c.json({ error: 'フィードバックの取得に失敗しました' }, 500);
  }
});

// フィードバックのステータスを更新（管理者のみ）
app.patch('/:id/status', async (c) => {
  const feedbackId = c.req.param('id');
  const payload = c.get('jwtPayload');
  const userId = payload.userId || payload.sub;

  // 管理者権限確認
  const user = await c.env.DB.prepare(`
    SELECT role FROM users WHERE id = ?
  `).bind(userId).first();

  if (user?.role !== 'admin') {
    return c.json({ error: '管理者権限が必要です' }, 403);
  }

  const { status, response } = await c.req.json();

  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return c.json({ error: '無効なステータスです' }, 400);
  }

  try {
    await c.env.DB.prepare(`
      UPDATE feedback
      SET status = ?, admin_response = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, response || null, feedbackId).run();

    return c.json({ message: 'ステータスを更新しました' });
  } catch (error: any) {
    console.error('Failed to update feedback status:', error);
    return c.json({ error: 'ステータスの更新に失敗しました' }, 500);
  }
});

// スクリーンショットを取得
app.get('/:id/screenshot', async (c) => {
  const feedbackId = c.req.param('id');

  try {
    const feedback = await c.env.DB.prepare(`
      SELECT screenshot_path FROM feedback WHERE id = ?
    `).bind(feedbackId).first();

    if (!feedback?.screenshot_path) {
      return c.json({ error: 'スクリーンショットが見つかりません' }, 404);
    }

    const object = await c.env.R2.get(feedback.screenshot_path);

    if (!object) {
      return c.json({ error: 'スクリーンショットが見つかりません' }, 404);
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    console.error('Failed to get screenshot:', error);
    return c.json({ error: 'スクリーンショットの取得に失敗しました' }, 500);
  }
});

// フィードバック統計を取得（管理者のみ）
app.get('/stats/summary', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.userId || payload.sub;

  // 管理者権限確認
  const user = await c.env.DB.prepare(`
    SELECT role FROM users WHERE id = ?
  `).bind(userId).first();

  if (user?.role !== 'admin') {
    return c.json({ error: '管理者権限が必要です' }, 403);
  }

  try {
    // ステータス別集計
    const { results: statusCounts } = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM feedback
      GROUP BY status
    `).all();

    // タイプ別集計
    const { results: typeCounts } = await c.env.DB.prepare(`
      SELECT type, COUNT(*) as count
      FROM feedback
      GROUP BY type
    `).all();

    // 優先度別集計
    const { results: priorityCounts } = await c.env.DB.prepare(`
      SELECT priority, COUNT(*) as count
      FROM feedback
      GROUP BY priority
    `).all();

    return c.json({
      byStatus: statusCounts,
      byType: typeCounts,
      byPriority: priorityCounts,
    });
  } catch (error: any) {
    console.error('Failed to get feedback stats:', error);
    return c.json({ error: '統計の取得に失敗しました' }, 500);
  }
});

export default app;
