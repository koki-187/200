import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import { useGet } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

interface Deal {
  id: string
  title: string
  location: string
  nearest_station?: string
  walk_minutes?: string
  land_area?: string
  price?: string
  zoning?: string
  building_coverage?: string
  floor_area_ratio?: string
  fire_zone?: string
  road_info?: string
  frontage?: string
  current_status?: string
  purchase_check_result?: string
  purchase_check_score?: number
}

const DealProposalPage: React.FC = () => {
  const { user } = useAuthStore()
  const { get } = useGet()
  const { success, error: showError } = useToast()
  
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailTemplate, setEmailTemplate] = useState('')
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  
  // URLからdealIdを取得
  const dealId = window.location.pathname.split('/deals/')[1]?.split('/proposal')[0]

  useEffect(() => {
    if (dealId) {
      loadDeal()
    }
  }, [dealId])

  const loadDeal = async () => {
    setLoading(true)
    const result = await get(`/api/deals/${dealId}`)
    if (result.data?.deal) {
      setDeal(result.data.deal)
      generateEmailTemplate(result.data.deal)
    } else if (result.error) {
      showError(result.error)
    }
    setLoading(false)
  }

  const generateEmailTemplate = (dealData: Deal) => {
    const template = `件名: 【物件ご提案】${dealData.location || '物件情報'} のご案内

${user?.name || '担当者'}様

いつもお世話になっております。
不動産ナビゲーターの${user?.name || '担当者'}です。

投資用物件のご紹介をさせていただきます。

━━━━━━━━━━━━━━━━━━━━━━━━━━
【物件概要】
━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 所在地
${dealData.location || '情報なし'}

■ 交通アクセス
${dealData.nearest_station ? `${dealData.nearest_station}駅 徒歩${dealData.walk_minutes || '―'}分` : '情報なし'}

■ 土地面積
${dealData.land_area || '情報なし'}

■ 希望価格
${dealData.price || '情報なし'}

■ 用途地域
${dealData.zoning || '情報なし'}

■ 建蔽率・容積率
建蔽率: ${dealData.building_coverage || '情報なし'}
容積率: ${dealData.floor_area_ratio || '情報なし'}

${dealData.fire_zone ? `■ 防火地域\n${dealData.fire_zone}\n\n` : ''}${dealData.road_info ? `■ 接道情報\n${dealData.road_info}\n\n` : ''}${dealData.frontage ? `■ 間口\n${dealData.frontage}\n\n` : ''}■ 現況
${dealData.current_status || '情報なし'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
【投資ポイント】
━━━━━━━━━━━━━━━━━━━━━━━━━━

${generateInvestmentPoints(dealData)}

━━━━━━━━━━━━━━━━━━━━━━━━━━
【次のステップ】
━━━━━━━━━━━━━━━━━━━━━━━━━━

ご興味がございましたら、下記についてお知らせください：

1. 物件の詳細資料をご希望の場合
2. 現地確認のご希望日時
3. ご質問事項

お忙しいところ恐れ入りますが、
ご検討のほどよろしくお願いいたします。

━━━━━━━━━━━━━━━━━━━━━━━━━━

${user?.name || '担当者'}
不動産ナビゲーター
Email: ${user?.email || 'email@example.com'}
電話: [電話番号]

━━━━━━━━━━━━━━━━━━━━━━━━━━`

    setEmailTemplate(template)
  }

  const generateInvestmentPoints = (dealData: Deal): string => {
    const points: string[] = []
    
    // 立地条件
    if (dealData.nearest_station && dealData.walk_minutes) {
      const walkMinutes = parseInt(dealData.walk_minutes)
      if (walkMinutes <= 5) {
        points.push(`✓ 駅徒歩${walkMinutes}分の好立地！利便性が高く、賃貸需要も期待できます。`)
      } else if (walkMinutes <= 10) {
        points.push(`✓ 駅徒歩${walkMinutes}分のアクセス良好な立地です。`)
      }
    }
    
    // 購入条件チェック結果
    if (dealData.purchase_check_result === 'PASS') {
      points.push(`✓ 購入条件をすべて満たしています（スコア: ${dealData.purchase_check_score}点）`)
    } else if (dealData.purchase_check_result === 'SPECIAL_REVIEW') {
      points.push(`✓ 一部条件は満たしませんが、特別な投資価値があると判断しています。`)
    }
    
    // 用途地域
    if (dealData.zoning) {
      if (dealData.zoning.includes('住居')) {
        points.push(`✓ ${dealData.zoning}に指定されており、住環境として適した地域です。`)
      } else if (dealData.zoning.includes('商業')) {
        points.push(`✓ ${dealData.zoning}に指定されており、商業施設の建築も可能です。`)
      }
    }
    
    // 建蔽率・容積率
    if (dealData.floor_area_ratio) {
      const far = parseInt(dealData.floor_area_ratio.replace('%', ''))
      if (far >= 200) {
        points.push(`✓ 容積率${dealData.floor_area_ratio}で、高い建築ボリュームが確保できます。`)
      }
    }
    
    // 現況
    if (dealData.current_status) {
      if (dealData.current_status.includes('更地')) {
        points.push(`✓ 更地のため、すぐに建築着手が可能です。`)
      } else if (dealData.current_status.includes('古家')) {
        points.push(`✓ 古家付きですが、解体後の新築計画がスムーズに進められます。`)
      }
    }
    
    if (points.length === 0) {
      points.push('✓ 詳細は資料をご確認ください。')
    }
    
    return points.join('\n')
  }

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section)
      success('クリップボードにコピーしました')
      setTimeout(() => setCopiedSection(null), 2000)
    }).catch(() => {
      showError('コピーに失敗しました')
    })
  }

  const generateShortSummary = (): string => {
    if (!deal) return ''
    
    return `【物件概要】
所在地: ${deal.location || '―'}
交通: ${deal.nearest_station ? `${deal.nearest_station}駅徒歩${deal.walk_minutes || '―'}分` : '―'}
土地面積: ${deal.land_area || '―'}
価格: ${deal.price || '―'}
用途地域: ${deal.zoning || '―'}
現況: ${deal.current_status || '―'}`
  }

  const generateWhatsAppMessage = (): string => {
    if (!deal) return ''
    
    return `🏠 *物件ご提案*

📍 *所在地*
${deal.location || '―'}

🚃 *交通*
${deal.nearest_station ? `${deal.nearest_station}駅徒歩${deal.walk_minutes || '―'}分` : '―'}

📐 *土地面積*
${deal.land_area || '―'}

💰 *価格*
${deal.price || '―'}

詳細はメールでお送りします。
ご興味がございましたらお知らせください。`
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </Layout>
    )
  }

  if (!deal) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">案件が見つかりません</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">買主打診サポート</h1>
              <p className="text-sm text-gray-600 mt-1">
                {deal.title || deal.location}
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← 戻る
            </button>
          </div>
        </div>

        {/* Quick Copy Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => copyToClipboard(generateShortSummary(), 'short')}
            className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-900">📋 簡易サマリー</span>
              {copiedSection === 'short' && (
                <span className="text-green-600 text-sm">✓ コピー済み</span>
              )}
            </div>
            <p className="text-sm text-blue-700">
              チャットやメッセージアプリに最適
            </p>
          </button>

          <button
            onClick={() => copyToClipboard(generateWhatsAppMessage(), 'whatsapp')}
            className="bg-green-50 border-2 border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-green-900">💬 WhatsApp形式</span>
              {copiedSection === 'whatsapp' && (
                <span className="text-green-600 text-sm">✓ コピー済み</span>
              )}
            </div>
            <p className="text-sm text-green-700">
              絵文字付きの見やすいフォーマット
            </p>
          </button>

          <button
            onClick={() => copyToClipboard(emailTemplate, 'email')}
            className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-purple-900">📧 正式メール</span>
              {copiedSection === 'email' && (
                <span className="text-green-600 text-sm">✓ コピー済み</span>
              )}
            </div>
            <p className="text-sm text-purple-700">
              詳細情報を含む完全版
            </p>
          </button>
        </div>

        {/* Email Template Preview */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">メールテンプレート プレビュー</h2>
            <p className="text-sm text-gray-600 mt-1">
              このテンプレートをコピーしてメールソフトに貼り付けてください
            </p>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {emailTemplate}
              </pre>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => copyToClipboard(emailTemplate, 'email-full')}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
              >
                📋 全文をコピー
              </button>
              <button
                onClick={() => {
                  const textarea = document.createElement('textarea')
                  textarea.value = emailTemplate
                  document.body.appendChild(textarea)
                  textarea.select()
                  document.execCommand('copy')
                  document.body.removeChild(textarea)
                  
                  // メールアプリを開く（一部のブラウザで動作）
                  const subject = encodeURIComponent(`【物件ご提案】${deal.location || '物件情報'} のご案内`)
                  const body = encodeURIComponent(emailTemplate)
                  window.location.href = `mailto:?subject=${subject}&body=${body}`
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
              >
                📨 メールアプリで開く
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">💡 活用のヒント</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>チャットには「簡易サマリー」、正式提案には「正式メール」を使い分けましょう</li>
                  <li>WhatsApp形式は絵文字で見やすく、SNSやメッセージアプリに最適です</li>
                  <li>メールテンプレートは自由に編集してから送信してください</li>
                  <li>買主の関心事項に合わせて投資ポイントをカスタマイズすると効果的です</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default DealProposalPage
