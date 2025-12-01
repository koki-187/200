/**
 * 投資シミュレーターAPIルート
 * 複数シナリオ比較、グラフデータ、PDFレポート生成
 */

import { Hono } from 'hono'
import { Bindings } from '../types'
import { authMiddleware } from '../utils/auth'
import { asyncHandler } from '../middleware/error-handler'

const investmentSimulator = new Hono<{ Bindings: Bindings }>()

// シナリオ一覧取得
investmentSimulator.get('/', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  
  const dealId = c.req.query('deal_id')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')
  
  let query = `
    SELECT 
      s.*,
      d.property_address as deal_address,
      COUNT(cf.id) as cash_flow_years
    FROM investment_scenarios s
    LEFT JOIN deals d ON s.deal_id = d.id
    LEFT JOIN investment_cash_flows cf ON s.id = cf.scenario_id
    WHERE s.user_id = ?
  `
  
  const params: any[] = [user.id]
  
  if (dealId) {
    query += ' AND s.deal_id = ?'
    params.push(parseInt(dealId))
  }
  
  query += `
    GROUP BY s.id
    ORDER BY s.is_favorite DESC, s.created_at DESC
    LIMIT ? OFFSET ?
  `
  params.push(limit, offset)
  
  const result = await db.prepare(query).bind(...params).all()
  
  // 総数取得
  let countQuery = 'SELECT COUNT(*) as total FROM investment_scenarios WHERE user_id = ?'
  const countParams: any[] = [user.id]
  
  if (dealId) {
    countQuery += ' AND deal_id = ?'
    countParams.push(parseInt(dealId))
  }
  
  const countResult = await db.prepare(countQuery).bind(...countParams).first()
  
  return c.json({
    scenarios: result.results || [],
    total: countResult?.total || 0,
    limit,
    offset,
  })
}))

// シナリオ詳細取得（キャッシュフロー含む）
investmentSimulator.get('/:id', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const scenarioId = parseInt(c.req.param('id'))
  
  // シナリオ取得
  const scenario = await db
    .prepare('SELECT * FROM investment_scenarios WHERE id = ? AND user_id = ?')
    .bind(scenarioId, user.id)
    .first()
  
  if (!scenario) {
    return c.json({ error: 'シナリオが見つかりません' }, 404)
  }
  
  // キャッシュフロー取得
  const cashFlows = await db
    .prepare('SELECT * FROM investment_cash_flows WHERE scenario_id = ? ORDER BY year ASC')
    .bind(scenarioId)
    .all()
  
  return c.json({
    scenario,
    cashFlows: cashFlows.results || [],
  })
}))

