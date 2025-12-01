// Notification Settings API
// Version: v3.66.0

import { Hono } from 'hono'
import { authMiddleware } from '../utils/auth'
import { Env } from '../types'

const notificationSettings = new Hono<{ Bindings: Env }>()

// Apply auth middleware to all routes
notificationSettings.use('/*', authMiddleware)

// Get user's notification settings
notificationSettings.get('/', async (c) => {
  try {
    const user = c.get('user')
    
    if (!user || !user.id) {
      console.error('User not found in context')
      return c.json({ error: 'ユーザー情報が取得できませんでした' }, 401)
    }

    const { DB } = c.env

    const settings = await DB.prepare(`
      SELECT 
        id,
        email_on_new_deal,
        email_on_deal_update,
        email_on_new_message,
        email_on_mention,
        email_on_task_assigned,
        email_digest_frequency,
        push_on_new_message,
        push_on_mention,
        push_on_task_due,
        created_at,
        updated_at
      FROM notification_settings
      WHERE user_id = ?
    `)
      .bind(user.id)
      .first()

    if (!settings) {
      // Return default settings if not configured
      return c.json({
        id: null,
        email_on_new_deal: 1,
        email_on_deal_update: 1,
        email_on_new_message: 1,
        email_on_mention: 1,
        email_on_task_assigned: 1,
        email_digest_frequency: 'daily',
        push_on_new_message: 0,
        push_on_mention: 0,
        push_on_task_due: 0,
        created_at: null,
        updated_at: null
      })
    }

    return c.json(settings)
  } catch (error) {
    console.error('Get notification settings error:', error)
    return c.json({ 
      error: '通知設定の取得に失敗しました', 
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// Create or update notification settings
notificationSettings.post('/', async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env
    const body = await c.req.json()

    // Validate email digest frequency
    if (body.email_digest_frequency && !['none', 'daily', 'weekly'].includes(body.email_digest_frequency)) {
      return c.json({ error: 'メール送信頻度は none, daily, weekly のいずれかである必要があります' }, 400)
    }

    // Check if settings already exist
    const existingSettings = await DB.prepare(`
      SELECT id FROM notification_settings WHERE user_id = ?
    `)
      .bind(user.id)
      .first()

    if (existingSettings) {
      // Update existing settings
      await DB.prepare(`
        UPDATE notification_settings
        SET
          email_on_new_deal = ?,
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
      `)
        .bind(
          body.email_on_new_deal !== undefined ? (body.email_on_new_deal ? 1 : 0) : 1,
          body.email_on_deal_update !== undefined ? (body.email_on_deal_update ? 1 : 0) : 1,
          body.email_on_new_message !== undefined ? (body.email_on_new_message ? 1 : 0) : 1,
          body.email_on_mention !== undefined ? (body.email_on_mention ? 1 : 0) : 1,
          body.email_on_task_assigned !== undefined ? (body.email_on_task_assigned ? 1 : 0) : 1,
          body.email_digest_frequency || 'daily',
          body.push_on_new_message !== undefined ? (body.push_on_new_message ? 1 : 0) : 0,
          body.push_on_mention !== undefined ? (body.push_on_mention ? 1 : 0) : 0,
          body.push_on_task_due !== undefined ? (body.push_on_task_due ? 1 : 0) : 0,
          user.id
        )
        .run()

      return c.json({ message: '通知設定を更新しました' })
    } else {
      // Create new settings
      await DB.prepare(`
        INSERT INTO notification_settings (
          user_id,
          email_on_new_deal, email_on_deal_update,
          email_on_new_message, email_on_mention,
          email_on_task_assigned, email_digest_frequency,
          push_on_new_message, push_on_mention, push_on_task_due
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          user.id,
          body.email_on_new_deal !== undefined ? (body.email_on_new_deal ? 1 : 0) : 1,
          body.email_on_deal_update !== undefined ? (body.email_on_deal_update ? 1 : 0) : 1,
          body.email_on_new_message !== undefined ? (body.email_on_new_message ? 1 : 0) : 1,
          body.email_on_mention !== undefined ? (body.email_on_mention ? 1 : 0) : 1,
          body.email_on_task_assigned !== undefined ? (body.email_on_task_assigned ? 1 : 0) : 1,
          body.email_digest_frequency || 'daily',
          body.push_on_new_message !== undefined ? (body.push_on_new_message ? 1 : 0) : 0,
          body.push_on_mention !== undefined ? (body.push_on_mention ? 1 : 0) : 0,
          body.push_on_task_due !== undefined ? (body.push_on_task_due ? 1 : 0) : 0
        )
        .run()

      const newSettings = await DB.prepare(`
        SELECT id FROM notification_settings WHERE user_id = ?
      `).bind(user.id).first<{ id: number }>()

      return c.json({ message: '通知設定を作成しました', id: newSettings?.id }, 201)
    }
  } catch (error) {
    console.error('Save notification settings error:', error)
    return c.json({ error: '通知設定の保存に失敗しました' }, 500)
  }
})

// Test notification (send test message to verify setup)
notificationSettings.post('/test', async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env
    const body = await c.req.json()
    const { type } = body // 'line' or 'slack'

    if (!type || !['line', 'slack'].includes(type)) {
      return c.json({ error: '通知タイプを指定してください（line または slack）' }, 400)
    }

    // Test notification is not supported in current schema
    // This endpoint would need external notification service integration
    return c.json({ 
      message: 'テスト通知機能は現在のスキーマではサポートされていません。',
      info: 'この機能を使用するには、LINE/Slack統合の設定が必要です。'
    }, 501)
  } catch (error) {
    console.error('Test notification error:', error)
    return c.json({ error: 'テスト通知の送信中にエラーが発生しました' }, 500)
  }
})

// Delete notification settings
notificationSettings.delete('/', async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env

    await DB.prepare(`
      DELETE FROM notification_settings WHERE user_id = ?
    `)
      .bind(user.id)
      .run()

    return c.json({ message: '通知設定を削除しました' })
  } catch (error) {
    console.error('Delete notification settings error:', error)
    return c.json({ error: '通知設定の削除に失敗しました' }, 500)
  }
})

export default notificationSettings
