import { Hono } from 'hono'
import type { Context } from 'hono'
import { Database } from '../db/queries'

const notifications = new Hono()

// 通知一覧取得
notifications.get('/', async (c: Context) => {
  try {
    const userId = c.get('userId') as string
    const db = new Database(c.env.DB)
    
    const notificationsList = await db.getNotificationsByUser(userId)
    
    return c.json({ notifications: notificationsList })
  } catch (error: any) {
    console.error('Failed to get notifications:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 未読通知数取得
notifications.get('/unread-count', async (c: Context) => {
  try {
    const userId = c.get('userId') as string
    const db = new Database(c.env.DB)
    
    const count = await db.getUnreadNotificationCount(userId)
    
    return c.json({ count })
  } catch (error: any) {
    console.error('Failed to get unread count:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 通知既読化
notifications.put('/:id/read', async (c: Context) => {
  try {
    const notificationId = c.req.param('id')
    const userId = c.get('userId') as string
    const db = new Database(c.env.DB)
    
    // 通知の所有者チェック
    const notification = await db.getNotificationById(notificationId)
    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404)
    }
    
    if (notification.user_id !== userId) {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    await db.markNotificationAsRead(notificationId)
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('Failed to mark notification as read:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 全ての通知を既読化
notifications.put('/read-all', async (c: Context) => {
  try {
    const userId = c.get('userId') as string
    const db = new Database(c.env.DB)
    
    await db.markAllNotificationsAsRead(userId)
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('Failed to mark all notifications as read:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 通知作成（システム内部用）
notifications.post('/', async (c: Context) => {
  try {
    const role = c.get('userRole') as string
    
    // 管理者権限チェック
    if (role !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const { user_id, deal_id, type, title, message } = await c.req.json()
    const db = new Database(c.env.DB)
    
    const notificationId = await db.createNotification(
      user_id,
      deal_id,
      type,
      title,
      message
    )
    
    return c.json({ 
      notification: { id: notificationId, user_id, deal_id, type, title, message }
    })
  } catch (error: any) {
    console.error('Failed to create notification:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 通知削除
notifications.delete('/:id', async (c: Context) => {
  try {
    const notificationId = c.req.param('id')
    const userId = c.get('userId') as string
    const db = new Database(c.env.DB)
    
    // 通知の所有者チェック
    const notification = await db.getNotificationById(notificationId)
    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404)
    }
    
    if (notification.user_id !== userId) {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    await db.deleteNotification(notificationId)
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete notification:', error)
    return c.json({ error: error.message }, 500)
  }
})

export default notifications
