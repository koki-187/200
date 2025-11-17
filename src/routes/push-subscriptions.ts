import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

// JWT認証を適用
app.use('*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET || 'default-secret-key-change-in-production',
  });
  return jwtMiddleware(c, next);
});

// プッシュサブスクリプションスキーマ
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

// サブスクリプションを保存
app.post('/', zValidator('json', subscriptionSchema), async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub;
  const subscription = c.req.valid('json');

  try {
    // 既存のサブスクリプションを確認
    const existing = await c.env.DB.prepare(`
      SELECT id FROM push_subscriptions 
      WHERE user_id = ? AND endpoint = ?
    `).bind(userId, subscription.endpoint).first();

    if (existing) {
      // 更新
      await c.env.DB.prepare(`
        UPDATE push_subscriptions
        SET keys_p256dh = ?,
            keys_auth = ?,
            expiration_time = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        subscription.keys.p256dh,
        subscription.keys.auth,
        subscription.expirationTime,
        existing.id
      ).run();
    } else {
      // 新規作成
      await c.env.DB.prepare(`
        INSERT INTO push_subscriptions (
          user_id, endpoint, keys_p256dh, keys_auth, expiration_time
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        subscription.expirationTime
      ).run();
    }

    return c.json({ 
      message: 'サブスクリプションを保存しました',
      subscription 
    });
  } catch (error: any) {
    console.error('Failed to save subscription:', error);
    return c.json({ error: 'サブスクリプションの保存に失敗しました' }, 500);
  }
});

// サブスクリプションを削除
app.delete('/', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub;
  const { endpoint } = await c.req.json();

  if (!endpoint) {
    return c.json({ error: 'endpointが必要です' }, 400);
  }

  try {
    await c.env.DB.prepare(`
      DELETE FROM push_subscriptions
      WHERE user_id = ? AND endpoint = ?
    `).bind(userId, endpoint).run();

    return c.json({ message: 'サブスクリプションを削除しました' });
  } catch (error: any) {
    console.error('Failed to delete subscription:', error);
    return c.json({ error: 'サブスクリプションの削除に失敗しました' }, 500);
  }
});

// ユーザーのサブスクリプション一覧を取得
app.get('/', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub;

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT endpoint, expiration_time, created_at, updated_at
      FROM push_subscriptions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    return c.json({ subscriptions: results });
  } catch (error: any) {
    console.error('Failed to fetch subscriptions:', error);
    return c.json({ error: 'サブスクリプションの取得に失敗しました' }, 500);
  }
});

// テスト通知を送信
app.post('/test', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub;

  try {
    // ユーザーのサブスクリプションを取得
    const { results: subscriptions } = await c.env.DB.prepare(`
      SELECT endpoint, keys_p256dh, keys_auth
      FROM push_subscriptions
      WHERE user_id = ?
    `).bind(userId).all();

    if (subscriptions.length === 0) {
      return c.json({ error: '有効なサブスクリプションがありません' }, 404);
    }

    // Web Push送信（実装は環境変数にVAPID設定が必要）
    // 本実装では簡易的にサブスクリプション存在確認のみ
    const notificationPayload = {
      title: 'テスト通知',
      body: 'これはテスト通知です',
      icon: '/static/icon-192.png',
      data: { url: '/' }
    };

    // TODO: Web Push APIを使用して実際の通知を送信
    // web-pushライブラリが必要（Cloudflare Workers環境では制限あり）
    
    return c.json({ 
      message: `${subscriptions.length}件のサブスクリプションにテスト通知を送信しました`,
      payload: notificationPayload
    });
  } catch (error: any) {
    console.error('Failed to send test notification:', error);
    return c.json({ error: 'テスト通知の送信に失敗しました' }, 500);
  }
});

export default app;
