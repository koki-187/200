import { Hono } from 'hono';
import { Bindings, Message } from '../types';
import { Database } from '../db/queries';
import { authMiddleware } from '../utils/auth';
import { nanoid } from 'nanoid';

const messages = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
messages.use('*', authMiddleware);

// メッセージ一覧取得
messages.get('/deals/:dealId', async (c) => {
  try {
    const dealId = c.req.param('dealId');
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

    const messagesList = await db.getMessagesByDeal(dealId);
    return c.json({ messages: messagesList });
  } catch (error) {
    console.error('Get messages error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メッセージ作成
messages.post('/deals/:dealId', async (c) => {
  try {
    const dealId = c.req.param('dealId');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    const { content } = await c.req.json();

    if (!content) {
      return c.json({ error: 'Content is required' }, 400);
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

    const newMessage: Omit<Message, 'created_at'> = {
      id: nanoid(),
      deal_id: dealId,
      sender_id: userId,
      content,
      has_attachments: 0,
      is_read_by_buyer: role === 'ADMIN' ? 1 : 0,
      is_read_by_seller: role === 'AGENT' ? 1 : 0
    };

    await db.createMessage(newMessage);

    // TODO: 通知送信（メール等）

    return c.json({ message: newMessage }, 201);
  } catch (error) {
    console.error('Create message error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default messages;
