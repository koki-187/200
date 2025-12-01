import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import { useGet, usePost } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

interface Deal {
  id: string
  title: string
  location: string
  nearest_station?: string
  walk_minutes?: string
  land_area?: string
  building_area?: string
  zoning?: string
  building_coverage?: string
  floor_area_ratio?: string
  fire_zone?: string
  road_info?: string
  frontage?: string
  current_status?: string
  price?: string
  description?: string
  status: string
  seller_id?: string
  buyer_id?: string
  purchase_check_result?: string
  purchase_check_score?: number
  is_special_case?: boolean
  created_at: string
  updated_at: string
}

interface BuildingRegulation {
  category: string
  title: string
  article: string
  description: string
}

interface PurchaseCriteriaResult {
  overall_result: 'PASS' | 'FAIL' | 'SPECIAL_REVIEW'
  check_score: number
  passed_conditions: string[]
  failed_conditions: { condition: string; actual: string; required: string }[]
}

const DealDetailPage: React.FC = () => {
  const { user } = useAuthStore()
  const { get } = useGet()
  const { post, loading: submitting } = usePost()
  const { success, error } = useToast()
  
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [buildingRegulations, setBuildingRegulations] = useState<BuildingRegulation[]>([])
  const [purchaseCheck, setPurchaseCheck] = useState<PurchaseCriteriaResult | null>(null)
  const [showSpecialCaseModal, setShowSpecialCaseModal] = useState(false)
  const [specialCaseReason, setSpecialCaseReason] = useState('')
  
  // URLからdealIdを取得
  const dealId = window.location.pathname.split('/deals/')[1]

  useEffect(() => {
    if (dealId) {
      loadDeal()
    }
  }, [dealId])

  const loadDeal = async () => {
    setLoading(true)
    const result = await get(`/api/deals/${dealId}`)
    if (result.data) {
      setDeal(result.data)
      
      // 建築基準法情報を取得
      if (result.data.location && result.data.zoning) {
        loadBuildingRegulations(result.data)
      }
      
      // 購入条件チェック結果を取得
      if (result.data.purchase_check_result) {
        loadPurchaseCheck()
      }
    } else if (result.error) {
      error(result.error)
    }
    setLoading(false)
  }

  const loadBuildingRegulations = async (dealData: Deal) => {
    const params = new URLSearchParams({
      location: dealData.location,
      zoning: dealData.zoning || '',
      fire_zone: dealData.fire_zone || '',
      current_status: dealData.current_status || ''
    })
    
    const result = await get(`/api/building-regulations/check?${params.toString()}`)
    if (result.data && result.data.applicable_regulations) {
      setBuildingRegulations(result.data.applicable_regulations)
    }
  }

  const loadPurchaseCheck = async () => {
    const result = await get(`/api/purchase-criteria/check/${dealId}`)
    if (result.data) {
      setPurchaseCheck(result.data)
    }
  }

  const handleSpecialCaseSubmit = async () => {
    if (!specialCaseReason.trim()) {
      error('申請理由を入力してください')
      return
    }
    
    const result = await post('/api/purchase-criteria/special-case', {
      deal_id: dealId,
      reason: specialCaseReason
    })
    
    if (result.data) {
      success('特別案件として申請しました。管理者の承認をお待ちください。')
      setShowSpecialCaseModal(false)
      setSpecialCaseReason('')
      loadDeal() // リロードして最新状態を取得
    } else if (result.error) {
      error(result.error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      NEW: 'bg-blue-100 text-blue-800',
      RESPONDING: 'bg-yellow-100 text-yellow-800',
      NEGOTIATING: 'bg-purple-100 text-purple-800',
      CONTRACTED: 'bg-green-100 text-green-800',
      DECLINED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    }
    
    const labels = {
      NEW: '新規',
      RESPONDING: '回答中',
      NEGOTIATING: '交渉中',
      CONTRACTED: '契約済',
      DECLINED: '辞退',
      CANCELLED: 'キャンセル'
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getPurchaseResultBadge = (result: string) => {
    const styles = {
      PASS: 'bg-green-100 text-green-800 border-green-300',
      FAIL: 'bg-red-100 text-red-800 border-red-300',
      SPECIAL_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
    
    const labels = {
      PASS: '条件適合',
      FAIL: '条件非該当',
      SPECIAL_REVIEW: '要検討'
    }
    
    return (
      <span className={`px-4 py-2 text-base font-bold rounded-lg border-2 ${styles[result as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
        {labels[result as keyof typeof labels] || result}
      </span>
    )
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* ヘッダー */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">{deal.title}</h1>
            {getStatusBadge(deal.status)}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
            <span>案件ID: {deal.id}</span>
            <span>登録日: {new Date(deal.created_at).toLocaleDateString('ja-JP')}</span>
          </div>
        </div>

        {/* 購入条件チェック結果 */}
        {purchaseCheck && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">購入条件チェック結果</h2>
              {getPurchaseResultBadge(purchaseCheck.overall_result)}
            </div>
            
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">総合スコア:</span>
                <span className="text-xl sm:text-2xl font-bold text-indigo-600">{purchaseCheck.check_score}点</span>
                <span className="text-xs sm:text-sm text-gray-500">/ 100点</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    purchaseCheck.check_score >= 80 ? 'bg-green-500' :
                    purchaseCheck.check_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${purchaseCheck.check_score}%` }}
                />
              </div>
            </div>

            {purchaseCheck.passed_conditions.length > 0 && (
              <div className="mb-3 sm:mb-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">✅ 適合条件 ({purchaseCheck.passed_conditions.length}件)</h3>
                <ul className="space-y-1">
                  {purchaseCheck.passed_conditions.map((condition, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-gray-700 pl-4 break-words">• {condition}</li>
                  ))}
                </ul>
              </div>
            )}

            {purchaseCheck.failed_conditions.length > 0 && (
              <div className="mb-3 sm:mb-4">
                <h3 className="text-sm font-medium text-red-800 mb-2">❌ 非適合条件 ({purchaseCheck.failed_conditions.length}件)</h3>
                <ul className="space-y-2">
                  {purchaseCheck.failed_conditions.map((condition, idx) => (
                    <li key={idx} className="text-xs sm:text-sm bg-red-50 p-3 rounded border border-red-200">
                      <div className="font-medium text-red-900 break-words">{condition.condition}</div>
                      <div className="text-red-700 mt-1 break-words">
                        実際: <span className="font-semibold">{condition.actual}</span> / 
                        必要: <span className="font-semibold">{condition.required}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 特別案件申請ボタン */}
            {purchaseCheck.overall_result !== 'PASS' && !deal.is_special_case && user?.role === 'AGENT' && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowSpecialCaseModal(true)}
                  className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 font-medium text-sm sm:text-base min-h-[44px]"
                >
                  🌟 特別案件として申請する
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  ※ クライテリア非該当でも、特別な事情がある場合は管理者に承認申請できます
                </p>
              </div>
            )}

            {deal.is_special_case && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⏳ 特別案件として申請済みです。管理者の承認をお待ちください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 建築基準法情報 */}
        {buildingRegulations.length > 0 && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center mb-3 sm:mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">建築基準法・条例情報</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full self-start">
                自動検出
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              所在地と用途地域に基づき、適用される可能性のある法規制を表示しています。
            </p>
            <div className="space-y-3">
              {buildingRegulations.map((reg, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-semibold text-sm">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                          {reg.category}
                        </span>
                        <h3 className="text-sm font-semibold text-gray-900">{reg.title}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{reg.article}</p>
                      <p className="text-sm text-gray-700">{reg.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 基本情報 */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">基本情報</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {deal.location && (
              <div>
                <dt className="text-xs sm:text-sm font-medium text-gray-500">所在地</dt>
                <dd className="mt-1 text-sm sm:text-base text-gray-900 break-words">{deal.location}</dd>
              </div>
            )}
            {deal.nearest_station && (
              <div>
                <dt className="text-sm font-medium text-gray-500">最寄駅</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {deal.nearest_station}
                  {deal.walk_minutes && ` 徒歩${deal.walk_minutes}分`}
                </dd>
              </div>
            )}
            {deal.land_area && (
              <div>
                <dt className="text-sm font-medium text-gray-500">土地面積</dt>
                <dd className="mt-1 text-sm text-gray-900">{deal.land_area}</dd>
              </div>
            )}
            {deal.building_area && (
              <div>
                <dt className="text-sm font-medium text-gray-500">建物面積</dt>
                <dd className="mt-1 text-sm text-gray-900">{deal.building_area}</dd>
              </div>
            )}
            {deal.price && (
              <div>
                <dt className="text-sm font-medium text-gray-500">希望価格</dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold text-indigo-600">{deal.price}</dd>
              </div>
            )}
            {deal.zoning && (
              <div>
                <dt className="text-sm font-medium text-gray-500">用途地域</dt>
                <dd className="mt-1 text-sm text-gray-900">{deal.zoning}</dd>
              </div>
            )}
            {deal.building_coverage && (
              <div>
                <dt className="text-sm font-medium text-gray-500">建蔽率</dt>
                <dd className="mt-1 text-sm text-gray-900">{deal.building_coverage}</dd>
              </div>
            )}
            {deal.floor_area_ratio && (
              <div>
                <dt className="text-sm font-medium text-gray-500">容積率</dt>
                <dd className="mt-1 text-sm text-gray-900">{deal.floor_area_ratio}</dd>
              </div>
            )}
            {deal.fire_zone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">防火地域</dt>
                <dd className="mt-1 text-sm text-gray-900">{deal.fire_zone}</dd>
              </div>
            )}
            {deal.road_info && (
              <div>
                <dt className="text-sm font-medium text-gray-500">接道情報</dt>
                <dd className="mt-1 text-sm text-gray-900">{deal.road_info}</dd>
              </div>
            )}
            {deal.frontage && (
              <div>
                <dt className="text-sm font-medium text-gray-500">間口</dt>
                <dd className="mt-1 text-sm text-gray-900">{deal.frontage}</dd>
              </div>
            )}
            {deal.current_status && (
              <div>
                <dt className="text-sm font-medium text-gray-500">現況</dt>
                <dd className="mt-1 text-sm text-gray-900">{deal.current_status}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* 備考 */}
        {deal.description && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">備考</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{deal.description}</p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ← 一覧に戻る
          </button>
          {(user?.role === 'ADMIN' || user?.role === 'AGENT') && (
            <>
              <a
                href={`/deals/${dealId}/simulator`}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                📊 投資シミュレーター
              </a>
              <a
                href={`/deals/${dealId}/proposal`}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                📧 買主へ打診する
              </a>
            </>
          )}
        </div>
      </div>

      {/* 特別案件申請モーダル */}
      {showSpecialCaseModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowSpecialCaseModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  特別案件申請
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  購入条件を満たしていない理由と、それでも検討すべき特別な事情を記入してください。
                </p>
                <textarea
                  value={specialCaseReason}
                  onChange={(e) => setSpecialCaseReason(e.target.value)}
                  rows={6}
                  placeholder="例: 交通の便が良く、駅徒歩5分という立地条件が優れているため、間口が若干基準を下回るものの、十分に投資価値があると判断しました。周辺環境も良好で、将来的な資産価値の上昇が期待できます。"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSpecialCaseSubmit}
                  disabled={submitting || !specialCaseReason.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? '申請中...' : '申請する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSpecialCaseModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default DealDetailPage
