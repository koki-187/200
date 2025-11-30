import { Hono, Context } from 'hono';
import { nanoid } from 'nanoid';
import { authMiddleware } from '../utils/auth';

const notifications = new Hono();

// Apply auth middleware to all routes
notifications.use('/*', authMiddleware);

// Get user notifications (with unread count)
notifications.get('/', async (c: Context) => {
  try {
    const userId = c.get('userId');
    
    // Get unread count
    const unreadCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).bind(userId).first<{ count: number }>();

    // Get recent notifications (last 50)
    const notificationsList = await c.env.DB.prepare(
      `SELECT id, type, title, message, link, is_read, created_at 
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`
    ).bind(userId).all();

    return c.json({
      unreadCount: unreadCount?.count || 0,
      notifications: notificationsList.results || []
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Mark notification as read
notifications.put('/:id/read', async (c: Context) => {
  try {
    const notificationId = c.req.param('id');
    const userId = c.get('userId');

    await c.env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).bind(notificationId, userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Mark all notifications as read
notifications.put('/read-all', async (c: Context) => {
  try {
    const userId = c.get('userId');

    await c.env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).bind(userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create notification (internal use)
export async function createNotification(
  db: D1Database,
  userId: string,
  type: 'NEW_DEAL' | 'DEADLINE' | 'MESSAGE' | 'STATUS_CHANGE',
  title: string,
  message: string,
  link?: string
) {
  const notificationId = nanoid();
  
  try {
    await db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, link, deal_id, channel, payload, sent_at, is_read, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NULL, 'system', '{}', datetime('now'), 0, datetime('now'))`
    ).bind(notificationId, userId, type, title, message, link || '').run();

    console.log(`✅ Notification created for user ${userId}: ${title}`);
    return { success: true, notificationId };
  } catch (error) {
    console.error(`❌ Failed to create notification for user ${userId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export default notifications;
