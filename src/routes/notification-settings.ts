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

// 通知設定スキーマ
const notificationSettingsSchema = z.object({
  emailOnNewDeal: z.boolean().optional(),
  emailOnDealUpdate: z.boolean().optional(),
  emailOnNewMessage: z.boolean().optional(),
  emailOnMention: z.boolean().optional(),
  emailOnTaskAssigned: z.boolean().optional(),
  emailDigestFrequency: z.enum(['none', 'daily', 'weekly']).optional(),
  pushOnNewMessage: z.boolean().optional(),
  pushOnMention: z.boolean().optional(),
  pushOnTaskDue: z.boolean().optional(),
});

// 通知設定を取得
app.get('/', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.userId || payload.sub;

  const settings = await c.env.DB.prepare(`
    SELECT * FROM notification_settings WHERE user_id = ?
  `).bind(userId).first();

  if (!settings) {
    // デフォルト設定を返す
    return c.json({
      emailOnNewDeal: true,
      emailOnDealUpdate: true,
      emailOnNewMessage: true,
      emailOnMention: true,
      emailOnTaskAssigned: true,
      emailDigestFrequency: 'daily',
      pushOnNewMessage: false,
      pushOnMention: false,
      pushOnTaskDue: false,
    });
  }

  return c.json({
    emailOnNewDeal: settings.email_on_new_deal === 1,
    emailOnDealUpdate: settings.email_on_deal_update === 1,
    emailOnNewMessage: settings.email_on_new_message === 1,
    emailOnMention: settings.email_on_mention === 1,
    emailOnTaskAssigned: settings.email_on_task_assigned === 1,
    emailDigestFrequency: settings.email_digest_frequency,
    pushOnNewMessage: settings.push_on_new_message === 1,
    pushOnMention: settings.push_on_mention === 1,
    pushOnTaskDue: settings.push_on_task_due === 1,
  });
});

// 通知設定を更新
app.put('/', zValidator('json', notificationSettingsSchema), async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.userId || payload.sub;
  const data = c.req.valid('json');

  // 設定が存在するか確認
  const existing = await c.env.DB.prepare(`
    SELECT id FROM notification_settings WHERE user_id = ?
  `).bind(userId).first();

  if (existing) {
    // 更新
    await c.env.DB.prepare(`
      UPDATE notification_settings
      SET email_on_new_deal = ?,
          email_on_deal_update = ?,
          email_on_new_message = ?,
          email_on_mention = ?,
          email_on_task_assigned = ?,
          email_digest_frequency = ?,
          push_on_new_message = ?,
          push_on_mention = ?,
          push_on_task_due = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(
      data.emailOnNewDeal ? 1 : 0,
      data.emailOnDealUpdate ? 1 : 0,
      data.emailOnNewMessage ? 1 : 0,
      data.emailOnMention ? 1 : 0,
      data.emailOnTaskAssigned ? 1 : 0,
      data.emailDigestFrequency || 'daily',
      data.pushOnNewMessage ? 1 : 0,
      data.pushOnMention ? 1 : 0,
      data.pushOnTaskDue ? 1 : 0,
      userId
    ).run();
  } else {
    // 新規作成
    await c.env.DB.prepare(`
      INSERT INTO notification_settings (
        user_id, email_on_new_deal, email_on_deal_update,
        email_on_new_message, email_on_mention, email_on_task_assigned,
        email_digest_frequency, push_on_new_message, push_on_mention,
        push_on_task_due
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      data.emailOnNewDeal !== undefined ? (data.emailOnNewDeal ? 1 : 0) : 1,
      data.emailOnDealUpdate !== undefined ? (data.emailOnDealUpdate ? 1 : 0) : 1,
      data.emailOnNewMessage !== undefined ? (data.emailOnNewMessage ? 1 : 0) : 1,
      data.emailOnMention !== undefined ? (data.emailOnMention ? 1 : 0) : 1,
      data.emailOnTaskAssigned !== undefined ? (data.emailOnTaskAssigned ? 1 : 0) : 1,
      data.emailDigestFrequency || 'daily',
      data.pushOnNewMessage ? 1 : 0,
      data.pushOnMention ? 1 : 0,
      data.pushOnTaskDue ? 1 : 0
    ).run();
  }

  return c.json({ message: '通知設定を更新しました' });
});

export default app;
