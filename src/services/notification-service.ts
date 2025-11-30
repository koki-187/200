// Notification Service for LINE/Slack Integration
// Version: v3.66.0

import { Env } from '../types'

// Notification types
export type NotificationType = 'deal_create' | 'deal_update' | 'message' | 'status_change'

// Notification message structure
export interface NotificationMessage {
  type: NotificationType
  title: string
  message: string
  url?: string
  user?: {
    id: string
    name: string
    email: string
  }
  deal?: {
    id: string
    title: string
    status?: string
  }
}

// Notification settings from database
export interface NotificationSettings {
  line_enabled: number
  line_webhook_url: string | null
  slack_enabled: number
  slack_webhook_url: string | null
  notify_on_deal_create: number
  notify_on_deal_update: number
  notify_on_message: number
  notify_on_status_change: number
}

// Check if notification should be sent for this type
function shouldNotify(settings: NotificationSettings, type: NotificationType): boolean {
  switch (type) {
    case 'deal_create':
      return settings.notify_on_deal_create === 1
    case 'deal_update':
      return settings.notify_on_deal_update === 1
    case 'message':
      return settings.notify_on_message === 1
    case 'status_change':
      return settings.notify_on_status_change === 1
    default:
      return false
  }
}

// Send LINE notification
async function sendLineNotification(webhookUrl: string, message: NotificationMessage): Promise<boolean> {
  try {
    const lineMessage = {
      type: 'text',
      text: `🔔 ${message.title}\n\n${message.message}${message.url ? `\n\n🔗 ${message.url}` : ''}`
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [lineMessage]
      })
    })

    return response.ok
  } catch (error) {
    console.error('LINE notification error:', error)
    return false
  }
}

// Send Slack notification
async function sendSlackNotification(webhookUrl: string, message: NotificationMessage): Promise<boolean> {
  try {
    const slackMessage = {
      text: `🔔 ${message.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: message.title,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message.message
          }
        }
      ]
    }

    // Add deal info if available
    if (message.deal) {
      slackMessage.blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*案件:*\n${message.deal.title}`
          },
          {
            type: 'mrkdwn',
            text: `*ステータス:*\n${message.deal.status || 'N/A'}`
          }
        ]
      })
    }

    // Add user info if available
    if (message.user) {
      slackMessage.blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*ユーザー:*\n${message.user.name}`
          },
          {
            type: 'mrkdwn',
            text: `*メール:*\n${message.user.email}`
          }
        ]
      })
    }

    // Add URL button if available
    if (message.url) {
      slackMessage.blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '詳細を見る',
              emoji: true
            },
            url: message.url,
            style: 'primary'
          }
        ]
      })
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    })

    return response.ok
  } catch (error) {
    console.error('Slack notification error:', error)
    return false
  }
}

// Main function to send notifications to a user
export async function sendNotificationToUser(
  env: Env,
  userId: string,
  message: NotificationMessage
): Promise<{ line: boolean; slack: boolean }> {
  const result = { line: false, slack: false }

  try {
    // Get user's notification settings
    const settings = await env.DB.prepare(`
      SELECT 
        line_enabled, line_webhook_url,
        slack_enabled, slack_webhook_url,
        notify_on_deal_create, notify_on_deal_update,
        notify_on_message, notify_on_status_change
      FROM notification_settings
      WHERE user_id = ?
    `)
      .bind(userId)
      .first<NotificationSettings>()

    if (!settings) {
      console.log(`No notification settings found for user ${userId}`)
      return result
    }

    // Check if this type of notification should be sent
    if (!shouldNotify(settings, message.type)) {
      console.log(`Notification type ${message.type} disabled for user ${userId}`)
      return result
    }

    // Send LINE notification if enabled
    if (settings.line_enabled === 1 && settings.line_webhook_url) {
      result.line = await sendLineNotification(settings.line_webhook_url, message)
    }

    // Send Slack notification if enabled
    if (settings.slack_enabled === 1 && settings.slack_webhook_url) {
      result.slack = await sendSlackNotification(settings.slack_webhook_url, message)
    }

    return result
  } catch (error) {
    console.error('Notification service error:', error)
    return result
  }
}

// Send notifications to multiple users
export async function sendNotificationToUsers(
  env: Env,
  userIds: string[],
  message: NotificationMessage
): Promise<Record<string, { line: boolean; slack: boolean }>> {
  const results: Record<string, { line: boolean; slack: boolean }> = {}

  for (const userId of userIds) {
    results[userId] = await sendNotificationToUser(env, userId, message)
  }

  return results
}
