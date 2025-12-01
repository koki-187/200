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
  
  // 減価償却
  annual_depreciation: number // 年間減価償却費
  depreciation_period: number // 償却期間（年）
  
  // 税金シミュレーション
  taxable_income: number // 課税所得
  income_tax: number // 所得税
  resident_tax: number // 住民税
  total_tax: number // 合計税額
  after_tax_cash_flow: number // 税引後キャッシュフロー
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
  const [buildingStructure, setBuildingStructure] = useState<'RC' | 'SRC' | 'Steel' | 'Wood'>('RC') // 構造
  const [taxRate, setTaxRate] = useState<number>(33) // 所得税率（%）

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
    loanYears,
    buildingStructure,
    taxRate
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
    
    // 減価償却計算（建物のみ、土地は対象外）
    const depreciationPeriodMap = {
      'RC': 47,    // 鉄筋コンクリート造：47年
      'SRC': 47,   // 鉄骨鉄筋コンクリート造：47年
      'Steel': 34, // 鉄骨造：34年
      'Wood': 22   // 木造：22年
    }
    const depreciationPeriod = depreciationPeriodMap[buildingStructure]
    const annualDepreciation = constructionCost / depreciationPeriod
    
    // 税金シミュレーション
    // 課税所得 = 家賃収入 - 経費 - ローン利息 - 減価償却費
    // 簡易計算: ローン利息は初年度想定（元利均等返済の初年度利息）
    const firstYearInterest = loanAmount * (interestRate / 100)
    const taxableIncome = annualRentalIncome - totalAnnualExpenses - firstYearInterest - annualDepreciation
    
    // 所得税と住民税の計算（累進課税を簡易化）
    const incomeTax = Math.max(0, taxableIncome * (taxRate / 100))
    const residentTax = Math.max(0, taxableIncome * 0.1) // 住民税10%
    const totalTax = incomeTax + residentTax
    const afterTaxCashFlow = cashFlow - totalTax
    
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
      cash_flow: cashFlow,
      annual_depreciation: annualDepreciation,
      depreciation_period: depreciationPeriod,
      taxable_income: taxableIncome,
      income_tax: incomeTax,
      resident_tax: residentTax,
      total_tax: totalTax,
      after_tax_cash_flow: afterTaxCashFlow
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* ヘッダー */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(`/deals/${id}`)}
            className="text-blue-600 hover:text-blue-800 mb-3 sm:mb-4 flex items-center text-sm sm:text-base min-h-[44px] sm:min-h-0"
          >
            ← 案件詳細に戻る
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">📊 投資シミュレーター</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {deal.title} - {deal.location}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* 左側：パラメータ入力 */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">シミュレーションパラメータ</h2>
            
            <div className="space-y-3 sm:space-y-4">
              {/* 建築費 */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  建築費（円/㎡）
                </label>
                <input
                  type="number"
                  value={constructionCostPerSqm}
                  onChange={(e) => setConstructionCostPerSqm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                />
              </div>

              {/* 想定賃料 */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  想定賃料（円/㎡/月）
                </label>
                <input
                  type="number"
                  value={rentalPerSqm}
                  onChange={(e) => setRentalPerSqm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                />
              </div>

              {/* 管理費率 */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  管理費率（%）
                </label>
                <input
                  type="number"
                  value={managementFeeRate}
                  onChange={(e) => setManagementFeeRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                />
              </div>

              {/* 固定資産税率 */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  固定資産税率（%）
                </label>
                <input
                  type="number"
                  value={propertyTaxRate}
                  onChange={(e) => setPropertyTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                />
              </div>

              {/* 修繕積立率 */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  修繕積立率（%）
                </label>
                <input
                  type="number"
                  value={repairReserveRate}
                  onChange={(e) => setRepairReserveRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                />
              </div>

              {/* 保険料率 */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  保険料率（%）
                </label>
                <input
                  type="number"
                  value={insuranceRate}
                  onChange={(e) => setInsuranceRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                />
              </div>

              <hr className="my-3 sm:my-4" />

              {/* 借入条件 */}
              <h3 className="font-bold text-gray-800 text-base sm:text-lg">借入条件</h3>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  借入比率（LTV %）
                </label>
                <input
                  type="number"
                  value={loanRatio}
                  onChange={(e) => setLoanRatio(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  金利（%）
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  借入期間（年）
                </label>
                <input
                  type="number"
                  value={loanYears}
                  onChange={(e) => setLoanYears(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                />
              </div>

              {/* 建物構造 */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  建物構造（減価償却）
                </label>
                <select
                  value={buildingStructure}
                  onChange={(e) => setBuildingStructure(e.target.value as 'RC' | 'SRC' | 'Steel' | 'Wood')}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                >
                  <option value="RC">RC造（鉄筋コンクリート造）- 47年</option>
                  <option value="SRC">SRC造（鉄骨鉄筋コンクリート造）- 47年</option>
                  <option value="Steel">鉄骨造 - 34年</option>
                  <option value="Wood">木造 - 22年</option>
                </select>
              </div>

              {/* 税率 */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  所得税率（%）
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 sm:py-3 text-base border border-gray-300 rounded-md min-h-[44px]"
                >
                  <option value="5">5% (195万円以下)</option>
                  <option value="10">10% (330万円以下)</option>
                  <option value="20">20% (695万円以下)</option>
                  <option value="23">23% (900万円以下)</option>
                  <option value="33">33% (1,800万円以下)</option>
                  <option value="40">40% (4,000万円以下)</option>
                  <option value="45">45% (4,000万円超)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 右側：シミュレーション結果 */}
          <div className="space-y-4 sm:space-y-6">
            {result && (
              <>
                {/* 投資概要 */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">💰 投資概要</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">土地代</span>
                      <span className="font-semibold">{formatCurrency(result.land_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">建築費</span>
                      <span className="font-semibold">{formatCurrency(result.construction_cost)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-sm sm:text-base">
                      <span className="text-gray-800 font-bold">総投資額</span>
                      <span className="font-bold text-base sm:text-lg">{formatCurrency(result.total_investment)}</span>
                    </div>
                  </div>
                </div>

                {/* 建築可能面積 */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">🏗️ 建築可能面積</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">建築面積</span>
                      <span className="font-semibold">{result.buildable_area.toFixed(2)} ㎡</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">延床面積</span>
                      <span className="font-semibold">{result.total_floor_area.toFixed(2)} ㎡</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">想定戸数</span>
                      <span className="font-semibold">{result.total_units} 戸</span>
                    </div>
                  </div>
                </div>

                {/* 収益性 */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">📈 収益性</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">年間家賃収入</span>
                      <span className="font-semibold break-all">{formatCurrency(result.annual_rental_income)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">年間経費</span>
                      <span className="font-semibold text-red-600 break-all">-{formatCurrency(result.total_annual_expenses)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-sm sm:text-base">
                      <span className="text-gray-800 font-bold">年間純収益（NOI）</span>
                      <span className="font-bold text-base sm:text-lg text-green-600 break-all">{formatCurrency(result.annual_net_income)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">表面利回り</span>
                      <span className="font-semibold">{formatPercent(result.gross_yield)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">実質利回り（NCF）</span>
                      <span className="font-semibold text-blue-600">{formatPercent(result.net_yield)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">投資回収期間</span>
                      <span className="font-semibold">{result.payback_period.toFixed(1)} 年</span>
                    </div>
                  </div>
                </div>

                {/* キャッシュフロー */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">💵 キャッシュフロー</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">借入額（LTV {result.loan_ratio}%）</span>
                      <span className="font-semibold break-all">{formatCurrency(result.loan_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">月間返済額</span>
                      <span className="font-semibold break-all">{formatCurrency(result.monthly_payment)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">年間返済額</span>
                      <span className="font-semibold text-red-600 break-all">-{formatCurrency(result.annual_loan_payment)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-sm sm:text-base">
                      <span className="text-gray-800 font-bold">年間CF</span>
                      <span className={`font-bold text-base sm:text-lg break-all ${result.cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(result.cash_flow)}
                      </span>
                    </div>
                  </div>
                  
                  {result.cash_flow < 0 && (
                    <div className="mt-3 sm:mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        ⚠️ キャッシュフローがマイナスです。借入条件または想定賃料を見直してください。
                      </p>
                    </div>
                  )}
                </div>

                {/* 減価償却 */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">📉 減価償却</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">償却対象額（建物のみ）</span>
                      <span className="font-semibold break-all">{formatCurrency(result.construction_cost)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">償却期間</span>
                      <span className="font-semibold">{result.depreciation_period} 年</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-sm sm:text-base">
                      <span className="text-gray-800 font-bold">年間減価償却費</span>
                      <span className="font-bold text-base sm:text-lg text-blue-600 break-all">
                        {formatCurrency(result.annual_depreciation)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs sm:text-sm text-blue-800">
                      💡 減価償却費は実際の現金支出を伴わない費用ですが、税務上の経費として計上できます。
                    </p>
                  </div>
                </div>

                {/* 税金シミュレーション */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">💰 税金シミュレーション</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">家賃収入</span>
                      <span className="font-semibold break-all">{formatCurrency(result.annual_rental_income)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">経費・ローン利息・減価償却</span>
                      <span className="font-semibold text-red-600 break-all">
                        -{formatCurrency(result.annual_rental_income - result.taxable_income)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-sm sm:text-base">
                      <span className="text-gray-800 font-bold">課税所得</span>
                      <span className="font-bold text-base sm:text-lg break-all">
                        {formatCurrency(result.taxable_income)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">所得税</span>
                      <span className="font-semibold text-red-600 break-all">-{formatCurrency(result.income_tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">住民税（10%）</span>
                      <span className="font-semibold text-red-600 break-all">-{formatCurrency(result.resident_tax)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-sm sm:text-base">
                      <span className="text-gray-800 font-bold">合計税額</span>
                      <span className="font-bold text-base sm:text-lg text-red-600 break-all">
                        -{formatCurrency(result.total_tax)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-sm sm:text-base">
                      <span className="text-gray-800 font-bold">税引後CF</span>
                      <span className={`font-bold text-base sm:text-lg break-all ${result.after_tax_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(result.after_tax_cash_flow)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs sm:text-sm text-yellow-800">
                      ⚠️ 税金シミュレーションは簡易計算です。実際の税額は個人の所得状況により異なります。
                    </p>
                  </div>
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
