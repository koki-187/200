import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import { useGet, usePost } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

interface SpecialCase {
  id: string
  deal_id: string
  deal_title: string
  applicant_id: string
  applicant_name: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  reviewed_at?: string
  reviewer_id?: string
  review_comment?: string
}

const SpecialCasesPage: React.FC = () => {
  const { user } = useAuthStore()
  const { get } = useGet()
  const { post, loading: submitting } = usePost()
  const { success, error } = useToast()
  
  const [specialCases, setSpecialCases] = useState<SpecialCase[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [selectedCase, setSelectedCase] = useState<SpecialCase | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED')

  useEffect(() => {
    loadSpecialCases()
  }, [])

  const loadSpecialCases = async () => {
    setLoading(true)
    const result = await get('/api/purchase-criteria/special-cases')
    if (result.data && result.data.special_cases) {
      setSpecialCases(result.data.special_cases)
    } else if (result.error) {
      error(result.error)
    }
    setLoading(false)
  }

  const handleReview = async () => {
    if (!selectedCase) return
    
    const result = await post('/api/purchase-criteria/special-case/review', {
      deal_id: selectedCase.deal_id,
      action: reviewAction,
      comment: reviewComment
    })
    
    if (result.data) {
      success(reviewAction === 'APPROVED' ? '特別案件を承認しました' : '特別案件を却下しました')
      setShowReviewModal(false)
      setSelectedCase(null)
      setReviewComment('')
      loadSpecialCases()
    } else if (result.error) {
      error(result.error)
    }
  }

  const openReviewModal = (specialCase: SpecialCase, action: 'APPROVED' | 'REJECTED') => {
    setSelectedCase(specialCase)
    setReviewAction(action)
    setReviewComment('')
    setShowReviewModal(true)
  }

  const filteredCases = filter === 'ALL' 
    ? specialCases 
    : specialCases.filter(c => c.status === filter)

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300'
    }
    
    const labels = {
      PENDING: '承認待ち',
      APPROVED: '承認済',
      REJECTED: '却下'
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  if (user?.role !== 'ADMIN') {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">このページにアクセスする権限がありません</p>
        </div>
      </Layout>
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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">特別案件承認</h1>
          <p className="mt-2 text-sm text-gray-600">
            購入条件を満たさない案件の承認申請を管理します
          </p>
        </div>

        {/* フィルター */}
        <div className="mb-6 flex gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status === 'ALL' && `すべて (${specialCases.length})`}
              {status === 'PENDING' && `承認待ち (${specialCases.filter(c => c.status === 'PENDING').length})`}
              {status === 'APPROVED' && `承認済 (${specialCases.filter(c => c.status === 'APPROVED').length})`}
              {status === 'REJECTED' && `却下 (${specialCases.filter(c => c.status === 'REJECTED').length})`}
            </button>
          ))}
        </div>

        {/* 特別案件リスト */}
        {filteredCases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">特別案件がありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'PENDING' ? '承認待ちの案件はありません' : `${filter}の案件はありません`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCases.map((specialCase) => (
              <div key={specialCase.id} className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {specialCase.deal_title}
                      </h3>
                      {getStatusBadge(specialCase.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>申請者: {specialCase.applicant_name}</span>
                      <span>申請日: {new Date(specialCase.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                  
                  {specialCase.status === 'PENDING' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => openReviewModal(specialCase, 'APPROVED')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm font-medium"
                      >
                        ✓ 承認
                      </button>
                      <button
                        onClick={() => openReviewModal(specialCase, 'REJECTED')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-sm font-medium"
                      >
                        ✗ 却下
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">申請理由:</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {specialCase.reason}
                  </p>
                </div>

                {specialCase.review_comment && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      レビューコメント 
                      {specialCase.reviewed_at && (
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          ({new Date(specialCase.reviewed_at).toLocaleString('ja-JP')})
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap bg-blue-50 p-3 rounded">
                      {specialCase.review_comment}
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <a
                    href={`/deals/${specialCase.deal_id}`}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                  >
                    案件詳細を見る →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* レビューモーダル */}
      {showReviewModal && selectedCase && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowReviewModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {reviewAction === 'APPROVED' ? '特別案件を承認' : '特別案件を却下'}
                </h3>
                
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">案件:</p>
                  <p className="text-sm text-gray-900">{selectedCase.deal_title}</p>
                  <p className="text-sm font-medium text-gray-700 mt-3 mb-1">申請理由:</p>
                  <p className="text-sm text-gray-600">{selectedCase.reason}</p>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {reviewAction === 'APPROVED' ? '承認コメント（任意）' : '却下理由'}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder={
                    reviewAction === 'APPROVED' 
                      ? '承認理由や注意事項があれば記入してください（任意）' 
                      : '却下理由を記入してください'
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleReview}
                  disabled={submitting || (reviewAction === 'REJECTED' && !reviewComment.trim())}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    reviewAction === 'APPROVED'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                >
                  {submitting ? '処理中...' : reviewAction === 'APPROVED' ? '承認する' : '却下する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
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

export default SpecialCasesPage
