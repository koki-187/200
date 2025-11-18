import { Hono } from 'hono';
import { Bindings, Message } from '../types';
import { Database } from '../db/queries';
import { authMiddleware } from '../utils/auth';
import { nanoid } from 'nanoid';
import { uploadToR2 } from '../utils/r2-helpers';
import { validateFileUpload, sanitizeFilename } from '../utils/file-validators';
import { validateData, messageSchema, escapeHtml } from '../utils/validation';
import { extractMentions, resolveMentionedUsers, storeMentions } from '../utils/mentions';
import { createEmailService } from '../utils/email';

const messages = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
messages.use('*', authMiddleware);

// メッセージ一覧取得（検索・フィルター対応）
messages.get('/deals/:dealId', async (c) => {
  try {
    const dealId = c.req.param('dealId');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    
    // クエリパラメータ
    const searchQuery = c.req.query('search');
    const hasAttachments = c.req.query('hasAttachments');
    const fromDate = c.req.query('fromDate');
    const toDate = c.req.query('toDate');
    const senderId = c.req.query('senderId');

    const db = new Database(c.env.DB);
    const deal = await db.getDealById(dealId);

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    // 権限チェック
    if (role === 'AGENT' && deal.seller_id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // 検索条件付きクエリ構築
    let query = 'SELECT * FROM messages WHERE deal_id = ?';
    const params: any[] = [dealId];

    if (searchQuery) {
      query += ' AND content LIKE ?';
      params.push(`%${searchQuery}%`);
    }

    if (hasAttachments === 'true') {
      query += ' AND has_attachments = 1';
    } else if (hasAttachments === 'false') {
      query += ' AND has_attachments = 0';
    }

    if (fromDate) {
      query += ' AND created_at >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND created_at <= ?';
      params.push(toDate);
    }

    if (senderId) {
      query += ' AND sender_id = ?';
      params.push(senderId);
    }

    query += ' ORDER BY created_at ASC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // 送信者情報を付加
    const messagesWithSender = await Promise.all(
      (results as Message[]).map(async (msg) => {
        const sender = await db.getUserById(msg.sender_id);
        return {
          ...msg,
          sender_name: sender?.name || 'Unknown',
          sender_role: sender?.role || 'Unknown'
        };
      })
    );

    return c.json({ messages: messagesWithSender });
  } catch (error) {
    console.error('Get messages error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メッセージ作成（テキストのみ）
messages.post('/deals/:dealId', async (c) => {
  try {
    const dealId = c.req.param('dealId');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    const body = await c.req.json();

    // Zodバリデーション
    const validation = validateData(messageSchema, { ...body, deal_id: dealId });
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

    // XSS対策: HTMLエスケープ
    const sanitizedContent = escapeHtml(validation.data.content);

    const newMessage: Omit<Message, 'created_at'> = {
      id: nanoid(),
      deal_id: dealId,
      sender_id: userId,
      content: sanitizedContent,
      has_attachments: 0,
      is_read_by_buyer: role === 'ADMIN' ? 1 : 0,
      is_read_by_seller: role === 'AGENT' ? 1 : 0
    };

    await db.createMessage(newMessage);

    // @mention処理
    const mentions = extractMentions(sanitizedContent);
    if (mentions.length > 0) {
      const mentionedUserIds = await resolveMentionedUsers(mentions, c.env.DB);
      if (mentionedUserIds.length > 0) {
        await storeMentions(newMessage.id, mentionedUserIds, c.env.DB);
        
        // メンション通知メール送信
        try {
          const resendApiKey = c.env.RESEND_API_KEY;
          if (resendApiKey) {
            const emailService = createEmailService(resendApiKey);
            const sender = await db.getUserById(userId);
            
            for (const mentionedUserId of mentionedUserIds) {
              const mentionedUser = await db.getUserById(mentionedUserId);
              if (mentionedUser?.email) {
                await emailService.sendNewMessageNotification(
                  mentionedUser.email,
                  deal.title,
                  sender?.name || 'Unknown',
                  sanitizedContent
                );
              }
            }
            console.log(`Mention notifications sent to ${mentionedUserIds.length} users`);
          }
        } catch (emailError) {
          console.error('Failed to send mention notification emails:', emailError);
        }
      }
    }

    // 新着メッセージ通知（受信者へ）
    try {
      const resendApiKey = c.env.RESEND_API_KEY;
      if (resendApiKey) {
        const emailService = createEmailService(resendApiKey);
        const sender = await db.getUserById(userId);
        
        // 送信者以外の関係者に通知
        const recipientId = role === 'ADMIN' ? deal.seller_id : deal.buyer_id;
        const recipient = await db.getUserById(recipientId);
        
        if (recipient?.email) {
          await emailService.sendNewMessageNotification(
            recipient.email,
            deal.title,
            sender?.name || 'Unknown',
            sanitizedContent
          );
          console.log(`New message notification sent to ${recipient.email}`);
        }
      }
    } catch (emailError) {
      console.error('Failed to send new message notification email:', emailError);
    }

    return c.json({ message: newMessage }, 201);
  } catch (error) {
    console.error('Create message error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メッセージ作成（ファイル添付対応）
messages.post('/deals/:dealId/with-attachments', async (c) => {
  try {
    const dealId = c.req.param('dealId');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    
    const formData = await c.req.formData();
    const content = formData.get('content') as string;
    const files = formData.getAll('files') as File[];

    if (!content || content.trim().length === 0) {
      return c.json({ error: 'メッセージ内容は必須です' }, 400);
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

    // XSS対策: HTMLエスケープ
    const sanitizedContent = escapeHtml(content);

    // メッセージ作成
    const messageId = nanoid();
    const newMessage: Omit<Message, 'created_at'> = {
      id: messageId,
      deal_id: dealId,
      sender_id: userId,
      content: sanitizedContent,
      has_attachments: files.length > 0 ? 1 : 0,
      is_read_by_buyer: role === 'ADMIN' ? 1 : 0,
      is_read_by_seller: role === 'AGENT' ? 1 : 0
    };

    await db.createMessage(newMessage);

    // @mention処理
    const mentions = extractMentions(sanitizedContent);
    if (mentions.length > 0) {
      const mentionedUserIds = await resolveMentionedUsers(mentions, c.env.DB);
      if (mentionedUserIds.length > 0) {
        await storeMentions(messageId, mentionedUserIds, c.env.DB);
        
        // メンション通知メール送信
        try {
          const resendApiKey = c.env.RESEND_API_KEY;
          if (resendApiKey) {
            const emailService = createEmailService(resendApiKey);
            const sender = await db.getUserById(userId);
            
            for (const mentionedUserId of mentionedUserIds) {
              const mentionedUser = await db.getUserById(mentionedUserId);
              if (mentionedUser?.email) {
                await emailService.sendNewMessageNotification(
                  mentionedUser.email,
                  deal.title,
                  sender?.name || 'Unknown',
                  sanitizedContent
                );
              }
            }
            console.log(`Mention notifications sent to ${mentionedUserIds.length} users`);
          }
        } catch (emailError) {
          console.error('Failed to send mention notification emails:', emailError);
        }
      }
    }

    // ファイル添付処理
    const uploadedFiles: any[] = [];
    for (const file of files) {
      if (file && file.size > 0) {
        // ファイル検証
        const sanitized = sanitizeFilename(file.name);
        const validation = validateFileUpload(sanitized, file.size, 'chat');
        
        if (!validation.valid) {
          // ロールバック: メッセージとアップロード済みファイルを削除
          await db.deleteMessage(messageId);
          for (const uploaded of uploadedFiles) {
            await c.env.DB.prepare('DELETE FROM files WHERE id = ?').bind(uploaded.id).run();
          }
          return c.json({ error: validation.error }, 400);
        }

        // R2にアップロード
        const fileId = nanoid();
        const objectKey = await uploadToR2(c.env.R2_FILES, fileId, file, {
          folder: 'chat',
          dealId,
          userId,
          contentType: file.type
        });

        // ファイルレコード作成（message_idを関連付け）
        await c.env.DB
          .prepare(`
            INSERT INTO files (id, deal_id, uploader_id, filename, file_type, size_bytes, storage_path, folder, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `)
          .bind(fileId, dealId, userId, sanitized, 'CHAT', file.size, objectKey, 'chat')
          .run();

        // メッセージとファイルの関連付けテーブルに挿入
        await c.env.DB
          .prepare(`
            INSERT INTO message_attachments (message_id, file_id, created_at)
            VALUES (?, ?, datetime('now'))
          `)
          .bind(messageId, fileId)
          .run();

        uploadedFiles.push({
          id: fileId,
          filename: sanitized,
          size: file.size,
          type: file.type,
          url: `/api/r2/download/${fileId}`
        });
      }
    }

    // 新着メッセージ通知（受信者へ - ファイル添付版）
    try {
      const resendApiKey = c.env.RESEND_API_KEY;
      if (resendApiKey) {
        const emailService = createEmailService(resendApiKey);
        const sender = await db.getUserById(userId);
        
        // 送信者以外の関係者に通知
        const recipientId = role === 'ADMIN' ? deal.seller_id : deal.buyer_id;
        const recipient = await db.getUserById(recipientId);
        
        if (recipient?.email) {
          await emailService.sendNewMessageNotification(
            recipient.email,
            deal.title,
            sender?.name || 'Unknown',
            sanitizedContent
          );
          console.log(`New message notification (with attachments) sent to ${recipient.email}`);
        }
      }
    } catch (emailError) {
      console.error('Failed to send new message notification email:', emailError);
    }

    return c.json({
      message: newMessage,
      attachments: uploadedFiles
    }, 201);
  } catch (error) {
    console.error('Create message with attachments error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メッセージの添付ファイル一覧取得
messages.get('/:messageId/attachments', async (c) => {
  try {
    const messageId = c.req.param('messageId');
    
    const { results } = await c.env.DB
      .prepare(`
        SELECT f.* FROM files f
        INNER JOIN message_attachments ma ON f.id = ma.file_id
        WHERE ma.message_id = ? AND f.is_archived = 0
        ORDER BY f.created_at ASC
      `)
      .bind(messageId)
      .all();

    return c.json({
      success: true,
      attachments: results.map((file: any) => ({
        ...file,
        url: `/api/r2/download/${file.id}`
      }))
    });
  } catch (error) {
    console.error('Get attachments error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ユーザーのメンション一覧取得
messages.get('/mentions/me', async (c) => {
  try {
    const userId = c.get('userId') as string;
    
    const { results } = await c.env.DB
      .prepare(`
        SELECT 
          m.id as message_id,
          m.content,
          m.deal_id,
          m.sender_id,
          m.created_at,
          u.name as sender_name,
          u.role as sender_role,
          d.title as deal_title,
          mm.is_notified
        FROM message_mentions mm
        INNER JOIN messages m ON mm.message_id = m.id
        INNER JOIN users u ON m.sender_id = u.id
        INNER JOIN deals d ON m.deal_id = d.id
        WHERE mm.mentioned_user_id = ?
        ORDER BY m.created_at DESC
        LIMIT 50
      `)
      .bind(userId)
      .all();
    
    return c.json({ mentions: results || [] });
  } catch (error) {
    console.error('Get mentions error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メンションを既読にする
messages.post('/mentions/:messageId/mark-read', async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const userId = c.get('userId') as string;
    
    await c.env.DB
      .prepare(`
        UPDATE message_mentions 
        SET is_notified = 1 
        WHERE message_id = ? AND mentioned_user_id = ?
      `)
      .bind(messageId, userId)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Mark mention read error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 案件参加者一覧取得（メンション候補用）
messages.get('/deals/:dealId/participants', async (c) => {
  try {
    const dealId = c.req.param('dealId');
    
    const { results } = await c.env.DB
      .prepare(`
        SELECT DISTINCT u.id, u.name, u.email, u.role
        FROM users u
        INNER JOIN deals d ON (u.id = d.buyer_id OR u.id = d.seller_id)
        WHERE d.id = ?
        UNION
        SELECT DISTINCT u.id, u.name, u.email, u.role
        FROM users u
        INNER JOIN messages m ON u.id = m.sender_id
        WHERE m.deal_id = ?
        ORDER BY name ASC
      `)
      .bind(dealId, dealId)
      .all();
    
    return c.json({ participants: results || [] });
  } catch (error) {
    console.error('Get participants error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default messages;
