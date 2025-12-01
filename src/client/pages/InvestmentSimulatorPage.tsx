import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import { useParams, useNavigate } from '../router'
import { useGet } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

interface Deal {
  id: string
  title: string
  location: string
  land_area: string
  price: string
  zoning: string
  building_coverage: string
  floor_area_ratio: string
}

interface SimulationResult {
  // 基本情報
  land_price: number
  construction_cost: number
  total_investment: number
  
  // 建築可能面積
  buildable_area: number
  total_floor_area: number
  
  // 想定家賃収入
  rental_income_per_unit: number
  total_units: number
  annual_rental_income: number
  
  // 経費
  management_fee: number
  property_tax: number
  repair_reserve: number
  insurance: number
  total_annual_expenses: number
  
  // 利回り・収益性
  gross_yield: number // 表面利回り
  net_yield: number   // 実質利回り
  annual_net_income: number // 年間純収益
  
  // 投資回収
  payback_period: number // 投資回収期間（年）
  
  // 借入シミュレーション
  loan_amount: number
  loan_ratio: number // LTV
  monthly_payment: number
  annual_loan_payment: number
  cash_flow: number // 年間キャッシュフロー
}

const InvestmentSimulatorPage: React.FC = () => {
  const { user } = useAuthStore()
  const { id } = useParams()
  const navigate = useNavigate()
  const { get, loading } = useGet<{ deal: Deal }>()
  const { success, error } = useToast()
  
  const [deal, setDeal] = useState<Deal | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)
  
  // シミュレーションパラメータ
  const [constructionCostPerSqm, setConstructionCostPerSqm] = useState<number>(300000) // 坪単価100万円 = 約30万円/㎡
  const [rentalPerSqm, setRentalPerSqm] = useState<number>(3000) // 月額賃料/㎡
  const [managementFeeRate, setManagementFeeRate] = useState<number>(5) // %
  const [propertyTaxRate, setPropertyTaxRate] = useState<number>(1.4) // %
  const [repairReserveRate, setRepairReserveRate] = useState<number>(3) // %
  const [insuranceRate, setInsuranceRate] = useState<number>(0.5) // %
  const [loanRatio, setLoanRatio] = useState<number>(80) // LTV %
  const [interestRate, setInterestRate] = useState<number>(2.5) // %
  const [loanYears, setLoanYears] = useState<number>(30) // 年

  useEffect(() => {
    loadDeal()
  }, [id])

  useEffect(() => {
    if (deal) {
      calculateSimulation()
    }
  }, [
    deal,
    constructionCostPerSqm,
    rentalPerSqm,
    managementFeeRate,
    propertyTaxRate,
    repairReserveRate,
    insuranceRate,
    loanRatio,
    interestRate,
    loanYears
  ])

  const loadDeal = async () => {
    if (!id) return
    
    const res = await get(`/api/deals/${id}`)
    if (res.data) {
      setDeal(res.data.deal)
    } else if (res.error) {
      error(res.error)
      setTimeout(() => navigate('/dashboard'), 2000)
    }
  }

  const calculateSimulation = () => {
    if (!deal) return
    
    const landPrice = parseFloat(deal.price?.replace(/[^0-9.]/g, '') || '0') * 10000 // 万円→円
    const landArea = parseFloat(deal.land_area?.replace(/[^0-9.]/g, '') || '0')
    const buildingCoverage = parseFloat(deal.building_coverage?.replace(/[^0-9.]/g, '') || '60') / 100
    const floorAreaRatio = parseFloat(deal.floor_area_ratio?.replace(/[^0-9.]/g, '') || '200') / 100
    
    // 建築可能面積
    const buildableArea = landArea * buildingCoverage
    const totalFloorArea = landArea * floorAreaRatio
    
    // 建築費
    const constructionCost = totalFloorArea * constructionCostPerSqm
    const totalInvestment = landPrice + constructionCost
    
    // 想定戸数（平均60㎡/戸と仮定）
    const totalUnits = Math.floor(totalFloorArea / 60)
    
    // 家賃収入
    const rentalIncomePerUnit = 60 * rentalPerSqm
    const annualRentalIncome = rentalIncomePerUnit * totalUnits * 12
    
    // 経費
    const managementFee = annualRentalIncome * (managementFeeRate / 100)
    const propertyTax = totalInvestment * (propertyTaxRate / 100)
    const repairReserve = annualRentalIncome * (repairReserveRate / 100)
    const insurance = totalInvestment * (insuranceRate / 100)
    const totalAnnualExpenses = managementFee + propertyTax + repairReserve + insurance
    
    // 利回り
    const grossYield = (annualRentalIncome / totalInvestment) * 100
    const annualNetIncome = annualRentalIncome - totalAnnualExpenses
    const netYield = (annualNetIncome / totalInvestment) * 100
    
    // 投資回収期間
    const paybackPeriod = totalInvestment / annualNetIncome
    
    // 借入シミュレーション
    const loanAmount = totalInvestment * (loanRatio / 100)
    const monthlyInterestRate = (interestRate / 100) / 12
    const totalPayments = loanYears * 12
    const monthlyPayment = loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalPayments)) / (Math.pow(1 + monthlyInterestRate, totalPayments) - 1)
    const annualLoanPayment = monthlyPayment * 12
    const cashFlow = annualNetIncome - annualLoanPayment
    
    setResult({
      land_price: landPrice,
      construction_cost: constructionCost,
      total_investment: totalInvestment,
      buildable_area: buildableArea,
      total_floor_area: totalFloorArea,
      rental_income_per_unit: rentalIncomePerUnit,
      total_units: totalUnits,
      annual_rental_income: annualRentalIncome,
      management_fee: managementFee,
      property_tax: propertyTax,
      repair_reserve: repairReserve,
      insurance: insurance,
      total_annual_expenses: totalAnnualExpenses,
      gross_yield: grossYield,
      net_yield: netYield,
      annual_net_income: annualNetIncome,
      payback_period: paybackPeriod,
      loan_amount: loanAmount,
      loan_ratio: loanRatio,
      monthly_payment: monthlyPayment,
      annual_loan_payment: annualLoanPayment,
      cash_flow: cashFlow
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  if (loading || !deal) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/deals/${id}`)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← 案件詳細に戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-800">📊 投資シミュレーター</h1>
          <p className="text-gray-600 mt-2">
            {deal.title} - {deal.location}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：パラメータ入力 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">シミュレーションパラメータ</h2>
            
            <div className="space-y-4">
              {/* 建築費 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  建築費（円/㎡）
                </label>
                <input
                  type="number"
                  value={constructionCostPerSqm}
                  onChange={(e) => setConstructionCostPerSqm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* 想定賃料 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  想定賃料（円/㎡/月）
                </label>
                <input
                  type="number"
                  value={rentalPerSqm}
                  onChange={(e) => setRentalPerSqm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* 管理費率 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  管理費率（%）
                </label>
                <input
                  type="number"
                  value={managementFeeRate}
                  onChange={(e) => setManagementFeeRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* 固定資産税率 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  固定資産税率（%）
                </label>
                <input
                  type="number"
                  value={propertyTaxRate}
                  onChange={(e) => setPropertyTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* 修繕積立率 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  修繕積立率（%）
                </label>
                <input
                  type="number"
                  value={repairReserveRate}
                  onChange={(e) => setRepairReserveRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* 保険料率 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  保険料率（%）
                </label>
                <input
                  type="number"
                  value={insuranceRate}
                  onChange={(e) => setInsuranceRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <hr className="my-4" />

              {/* 借入条件 */}
              <h3 className="font-bold text-gray-800">借入条件</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  借入比率（LTV %）
                </label>
                <input
                  type="number"
                  value={loanRatio}
                  onChange={(e) => setLoanRatio(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金利（%）
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  借入期間（年）
                </label>
                <input
                  type="number"
                  value={loanYears}
                  onChange={(e) => setLoanYears(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* 右側：シミュレーション結果 */}
          <div className="space-y-6">
            {result && (
              <>
                {/* 投資概要 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">💰 投資概要</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">土地代</span>
                      <span className="font-semibold">{formatCurrency(result.land_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">建築費</span>
                      <span className="font-semibold">{formatCurrency(result.construction_cost)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-800 font-bold">総投資額</span>
                      <span className="font-bold text-lg">{formatCurrency(result.total_investment)}</span>
                    </div>
                  </div>
                </div>

                {/* 建築可能面積 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">🏗️ 建築可能面積</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">建築面積</span>
                      <span className="font-semibold">{result.buildable_area.toFixed(2)} ㎡</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">延床面積</span>
                      <span className="font-semibold">{result.total_floor_area.toFixed(2)} ㎡</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">想定戸数</span>
                      <span className="font-semibold">{result.total_units} 戸</span>
                    </div>
                  </div>
                </div>

                {/* 収益性 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">📈 収益性</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">年間家賃収入</span>
                      <span className="font-semibold">{formatCurrency(result.annual_rental_income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">年間経費</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(result.total_annual_expenses)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-800 font-bold">年間純収益（NOI）</span>
                      <span className="font-bold text-lg text-green-600">{formatCurrency(result.annual_net_income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">表面利回り</span>
                      <span className="font-semibold">{formatPercent(result.gross_yield)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">実質利回り（NCF）</span>
                      <span className="font-semibold text-blue-600">{formatPercent(result.net_yield)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">投資回収期間</span>
                      <span className="font-semibold">{result.payback_period.toFixed(1)} 年</span>
                    </div>
                  </div>
                </div>

                {/* キャッシュフロー */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">💵 キャッシュフロー</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">借入額（LTV {result.loan_ratio}%）</span>
                      <span className="font-semibold">{formatCurrency(result.loan_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">月間返済額</span>
                      <span className="font-semibold">{formatCurrency(result.monthly_payment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">年間返済額</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(result.annual_loan_payment)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-800 font-bold">年間CF</span>
                      <span className={`font-bold text-lg ${result.cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(result.cash_flow)}
                      </span>
                    </div>
                  </div>
                  
                  {result.cash_flow < 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        ⚠️ キャッシュフローがマイナスです。借入条件または想定賃料を見直してください。
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default InvestmentSimulatorPage
