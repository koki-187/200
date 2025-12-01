import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useDealStore, Deal } from '../store/dealStore'
import { useAuthStore } from '../store/authStore'
import { useGet } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { filterDeals, sortDeals } from '../../utils/filters'
import { exportDealsToExcel } from '../../utils/excel'

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore()
  const { deals, setDeals, filters, sortBy, sortOrder, viewMode, setViewMode } = useDealStore()
  const { get, loading } = useGet<{ deals: Deal[] }>()
  const { success, error } = useToast()

  useEffect(() => {
    loadDeals()
  }, [])

  const loadDeals = async () => {
    const result = await get('/api/deals')
    if (result.data) {
      setDeals(result.data.deals)
    } else if (result.error) {
      error(result.error)
    }
  }

  const handleExport = async () => {
    try {
      const filteredDeals = filterDeals(deals, filters)
      const sortedDeals = sortDeals(filteredDeals, sortBy, sortOrder)
      
      await exportDealsToExcel(
        sortedDeals.map(deal => ({
          id: deal.id,
          title: deal.title,
          description: deal.description,
          location: deal.location,
          land_area: deal.land_area,
          price: deal.price,
          status: deal.status,
          deadline: deal.deadline,
          created_at: deal.created_at,
          updated_at: deal.updated_at
        })),
        `案件一覧_${new Date().toISOString().split('T')[0]}.xlsx`
      )
      
      success('Excelファイルをダウンロードしました')
    } catch (err) {
      error('エクスポートに失敗しました')
    }
  }

  const filteredAndSortedDeals = sortDeals(
    filterDeals(deals, filters),
    sortBy,
    sortOrder
  )

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
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return null
    
    const now = new Date().getTime()
    const deadlineTime = new Date(deadline).getTime()
    const hoursRemaining = (deadlineTime - now) / (1000 * 60 * 60)
    
    if (hoursRemaining < 0) {
      return <span className="text-red-600 font-semibold">期限切れ</span>
    } else if (hoursRemaining < 24) {
      return <span className="text-orange-600 font-semibold">24時間以内</span>
    } else if (hoursRemaining < 48) {
      return <span className="text-yellow-600 font-semibold">48時間以内</span>
    }
    
    return null
  }

  if (loading && deals.length === 0) {
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
      <div className="px-4 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">案件一覧</h1>
            <p className="text-sm text-gray-500 mt-1">
              全{deals.length}件 | 表示中{filteredAndSortedDeals.length}件
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excelエクスポート
            </button>
            
            {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
              <a
                href="/deals/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新規案件作成
              </a>
            )}
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-4 flex justify-end">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 text-sm font-medium border ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-l-md`}
            >
              グリッド
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-r-md`}
            >
              リスト
            </button>
          </div>
        </div>

        {/* Deals Grid/List */}
        {filteredAndSortedDeals.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">案件がありません</h3>
            <p className="mt-1 text-sm text-gray-500">新しい案件を作成してください</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredAndSortedDeals.map((deal) => (
              <div
                key={deal.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate flex-1">
                      {deal.title}
                    </h3>
                    {getStatusBadge(deal.status)}
                  </div>
                  
                  {deal.location && (
                    <p className="text-sm text-gray-600 mb-2">
                      📍 {deal.location}
                    </p>
                  )}
                  
                  {deal.land_area && (
                    <p className="text-sm text-gray-600 mb-2">
                      📏 {deal.land_area}
                    </p>
                  )}
                  
                  {deal.price && (
                    <p className="text-sm text-gray-600 mb-2">
                      💰 {deal.price}
                    </p>
                  )}
                  
                  {deal.deadline && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        回答期限: {new Date(deal.deadline).toLocaleString('ja-JP')}
                      </p>
                      {getDeadlineStatus(deal.deadline)}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <a
                      href={`/deals/${deal.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      詳細を見る →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default DashboardPage
