import { Hono } from 'hono';
import type { Bindings } from '../types';
import { createEmailService } from '../utils/email';
import { Database } from '../db/queries';

const email = new Hono<{ Bindings: Bindings }>();

// 期限通知メール送信テスト（管理者のみ）
email.post('/test/deadline', async (c) => {
  const role = c.get('userRole') as string;
  if (role !== 'ADMIN') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const { deal_id, recipient_email } = await c.req.json();
    
    if (!deal_id || !recipient_email) {
      return c.json({ error: 'deal_id and recipient_email are required' }, 400);
    }

    // 案件情報取得
    const db = new Database(c.env.DB);
    const deal = await db.getDealById(deal_id);
    
    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    // メールサービス初期化
    const resendApiKey = c.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return c.json({ error: 'RESEND_API_KEY not configured' }, 500);
    }

    const emailService = createEmailService(resendApiKey);
    
    // 残り時間計算
    const deadline = new Date(deal.response_deadline);
    const now = new Date();
    const hoursRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

    // メール送信
    const result = await emailService.sendDeadlineNotification(
      recipient_email,
      deal.title,
      deal.response_deadline,
      hoursRemaining
    );

    if (result.success) {
      return c.json({ 
        success: true, 
        message: 'Deadline notification sent',
        messageId: result.messageId 
      });
    } else {
      return c.json({ error: result.error }, 500);
    }
  } catch (error) {
    console.error('Email test error:', error);
    return c.json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 新着メッセージ通知メール送信テスト
email.post('/test/message', async (c) => {
  const role = c.get('userRole') as string;
  if (role !== 'ADMIN') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const { deal_id, recipient_email } = await c.req.json();
    
    if (!deal_id || !recipient_email) {
      return c.json({ error: 'deal_id and recipient_email are required' }, 400);
    }

    const db = new Database(c.env.DB);
    const deal = await db.getDealById(deal_id);
    
    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    // 最新メッセージ取得
    const messages = await db.getMessagesByDeal(deal_id);
    if (messages.length === 0) {
      return c.json({ error: 'No messages found for this deal' }, 404);
    }

    const latestMessage = messages[0];
    const sender = await db.getUserById(latestMessage.sender_id);

    const resendApiKey = c.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return c.json({ error: 'RESEND_API_KEY not configured' }, 500);
    }

    const emailService = createEmailService(resendApiKey);
    
    const result = await emailService.sendNewMessageNotification(
      recipient_email,
      deal.title,
      sender?.name || 'Unknown User',
      latestMessage.content
    );

    if (result.success) {
      return c.json({ 
        success: true, 
        message: 'Message notification sent',
        messageId: result.messageId 
      });
    } else {
      return c.json({ error: result.error }, 500);
    }
  } catch (error) {
    console.error('Email test error:', error);
    return c.json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 新規案件通知メール送信テスト
email.post('/test/new-deal', async (c) => {
  const role = c.get('userRole') as string;
  if (role !== 'ADMIN') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const { deal_id, recipient_email } = await c.req.json();
    
    if (!deal_id || !recipient_email) {
      return c.json({ error: 'deal_id and recipient_email are required' }, 400);
    }

    const db = new Database(c.env.DB);
    const deal = await db.getDealById(deal_id);
    
    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    const resendApiKey = c.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return c.json({ error: 'RESEND_API_KEY not configured' }, 500);
    }

    const emailService = createEmailService(resendApiKey);
    
    const result = await emailService.sendNewDealNotification(
      recipient_email,
      deal.title,
      {
        location: deal.location,
        station: deal.station,
        deadline: deal.response_deadline
      }
    );

    if (result.success) {
      return c.json({ 
        success: true, 
        message: 'New deal notification sent',
        messageId: result.messageId 
      });
    } else {
      return c.json({ error: result.error }, 500);
    }
  } catch (error) {
    console.error('Email test error:', error);
    return c.json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default email;
