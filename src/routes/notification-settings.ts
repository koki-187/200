// Notification Settings API
// Version: v3.66.0

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { Env } from '../types'
import { nanoid } from 'nanoid'

const notificationSettings = new Hono<{ Bindings: Env }>()

// Apply auth middleware to all routes
notificationSettings.use('/*', authMiddleware)

// Get user's notification settings
notificationSettings.get('/', async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env

    const settings = await DB.prepare(`
      SELECT 
        id,
        line_enabled,
        line_webhook_url,
        slack_enabled,
        slack_webhook_url,
        notify_on_deal_create,
        notify_on_deal_update,
        notify_on_message,
        notify_on_status_change,
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
        line_enabled: 0,
        line_webhook_url: null,
        slack_enabled: 0,
        slack_webhook_url: null,
        notify_on_deal_create: 1,
        notify_on_deal_update: 1,
        notify_on_message: 1,
        notify_on_status_change: 1,
        created_at: null,
        updated_at: null
      })
    }

    return c.json(settings)
  } catch (error) {
    console.error('Get notification settings error:', error)
    return c.json({ error: '通知設定の取得に失敗しました' }, 500)
  }
})

// Create or update notification settings
notificationSettings.post('/', async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env
    const body = await c.req.json()

    // Validate webhook URLs
    if (body.line_webhook_url && !body.line_webhook_url.startsWith('https://')) {
      return c.json({ error: 'LINE Webhook URLはHTTPSである必要があります' }, 400)
    }

    if (body.slack_webhook_url && !body.slack_webhook_url.startsWith('https://')) {
      return c.json({ error: 'Slack Webhook URLはHTTPSである必要があります' }, 400)
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
          line_enabled = ?,
          line_webhook_url = ?,
          slack_enabled = ?,
          slack_webhook_url = ?,
          notify_on_deal_create = ?,
          notify_on_deal_update = ?,
          notify_on_message = ?,
          notify_on_status_change = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `)
        .bind(
          body.line_enabled ? 1 : 0,
          body.line_webhook_url || null,
          body.slack_enabled ? 1 : 0,
          body.slack_webhook_url || null,
          body.notify_on_deal_create !== undefined ? (body.notify_on_deal_create ? 1 : 0) : 1,
          body.notify_on_deal_update !== undefined ? (body.notify_on_deal_update ? 1 : 0) : 1,
          body.notify_on_message !== undefined ? (body.notify_on_message ? 1 : 0) : 1,
          body.notify_on_status_change !== undefined ? (body.notify_on_status_change ? 1 : 0) : 1,
          user.id
        )
        .run()

      return c.json({ message: '通知設定を更新しました' })
    } else {
      // Create new settings
      const settingsId = nanoid()
      await DB.prepare(`
        INSERT INTO notification_settings (
          id, user_id,
          line_enabled, line_webhook_url,
          slack_enabled, slack_webhook_url,
          notify_on_deal_create, notify_on_deal_update,
          notify_on_message, notify_on_status_change
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          settingsId,
          user.id,
          body.line_enabled ? 1 : 0,
          body.line_webhook_url || null,
          body.slack_enabled ? 1 : 0,
          body.slack_webhook_url || null,
          body.notify_on_deal_create !== undefined ? (body.notify_on_deal_create ? 1 : 0) : 1,
          body.notify_on_deal_update !== undefined ? (body.notify_on_deal_update ? 1 : 0) : 1,
          body.notify_on_message !== undefined ? (body.notify_on_message ? 1 : 0) : 1,
          body.notify_on_status_change !== undefined ? (body.notify_on_status_change ? 1 : 0) : 1
        )
        .run()

      return c.json({ message: '通知設定を作成しました', id: settingsId }, 201)
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

    // Get user's notification settings
    const settings = await DB.prepare(`
      SELECT 
        line_enabled, line_webhook_url,
        slack_enabled, slack_webhook_url
      FROM notification_settings
      WHERE user_id = ?
    `)
      .bind(user.id)
      .first<{
        line_enabled: number
        line_webhook_url: string | null
        slack_enabled: number
        slack_webhook_url: string | null
      }>()

    if (!settings) {
      return c.json({ error: '通知設定が見つかりません' }, 404)
    }

    // Test message
    const testMessage = {
      type: 'deal_create' as const,
      title: 'テスト通知',
      message: 'これはテスト通知です。通知設定が正しく動作しています。',
      url: 'https://example.com',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    }

    // Send test notification
    let success = false
    if (type === 'line' && settings.line_enabled === 1 && settings.line_webhook_url) {
      const response = await fetch(settings.line_webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              type: 'text',
              text: `🔔 ${testMessage.title}\n\n${testMessage.message}\n\n🔗 ${testMessage.url}`
            }
          ]
        })
      })
      success = response.ok
    } else if (type === 'slack' && settings.slack_enabled === 1 && settings.slack_webhook_url) {
      const response = await fetch(settings.slack_webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `🔔 ${testMessage.title}`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: testMessage.title,
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: testMessage.message
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '詳細を見る',
                    emoji: true
                  },
                  url: testMessage.url,
                  style: 'primary'
                }
              ]
            }
          ]
        })
      })
      success = response.ok
    } else {
      return c.json({ error: `${type}通知が有効になっていません` }, 400)
    }

    if (success) {
      return c.json({ message: 'テスト通知を送信しました' })
    } else {
      return c.json({ error: 'テスト通知の送信に失敗しました' }, 500)
    }
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