// 新規シナリオ作成
investmentSimulator.post('/', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const body = await c.req.json()
  
  const {
    name,
    description,
    deal_id,
    property_price,
    land_price,
    building_price,
    down_payment,
    loan_amount,
    loan_interest_rate,
    loan_period,
    initial_costs,
    annual_rent,
    occupancy_rate,
    other_income,
    annual_management_fee,
    annual_repair_cost,
    annual_property_tax,
    annual_insurance,
    other_expenses,
  } = body
  
  // 基本計算
  const effectiveRent = annual_rent * (occupancy_rate / 100)
  const totalIncome = effectiveRent + (other_income || 0)
  const totalExpenses = 
    (annual_management_fee || 0) +
    (annual_repair_cost || 0) +
    (annual_property_tax || 0) +
    (annual_insurance || 0) +
    (other_expenses || 0)
  
  const noi = totalIncome - totalExpenses
  
  // ローン年間支払額計算（元利均等返済）
  const monthlyRate = (loan_interest_rate / 100) / 12
  const numPayments = loan_period * 12
  let annualLoanPayment = 0
  
  if (loan_amount > 0 && monthlyRate > 0 && numPayments > 0) {
    const monthlyPayment = 
      loan_amount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    annualLoanPayment = monthlyPayment * 12
  }
  
  const annualCashFlow = noi - annualLoanPayment
  
  // 指標計算
  const roi = down_payment > 0 ? (annualCashFlow / down_payment) * 100 : 0
  const cashOnCashReturn = down_payment > 0 ? (annualCashFlow / down_payment) * 100 : 0
  const capRate = property_price > 0 ? (noi / property_price) * 100 : 0
  const dcr = annualLoanPayment > 0 ? noi / annualLoanPayment : 0
  const breakEvenOccupancy = annual_rent > 0 ? 
    ((totalExpenses + annualLoanPayment) / annual_rent) * 100 : 0
  
  // シナリオ保存
  const result = await db
    .prepare(`
      INSERT INTO investment_scenarios (
        user_id, deal_id, name, description,
        property_price, land_price, building_price,
        down_payment, loan_amount, loan_interest_rate, loan_period, initial_costs,
        annual_rent, occupancy_rate, other_income,
        annual_management_fee, annual_repair_cost, annual_property_tax, 
        annual_insurance, other_expenses,
        roi, cash_on_cash_return, net_operating_income, 
        annual_cash_flow, cap_rate, debt_coverage_ratio, break_even_occupancy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      user.id, deal_id || null, name, description || null,
      property_price, land_price || 0, building_price || 0,
      down_payment || 0, loan_amount || 0, loan_interest_rate || 0, loan_period || 0, initial_costs || 0,
      annual_rent || 0, occupancy_rate || 95, other_income || 0,
      annual_management_fee || 0, annual_repair_cost || 0, annual_property_tax || 0,
      annual_insurance || 0, other_expenses || 0,
      roi, cashOnCashReturn, noi, annualCashFlow, capRate, dcr, breakEvenOccupancy
    )
    .run()
  
  const scenarioId = result.meta.last_row_id
  
  // キャッシュフロー詳細生成（指定期間分）
  const years = loan_period || 30
  let loanBalance = loan_amount || 0
  let cumulativeCashFlow = -(down_payment + initial_costs)
  let propertyValue = property_price
  
  const cashFlowInserts = []
  
  for (let year = 1; year <= years; year++) {
    // 年間収入
    const yearlyIncome = totalIncome
    
    // 年間支出
    const yearlyExpenses = totalExpenses
    
    // ローン支払い（元金・利息分離）
    let loanPrincipal = 0
    let loanInterest = 0
    
    if (loanBalance > 0 && monthlyRate > 0) {
      const monthlyPayment = 
        loan_amount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      
      for (let month = 1; month <= 12; month++) {
        const interest = loanBalance * monthlyRate
        const principal = monthlyPayment - interest
        
        loanInterest += interest
        loanPrincipal += principal
        loanBalance -= principal
        
        if (loanBalance < 0.01) {
          loanBalance = 0
          break
        }
      }
    }
    
    const netCashFlow = yearlyIncome - yearlyExpenses - annualLoanPayment
    cumulativeCashFlow += netCashFlow
    
    // 物件価値（年2%上昇を仮定）
    propertyValue *= 1.02
    
    const equity = propertyValue - loanBalance
    
    cashFlowInserts.push(`(
      ${scenarioId}, ${year},
      ${yearlyIncome}, ${other_income || 0}, ${yearlyIncome},
      ${annual_management_fee || 0}, ${annual_repair_cost || 0}, ${annual_property_tax || 0},
      ${annual_insurance || 0}, ${annualLoanPayment}, ${other_expenses || 0}, ${yearlyExpenses + annualLoanPayment},
      ${netCashFlow}, ${cumulativeCashFlow},
      ${propertyValue}, ${loanBalance}, ${equity}
    )`)
  }
  
  if (cashFlowInserts.length > 0) {
    await db
      .prepare(`
        INSERT INTO investment_cash_flows (
          scenario_id, year,
          rental_income, other_income, total_income,
          management_fee, repair_cost, property_tax, insurance, loan_payment, other_expenses, total_expenses,
          net_cash_flow, cumulative_cash_flow,
          property_value, loan_balance, equity
        ) VALUES ${cashFlowInserts.join(', ')}
      `)
      .run()
  }
  
  return c.json({
    id: scenarioId,
    message: 'シナリオを作成しました',
  }, 201)
}))

// シナリオ更新
investmentSimulator.put('/:id', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const scenarioId = parseInt(c.req.param('id'))
  const body = await c.req.json()
  
  // 所有権確認
  const existing = await db
    .prepare('SELECT id FROM investment_scenarios WHERE id = ? AND user_id = ?')
    .bind(scenarioId, user.id)
    .first()
  
  if (!existing) {
    return c.json({ error: 'シナリオが見つかりません' }, 404)
  }
  
  // 更新処理（create時と同じ計算ロジック）
  const {
    name,
    description,
    property_price,
    land_price,
    building_price,
    down_payment,
    loan_amount,
    loan_interest_rate,
    loan_period,
    initial_costs,
    annual_rent,
    occupancy_rate,
    other_income,
    annual_management_fee,
    annual_repair_cost,
    annual_property_tax,
    annual_insurance,
    other_expenses,
    is_favorite,
  } = body
  
  const effectiveRent = annual_rent * (occupancy_rate / 100)
  const totalIncome = effectiveRent + (other_income || 0)
  const totalExpenses = 
    (annual_management_fee || 0) +
    (annual_repair_cost || 0) +
    (annual_property_tax || 0) +
    (annual_insurance || 0) +
    (other_expenses || 0)
  
  const noi = totalIncome - totalExpenses
  
  const monthlyRate = (loan_interest_rate / 100) / 12
  const numPayments = loan_period * 12
  let annualLoanPayment = 0
  
  if (loan_amount > 0 && monthlyRate > 0 && numPayments > 0) {
    const monthlyPayment = 
      loan_amount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    annualLoanPayment = monthlyPayment * 12
  }
  
  const annualCashFlow = noi - annualLoanPayment
  const roi = down_payment > 0 ? (annualCashFlow / down_payment) * 100 : 0
  const cashOnCashReturn = down_payment > 0 ? (annualCashFlow / down_payment) * 100 : 0
  const capRate = property_price > 0 ? (noi / property_price) * 100 : 0
  const dcr = annualLoanPayment > 0 ? noi / annualLoanPayment : 0
  const breakEvenOccupancy = annual_rent > 0 ? 
    ((totalExpenses + annualLoanPayment) / annual_rent) * 100 : 0
  
  await db
    .prepare(`
      UPDATE investment_scenarios SET
        name = ?, description = ?,
        property_price = ?, land_price = ?, building_price = ?,
        down_payment = ?, loan_amount = ?, loan_interest_rate = ?, 
        loan_period = ?, initial_costs = ?,
        annual_rent = ?, occupancy_rate = ?, other_income = ?,
        annual_management_fee = ?, annual_repair_cost = ?, 
        annual_property_tax = ?, annual_insurance = ?, other_expenses = ?,
        roi = ?, cash_on_cash_return = ?, net_operating_income = ?,
        annual_cash_flow = ?, cap_rate = ?, debt_coverage_ratio = ?,
        break_even_occupancy = ?, is_favorite = ?
      WHERE id = ?
    `)
    .bind(
      name, description,
      property_price, land_price || 0, building_price || 0,
      down_payment || 0, loan_amount || 0, loan_interest_rate || 0, loan_period || 0, initial_costs || 0,
      annual_rent || 0, occupancy_rate || 95, other_income || 0,
      annual_management_fee || 0, annual_repair_cost || 0, 
      annual_property_tax || 0, annual_insurance || 0, other_expenses || 0,
      roi, cashOnCashReturn, noi, annualCashFlow, capRate, dcr, breakEvenOccupancy,
      is_favorite !== undefined ? (is_favorite ? 1 : 0) : 0,
      scenarioId
    )
    .run()
  
  // 既存のキャッシュフロー削除
  await db
    .prepare('DELETE FROM investment_cash_flows WHERE scenario_id = ?')
    .bind(scenarioId)
    .run()
  
  // キャッシュフロー再生成
  const years = loan_period || 30
  let loanBalance = loan_amount || 0
  let cumulativeCashFlow = -(down_payment + initial_costs)
  let propertyValue = property_price
  
  const cashFlowInserts = []
  
  for (let year = 1; year <= years; year++) {
    const yearlyIncome = totalIncome
    const yearlyExpenses = totalExpenses
    
    let loanPrincipal = 0
    let loanInterest = 0
    
    if (loanBalance > 0 && monthlyRate > 0) {
      const monthlyPayment = 
        loan_amount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      
      for (let month = 1; month <= 12; month++) {
        const interest = loanBalance * monthlyRate
        const principal = monthlyPayment - interest
        
        loanInterest += interest
        loanPrincipal += principal
        loanBalance -= principal
        
        if (loanBalance < 0.01) {
          loanBalance = 0
          break
        }
      }
    }
    
    const netCashFlow = yearlyIncome - yearlyExpenses - annualLoanPayment
    cumulativeCashFlow += netCashFlow
    propertyValue *= 1.02
    const equity = propertyValue - loanBalance
    
    cashFlowInserts.push(`(
      ${scenarioId}, ${year},
      ${yearlyIncome}, ${other_income || 0}, ${yearlyIncome},
      ${annual_management_fee || 0}, ${annual_repair_cost || 0}, ${annual_property_tax || 0},
      ${annual_insurance || 0}, ${annualLoanPayment}, ${other_expenses || 0}, ${yearlyExpenses + annualLoanPayment},
      ${netCashFlow}, ${cumulativeCashFlow},
      ${propertyValue}, ${loanBalance}, ${equity}
    )`)
  }
  
  if (cashFlowInserts.length > 0) {
    await db
      .prepare(`
        INSERT INTO investment_cash_flows (
          scenario_id, year,
          rental_income, other_income, total_income,
          management_fee, repair_cost, property_tax, insurance, loan_payment, other_expenses, total_expenses,
          net_cash_flow, cumulative_cash_flow,
          property_value, loan_balance, equity
        ) VALUES ${cashFlowInserts.join(', ')}
      `)
      .run()
  }
  
  return c.json({ message: 'シナリオを更新しました' })
}))

// シナリオ削除
investmentSimulator.delete('/:id', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const scenarioId = parseInt(c.req.param('id'))
  
  // 所有権確認
  const existing = await db
    .prepare('SELECT id FROM investment_scenarios WHERE id = ? AND user_id = ?')
    .bind(scenarioId, user.id)
    .first()
  
  if (!existing) {
    return c.json({ error: 'シナリオが見つかりません' }, 404)
  }
  
  // カスケード削除（外部キー制約により自動的にキャッシュフローも削除される）
  await db
    .prepare('DELETE FROM investment_scenarios WHERE id = ?')
    .bind(scenarioId)
    .run()
  
  return c.json({ message: 'シナリオを削除しました' })
}))

// 複数シナリオ比較
investmentSimulator.post('/compare', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const body = await c.req.json()
  const { scenario_ids } = body
  
  if (!scenario_ids || !Array.isArray(scenario_ids) || scenario_ids.length === 0) {
    return c.json({ error: 'scenario_idsが必要です' }, 400)
  }
  
  // シナリオ取得
  const placeholders = scenario_ids.map(() => '?').join(',')
  const scenarios = await db
    .prepare(`
      SELECT * FROM investment_scenarios 
      WHERE id IN (${placeholders}) AND user_id = ?
      ORDER BY roi DESC
    `)
    .bind(...scenario_ids, user.id)
    .all()
  
  // 各シナリオのキャッシュフロー取得
  const scenariosWithCashFlows = await Promise.all(
    (scenarios.results || []).map(async (scenario: any) => {
      const cashFlows = await db
        .prepare('SELECT * FROM investment_cash_flows WHERE scenario_id = ? ORDER BY year ASC')
        .bind(scenario.id)
        .all()
      
      return {
        ...scenario,
        cashFlows: cashFlows.results || [],
      }
    })
  )
  
  // 比較メトリクス計算
  const comparison = {
    scenarios: scenariosWithCashFlows,
    metrics: {
      best_roi: scenariosWithCashFlows.reduce((best: any, s: any) => 
        !best || s.roi > best.roi ? s : best, null),
      best_cash_flow: scenariosWithCashFlows.reduce((best: any, s: any) => 
        !best || s.annual_cash_flow > best.annual_cash_flow ? s : best, null),
      best_cap_rate: scenariosWithCashFlows.reduce((best: any, s: any) => 
        !best || s.cap_rate > best.cap_rate ? s : best, null),
      lowest_risk: scenariosWithCashFlows.reduce((best: any, s: any) => 
        !best || s.debt_coverage_ratio > best.debt_coverage_ratio ? s : best, null),
    },
  }
  
  return c.json(comparison)
}))

// グラフデータ取得
investmentSimulator.get('/:id/chart-data', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const scenarioId = parseInt(c.req.param('id'))
  
  // 所有権確認
  const scenario = await db
    .prepare('SELECT * FROM investment_scenarios WHERE id = ? AND user_id = ?')
    .bind(scenarioId, user.id)
    .first()
  
  if (!scenario) {
    return c.json({ error: 'シナリオが見つかりません' }, 404)
  }
  
  // キャッシュフロー取得
  const cashFlows = await db
    .prepare('SELECT * FROM investment_cash_flows WHERE scenario_id = ? ORDER BY year ASC')
    .bind(scenarioId)
    .all()
  
  const data = cashFlows.results || []
  
  // グラフ用データ整形
  const chartData = {
    labels: data.map((cf: any) => `${cf.year}年目`),
    cashFlow: {
      labels: data.map((cf: any) => `${cf.year}年目`),
      datasets: [
        {
          label: '収入',
          data: data.map((cf: any) => cf.total_income),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
        },
        {
          label: '支出',
          data: data.map((cf: any) => -cf.total_expenses),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
        },
        {
          label: 'キャッシュフロー',
          data: data.map((cf: any) => cf.net_cash_flow),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
      ],
    },
    cumulativeCashFlow: {
      labels: data.map((cf: any) => `${cf.year}年目`),
      datasets: [
        {
          label: '累積キャッシュフロー',
          data: data.map((cf: any) => cf.cumulative_cash_flow),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
        },
      ],
    },
    equity: {
      labels: data.map((cf: any) => `${cf.year}年目`),
      datasets: [
        {
          label: '物件価値',
          data: data.map((cf: any) => cf.property_value),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
        },
        {
          label: 'ローン残高',
          data: data.map((cf: any) => cf.loan_balance),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
        },
        {
          label: '純資産',
          data: data.map((cf: any) => cf.equity),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
      ],
    },
  }
  
  return c.json(chartData)
}))

// PDFレポート生成（データ提供のみ、PDF生成はフロントエンド）
investmentSimulator.get('/:id/report', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const scenarioId = parseInt(c.req.param('id'))
  
  // シナリオ取得
  const scenario = await db
    .prepare('SELECT * FROM investment_scenarios WHERE id = ? AND user_id = ?')
    .bind(scenarioId, user.id)
    .first()
  
  if (!scenario) {
    return c.json({ error: 'シナリオが見つかりません' }, 404)
  }
  
  // キャッシュフロー取得
  const cashFlows = await db
    .prepare('SELECT * FROM investment_cash_flows WHERE scenario_id = ? ORDER BY year ASC')
    .bind(scenarioId)
    .all()
  
  // レポートデータ構造
  const report = {
    scenario,
    cashFlows: cashFlows.results || [],
    summary: {
      total_investment: scenario.down_payment + scenario.initial_costs,
      total_income_30y: (cashFlows.results || []).reduce((sum: number, cf: any) => 
        sum + cf.total_income, 0),
      total_expenses_30y: (cashFlows.results || []).reduce((sum: number, cf: any) => 
        sum + cf.total_expenses, 0),
      net_profit_30y: (cashFlows.results || []).reduce((sum: number, cf: any) => 
        sum + cf.net_cash_flow, 0),
      final_equity: cashFlows.results?.[cashFlows.results.length - 1]?.equity || 0,
      total_return: 0,
    },
    metrics: {
      roi: scenario.roi,
      cash_on_cash_return: scenario.cash_on_cash_return,
      cap_rate: scenario.cap_rate,
      debt_coverage_ratio: scenario.debt_coverage_ratio,
      break_even_occupancy: scenario.break_even_occupancy,
    },
    generated_at: new Date().toISOString(),
  }
  
  report.summary.total_return = report.summary.net_profit_30y + report.summary.final_equity
  
  return c.json(report)
}))

// お気に入り切り替え
investmentSimulator.patch('/:id/favorite', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const scenarioId = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const { is_favorite } = body
  
  // 所有権確認
  const existing = await db
    .prepare('SELECT id FROM investment_scenarios WHERE id = ? AND user_id = ?')
    .bind(scenarioId, user.id)
    .first()
  
  if (!existing) {
    return c.json({ error: 'シナリオが見つかりません' }, 404)
  }
  
  // お気に入り更新
  await db
    .prepare('UPDATE investment_scenarios SET is_favorite = ? WHERE id = ?')
    .bind(is_favorite ? 1 : 0, scenarioId)
    .run()
  
  return c.json({ 
    message: is_favorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました',
    is_favorite: is_favorite 
  })
}))

export default investmentSimulator
