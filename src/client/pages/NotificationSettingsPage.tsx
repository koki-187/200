import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import { useGet, usePost, useDelete } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

interface NotificationSettings {
  id: string | null
  line_enabled: number
  line_webhook_url: string | null
  slack_enabled: number
  slack_webhook_url: string | null
  notify_on_deal_create: number
  notify_on_deal_update: number
  notify_on_message: number
  notify_on_status_change: number
  created_at: string | null
  updated_at: string | null
}

const NotificationSettingsPage: React.FC = () => {
  const { user } = useAuthStore()
  const { get, loading: loadingGet } = useGet<NotificationSettings>()
  const { post, loading: loadingPost } = usePost()
  const { delete: deleteSettings, loading: loadingDelete } = useDelete()
  const { success, error } = useToast()

  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [lineEnabled, setLineEnabled] = useState(false)
  const [lineWebhookUrl, setLineWebhookUrl] = useState('')
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')
  const [notifyOnDealCreate, setNotifyOnDealCreate] = useState(true)
  const [notifyOnDealUpdate, setNotifyOnDealUpdate] = useState(true)
  const [notifyOnMessage, setNotifyOnMessage] = useState(true)
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true)
  const [showLineHelp, setShowLineHelp] = useState(false)
  const [showSlackHelp, setShowSlackHelp] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const result = await get('/api/notification-settings')
    if (result.data) {
      setSettings(result.data)
      setLineEnabled(result.data.line_enabled === 1)
      setLineWebhookUrl(result.data.line_webhook_url || '')
      setSlackEnabled(result.data.slack_enabled === 1)
      setSlackWebhookUrl(result.data.slack_webhook_url || '')
      setNotifyOnDealCreate(result.data.notify_on_deal_create === 1)
      setNotifyOnDealUpdate(result.data.notify_on_deal_update === 1)
      setNotifyOnMessage(result.data.notify_on_message === 1)
      setNotifyOnStatusChange(result.data.notify_on_status_change === 1)
    } else if (result.error) {
      error(result.error)
    }
  }

  const handleSave = async () => {
    // Validation
    if (lineEnabled && !lineWebhookUrl) {
      error('LINE通知を有効にする場合は、Webhook URLを入力してください')
      return
    }

    if (slackEnabled && !slackWebhookUrl) {
      error('Slack通知を有効にする場合は、Webhook URLを入力してください')
      return
    }

    const result = await post('/api/notification-settings', {
      line_enabled: lineEnabled,
      line_webhook_url: lineWebhookUrl || null,
      slack_enabled: slackEnabled,
      slack_webhook_url: slackWebhookUrl || null,
      notify_on_deal_create: notifyOnDealCreate,
      notify_on_deal_update: notifyOnDealUpdate,
      notify_on_message: notifyOnMessage,
      notify_on_status_change: notifyOnStatusChange
    })

    if (result.data) {
      success(result.data.message || '通知設定を保存しました')
      loadSettings() // Reload settings
    } else if (result.error) {
      error(result.error)
    }
  }

  const handleTestNotification = async (type: 'line' | 'slack') => {
    const result = await post('/api/notification-settings/test', { type })
    
    if (result.data) {
      success(result.data.message || 'テスト通知を送信しました')
    } else if (result.error) {
      error(result.error)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('通知設定を削除してもよろしいですか？')) {
      return
    }

    const result = await deleteSettings('/api/notification-settings')
    
    if (result.data) {
      success('通知設定を削除しました')
      // Reset form
      setLineEnabled(false)
      setLineWebhookUrl('')
      setSlackEnabled(false)
      setSlackWebhookUrl('')
      setNotifyOnDealCreate(true)
      setNotifyOnDealUpdate(true)
      setNotifyOnMessage(true)
      setNotifyOnStatusChange(true)
      loadSettings()
    } else if (result.error) {
      error(result.error)
    }
  }

  if (loadingGet) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">通知設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            LINE NotifyやSlackで案件の更新通知を受け取ることができます
          </p>
        </div>

        {/* LINE Notify Settings */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-900">LINE Notify</h2>
              <button
                onClick={() => setShowLineHelp(!showLineHelp)}
                className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                ❓ 設定方法
              </button>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={lineEnabled}
                onChange={(e) => setLineEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {showLineHelp && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <h3 className="font-semibold text-blue-900 mb-2">LINE Notify設定方法</h3>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li><a href="https://notify-bot.line.me/" target="_blank" rel="noopener noreferrer" className="underline">LINE Notifyのサイト</a>にアクセス</li>
                <li>「マイページ」→「トークンを発行する」をクリック</li>
                <li>トークン名を入力し、送信先のトークルームを選択</li>
                <li>発行されたトークンを下のフィールドに貼り付け</li>
              </ol>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL（アクセストークン）
              </label>
              <input
                type="text"
                value={lineWebhookUrl}
                onChange={(e) => setLineWebhookUrl(e.target.value)}
                disabled={!lineEnabled}
                placeholder="https://notify-api.line.me/api/notify または トークン"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                LINE Notifyのアクセストークンを入力してください
              </p>
            </div>

            {lineEnabled && lineWebhookUrl && (
              <button
                onClick={() => handleTestNotification('line')}
                disabled={loadingPost}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[44px]"
              >
                📤 テスト通知を送信
              </button>
            )}
          </div>
        </div>

        {/* Slack Settings */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-900">Slack</h2>
              <button
                onClick={() => setShowSlackHelp(!showSlackHelp)}
                className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                ❓ 設定方法
              </button>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={slackEnabled}
                onChange={(e) => setSlackEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {showSlackHelp && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg text-sm">
              <h3 className="font-semibold text-purple-900 mb-2">Slack Webhook設定方法</h3>
              <ol className="list-decimal list-inside space-y-1 text-purple-800">
                <li><a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">Slack API</a>にアクセス</li>
                <li>「Create New App」→「From scratch」を選択</li>
                <li>App名とWorkspaceを選択して作成</li>
                <li>「Incoming Webhooks」を有効化</li>
                <li>「Add New Webhook to Workspace」で投稿先チャンネルを選択</li>
                <li>発行されたWebhook URLを下のフィールドに貼り付け</li>
              </ol>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                type="text"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                disabled={!slackEnabled}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Slack Incoming WebhookのURLを入力してください
              </p>
            </div>

            {slackEnabled && slackWebhookUrl && (
              <button
                onClick={() => handleTestNotification('slack')}
                disabled={loadingPost}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[44px]"
              >
                📤 テスト通知を送信
              </button>
            )}
          </div>
        </div>

        {/* Notification Types */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">通知タイプ</h2>
          <p className="text-sm text-gray-600 mb-4">
            受け取りたい通知の種類を選択してください
          </p>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifyOnDealCreate}
                onChange={(e) => setNotifyOnDealCreate(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-5 w-5"
              />
              <span className="ml-3 text-sm text-gray-700">
                <span className="font-medium">新規案件作成</span> - 新しい案件が登録されたとき
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifyOnDealUpdate}
                onChange={(e) => setNotifyOnDealUpdate(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-5 w-5"
              />
              <span className="ml-3 text-sm text-gray-700">
                <span className="font-medium">案件更新</span> - 案件情報が更新されたとき
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifyOnMessage}
                onChange={(e) => setNotifyOnMessage(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-5 w-5"
              />
              <span className="ml-3 text-sm text-gray-700">
                <span className="font-medium">新着メッセージ</span> - 案件に新しいメッセージが投稿されたとき
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifyOnStatusChange}
                onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-5 w-5"
              />
              <span className="ml-3 text-sm text-gray-700">
                <span className="font-medium">ステータス変更</span> - 案件のステータスが変更されたとき
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSave}
            disabled={loadingPost}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium min-h-[44px]"
          >
            {loadingPost ? '保存中...' : '💾 設定を保存'}
          </button>

          <button
            onClick={() => window.history.back()}
            className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium min-h-[44px]"
          >
            ← 戻る
          </button>

          {settings?.id && (
            <button
              onClick={handleDelete}
              disabled={loadingDelete}
              className="flex-1 sm:flex-none px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium min-h-[44px]"
            >
              {loadingDelete ? '削除中...' : '🗑️ 設定を削除'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default NotificationSettingsPage
