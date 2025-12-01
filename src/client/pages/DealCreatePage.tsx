import React, { useState } from 'react'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import { usePost } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

interface DealFormData {
  title: string
  location: string
  nearest_station: string
  walk_minutes: string
  land_area: string
  building_area: string
  zoning: string
  building_coverage: string
  floor_area_ratio: string
  fire_zone: string
  road_info: string
  frontage: string
  current_status: string
  price: string
  description: string
  yield_rate: string
  occupancy_status: string
  structure: string
  built_year: string
}

interface ValidationError {
  field: string
  message: string
}

const DealCreatePage: React.FC = () => {
  const { user } = useAuthStore()
  const { post, loading } = usePost()
  const { success, error } = useToast()
  
  const [formData, setFormData] = useState<DealFormData>({
    title: '',
    location: '',
    nearest_station: '',
    walk_minutes: '',
    land_area: '',
    building_area: '',
    zoning: '',
    building_coverage: '',
    floor_area_ratio: '',
    fire_zone: '',
    road_info: '',
    frontage: '',
    current_status: '',
    price: '',
    description: '',
    yield_rate: '',
    occupancy_status: '',
    structure: '',
    built_year: ''
  })
  
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  // 初回6情報の必須フィールド
  const requiredFields = [
    { name: 'location', label: '所在地', group: '初回6情報' },
    { name: 'nearest_station', label: '最寄駅', group: '初回6情報' },
    { name: 'walk_minutes', label: '徒歩分数', group: '初回6情報' },
    { name: 'land_area', label: '土地面積', group: '初回6情報' },
    { name: 'zoning', label: '用途地域', group: '初回6情報' },
    { name: 'building_coverage', label: '建蔽率', group: '初回6情報' },
    { name: 'floor_area_ratio', label: '容積率', group: '初回6情報' },
    { name: 'fire_zone', label: '防火地域', group: '初回6情報' },
    { name: 'road_info', label: '接道情報', group: '初回6情報' },
    { name: 'frontage', label: '間口', group: '初回6情報' },
    { name: 'current_status', label: '現況', group: '初回6情報' },
    { name: 'price', label: '希望価格', group: '初回6情報' }
  ]

  const validateField = (name: string, value: string): string | null => {
    const field = requiredFields.find(f => f.name === name)
    if (!field) return null
    
    if (!value || value.trim() === '') {
      return `${field.label}は必須項目です`
    }
    
    // 数値フィールドのバリデーション
    if (['walk_minutes', 'land_area', 'frontage'].includes(name)) {
      const numValue = parseFloat(value)
      if (isNaN(numValue) || numValue <= 0) {
        return `${field.label}は正の数値を入力してください`
      }
    }
    
    // パーセンテージフィールドのバリデーション
    if (['building_coverage', 'floor_area_ratio'].includes(name)) {
      const percentValue = parseFloat(value.replace('%', ''))
      if (isNaN(percentValue) || percentValue < 0 || percentValue > 100) {
        return `${field.label}は0～100の数値を入力してください`
      }
    }
    
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // リアルタイムバリデーション（フィールドがタッチされている場合のみ）
    if (touchedFields.has(name)) {
      const errorMsg = validateField(name, value)
      setValidationErrors(prev => {
        const filtered = prev.filter(err => err.field !== name)
        if (errorMsg) {
          return [...filtered, { field: name, message: errorMsg }]
        }
        return filtered
      })
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setTouchedFields(prev => new Set(prev).add(name))
    
    const errorMsg = validateField(name, value)
    setValidationErrors(prev => {
      const filtered = prev.filter(err => err.field !== name)
      if (errorMsg) {
        return [...filtered, { field: name, message: errorMsg }]
      }
      return filtered
    })
  }

  const validateForm = (): boolean => {
    const errors: ValidationError[] = []
    
    requiredFields.forEach(field => {
      const value = formData[field.name as keyof DealFormData]
      const errorMsg = validateField(field.name, value)
      if (errorMsg) {
        errors.push({ field: field.name, message: errorMsg })
      }
    })
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // すべてのフィールドをタッチ済みにする
    setTouchedFields(new Set(requiredFields.map(f => f.name)))
    
    if (!validateForm()) {
      error('必須項目を入力してください')
      return
    }
    
    const result = await post('/api/deals', formData)
    
    if (result.data) {
      success('案件を作成しました')
      // 案件詳細ページへリダイレクト
      window.location.href = `/deals/${result.data.id}`
    } else if (result.error) {
      error(result.error)
    }
  }

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors.find(err => err.field === fieldName)?.message
  }

  const isFieldRequired = (fieldName: string): boolean => {
    return requiredFields.some(f => f.name === fieldName)
  }

  const renderFieldLabel = (label: string, fieldName: string) => {
    const isRequired = isFieldRequired(fieldName)
    const hasError = getFieldError(fieldName)
    
    return (
      <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
        {label}
        {isRequired && (
          <span className="text-red-600 ml-1" title="必須項目">*</span>
        )}
        {hasError && (
          <span className="text-red-600 text-xs sm:text-sm ml-2">{hasError}</span>
        )}
      </label>
    )
  }

  const renderInput = (
    fieldName: keyof DealFormData,
    label: string,
    type: string = 'text',
    placeholder?: string
  ) => {
    const hasError = getFieldError(fieldName)
    
    return (
      <div>
        {renderFieldLabel(label, fieldName)}
        <input
          type={type}
          name={fieldName}
          value={formData[fieldName]}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`mt-1 block w-full rounded-md shadow-sm text-base min-h-[44px] px-3 py-2 ${
            hasError
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
          }`}
        />
      </div>
    )
  }

  const renderSelect = (
    fieldName: keyof DealFormData,
    label: string,
    options: { value: string; label: string }[]
  ) => {
    const hasError = getFieldError(fieldName)
    
    return (
      <div>
        {renderFieldLabel(label, fieldName)}
        <select
          name={fieldName}
          value={formData[fieldName]}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`mt-1 block w-full rounded-md shadow-sm text-base min-h-[44px] px-3 py-2 ${
            hasError
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
          }`}
        >
          <option value="">選択してください</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (user?.role !== 'AGENT' && user?.role !== 'ADMIN') {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">案件を作成する権限がありません</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">新規案件作成</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            <span className="text-red-600">*</span> は必須項目です（初回6情報）
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* 基本情報 */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">基本情報</h2>
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  案件タイトル
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="例: 渋谷区神宮前 投資用アパート用地"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base min-h-[44px] px-3 py-2"
                />
              </div>
              
              {renderInput('location', '所在地', 'text', '例: 東京都渋谷区神宮前1-1-1')}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {renderInput('nearest_station', '最寄駅', 'text', '例: 渋谷')}
                {renderInput('walk_minutes', '徒歩分数', 'number', '例: 5')}
              </div>
            </div>
          </div>

          {/* 物件情報（初回6情報） */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 border-2 border-indigo-200">
            <div className="flex flex-col sm:flex-row sm:items-center mb-3 sm:mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">物件情報</h2>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-full self-start">
                初回6情報
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {renderInput('land_area', '土地面積', 'text', '例: 150㎡ または 45坪')}
                {renderInput('building_area', '建物面積', 'text', '例: 200㎡')}
              </div>
              
              {renderInput('price', '希望価格', 'text', '例: 8,000万円')}
              
              {renderSelect('zoning', '用途地域', [
                { value: '第一種低層住居専用地域', label: '第一種低層住居専用地域' },
                { value: '第二種低層住居専用地域', label: '第二種低層住居専用地域' },
                { value: '第一種中高層住居専用地域', label: '第一種中高層住居専用地域' },
                { value: '第二種中高層住居専用地域', label: '第二種中高層住居専用地域' },
                { value: '第一種住居地域', label: '第一種住居地域' },
                { value: '第二種住居地域', label: '第二種住居地域' },
                { value: '準住居地域', label: '準住居地域' },
                { value: '近隣商業地域', label: '近隣商業地域' },
                { value: '商業地域', label: '商業地域' },
                { value: '準工業地域', label: '準工業地域' },
                { value: '工業地域', label: '工業地域' },
                { value: '工業専用地域', label: '工業専用地域' }
              ])}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {renderInput('building_coverage', '建蔽率', 'text', '例: 60% または 60')}
                {renderInput('floor_area_ratio', '容積率', 'text', '例: 200% または 200')}
              </div>
              
              {renderSelect('fire_zone', '防火地域', [
                { value: '防火地域', label: '防火地域' },
                { value: '準防火地域', label: '準防火地域' },
                { value: '指定なし', label: '指定なし' }
              ])}
              
              {renderInput('road_info', '接道情報', 'text', '例: 南側公道 幅員6.0m 接道8.0m')}
              
              {renderInput('frontage', '間口', 'text', '例: 8.0m')}
              
              {renderSelect('current_status', '現況', [
                { value: '更地', label: '更地' },
                { value: '古家あり', label: '古家あり' },
                { value: '戸建住宅', label: '戸建住宅' },
                { value: '集合住宅', label: '集合住宅' },
                { value: '店舗', label: '店舗' },
                { value: '駐車場', label: '駐車場' },
                { value: 'その他', label: 'その他' }
              ])}
            </div>
          </div>

          {/* 追加情報 */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">追加情報（任意）</h2>
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                    築年数
                  </label>
                  <input
                    type="text"
                    name="built_year"
                    value={formData.built_year}
                    onChange={handleChange}
                    placeholder="例: 1995年 または 築28年"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base min-h-[44px] px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                    構造
                  </label>
                  <input
                    type="text"
                    name="structure"
                    value={formData.structure}
                    onChange={handleChange}
                    placeholder="例: 木造2階建"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base min-h-[44px] px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                    利回り
                  </label>
                  <input
                    type="text"
                    name="yield_rate"
                    value={formData.yield_rate}
                    onChange={handleChange}
                    placeholder="例: 5.5%"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base min-h-[44px] px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                    入居状況
                  </label>
                  <select
                    name="occupancy_status"
                    value={formData.occupancy_status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base min-h-[44px] px-3 py-2"
                  >
                    <option value="">選択してください</option>
                    <option value="満室">満室</option>
                    <option value="一部空室">一部空室</option>
                    <option value="空室">空室</option>
                    <option value="オーナー居住中">オーナー居住中</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  備考
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="物件の特徴や注意事項などを入力してください"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* エラーサマリー */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-medium text-red-800 mb-2">
                入力エラーがあります（{validationErrors.length}件）
              </h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 送信ボタン */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto px-6 py-3 sm:py-2 border border-gray-300 rounded-md shadow-sm text-base sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 sm:py-2 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[44px]"
            >
              {loading ? '作成中...' : '案件を作成'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default DealCreatePage
