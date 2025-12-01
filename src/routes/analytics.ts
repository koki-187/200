import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import type { Bindings } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

// JWT認証を適用
app.use('*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET || 'default-secret-key-change-in-production',
  });
  return jwtMiddleware(c, next);
});

// KPIダッシュボード - 全体概要
app.get('/kpi/dashboard', async (c) => {
  try {
    // 案件統計
    const totalDeals = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM deals
    `).first();

    const dealsByStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM deals
      GROUP BY status
    `).all();

    // 見込額合計（desired_priceは数値文字列なので単純にキャスト）
    const totalValue = await c.env.DB.prepare(`
      SELECT 
        SUM(CAST(desired_price AS INTEGER)) as total
      FROM deals
      WHERE desired_price IS NOT NULL 
        AND desired_price != ''
        AND CAST(desired_price AS INTEGER) > 0
        AND status IN ('IN_REVIEW', 'REPLIED')
    `).first();

    // 今月の新規案件
    const newDealsThisMonth = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM deals
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).first();

    // 今月の完了件数（CLOSEDステータス）
    const closedThisMonth = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM deals
      WHERE status = 'CLOSED'
        AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')
    `).first();

    // アクティブユーザー数（過去30日間にメッセージを送信したユーザー）
    const activeUsers = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT sender_id) as count
      FROM messages
      WHERE created_at >= datetime('now', '-30 days')
    `).first();

    // メッセージ統計
    const totalMessages = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM messages
    `).first();

    const messagesThisWeek = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE created_at >= datetime('now', '-7 days')
    `).first();

    // ファイル統計（is_archived = 0 のみカウント）
    const totalFiles = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM files WHERE is_archived = 0
    `).first();

    const filesThisMonth = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM files
      WHERE created_at >= datetime('now', '-30 days')
        AND is_archived = 0
    `).first();

    return c.json({
      deals: {
        total: totalDeals?.count || 0,
        byStatus: dealsByStatus.results,
        totalValue: totalValue?.total || 0,
        newThisMonth: newDealsThisMonth?.count || 0,
        closedThisMonth: closedThisMonth?.count || 0,
      },
      users: {
        activeUsers: activeUsers?.count || 0,
      },
      messages: {
        total: totalMessages?.count || 0,
        thisWeek: messagesThisWeek?.count || 0,
      },
      files: {
        total: totalFiles?.count || 0,
        thisMonth: filesThisMonth?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to get KPI dashboard:', error);
    console.error('Error details:', error.message || error);
    console.error('Error stack:', error.stack);
    return c.json({ 
      error: 'KPIダッシュボードの取得に失敗しました',
      details: error.message || String(error)
    }, 500);
  }
});

// 月次レポート
app.get('/reports/monthly', async (c) => {
  const { year, month } = c.req.query();
  
  if (!year || !month) {
    return c.json({ error: 'year と month パラメータが必要です' }, 400);
  }

  const targetMonth = `${year}-${month.padStart(2, '0')}`;

  try {
    // 新規案件数
    const newDeals = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM deals
      WHERE strftime('%Y-%m', created_at) = ?
    `).bind(targetMonth).first();

    // 成約件数
    const contractedDeals = await c.env.DB.prepare(`
      SELECT COUNT(*) as count, SUM(estimated_value) as total_value
      FROM deals
      WHERE status = 'contracted'
        AND strftime('%Y-%m', updated_at) = ?
    `).bind(targetMonth).first();

    // 進行中案件数
    const activeDeals = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM deals
      WHERE status IN ('investigating', 'negotiating')
        AND strftime('%Y-%m', created_at) <= ?
    `).bind(targetMonth + '-31').first();

    // メッセージ数
    const messages = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE strftime('%Y-%m', created_at) = ?
    `).bind(targetMonth).first();

    // アップロードファイル数
    const files = await c.env.DB.prepare(`
      SELECT COUNT(*) as count, SUM(size) as total_size
      FROM files
      WHERE strftime('%Y-%m', created_at) = ?
        AND deleted_at IS NULL
    `).bind(targetMonth).first();

    // ユーザーアクティビティ
    const activeUsers = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM messages
      WHERE strftime('%Y-%m', created_at) = ?
    `).bind(targetMonth).first();

    return c.json({
      period: {
        year: parseInt(year),
        month: parseInt(month),
      },
      deals: {
        new: newDeals?.count || 0,
        contracted: contractedDeals?.count || 0,
        contractedValue: contractedDeals?.total_value || 0,
        active: activeDeals?.count || 0,
      },
      activity: {
        messages: messages?.count || 0,
        files: files?.count || 0,
        filesSize: files?.total_size || 0,
        activeUsers: activeUsers?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('Failed to generate monthly report:', error);
    return c.json({ error: '月次レポートの生成に失敗しました' }, 500);
  }
});

// ステータス推移分析（エイリアス: /status-trendsで簡単にアクセス可能）
app.get('/status-trends', async (c) => {
  const { days = '30' } = c.req.query();
  
  try {
    const daysInt = parseInt(days);
    
    // 期間内のステータス別推移
    const statusTrend = await c.env.DB.prepare(`
      SELECT 
        DATE(created_at) as date,
        status,
        COUNT(*) as count
      FROM deals
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY date, status
      ORDER BY date, status
    `).bind(daysInt).all();
    
    // 現在のステータス分布
    const currentStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM deals
      GROUP BY status
    `).all();
    
    // 成約率推移
    const conversionRate = await c.env.DB.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed,
        ROUND(CAST(SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 2) as rate
      FROM deals
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY date
      ORDER BY date
    `).bind(daysInt).all();
    
    return c.json({
      success: true,
      data: {
        statusTrend: statusTrend.results,
        currentStatus: currentStatus.results,
        conversionRate: conversionRate.results
      },
      metadata: {
        days: daysInt,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Failed to get status trends:', error);
    return c.json({ 
      success: false,
      error: 'ステータス推移データの取得に失敗しました',
      message: error.message 
    }, 500);
  }
});

// トレンド分析 - 案件推移（拡張版）
app.get('/trends/deals', async (c) => {
  const { period = '12', granularity = 'month' } = c.req.query(); // デフォルト12ヶ月、月単位

  try {
    const periods = parseInt(period);
    
    // 期間単位の決定（日、週、月）
    let dateFormat = '%Y-%m'; // 月単位
    let periodUnit = 'months';
    
    if (granularity === 'day') {
      dateFormat = '%Y-%m-%d';
      periodUnit = 'days';
    } else if (granularity === 'week') {
      dateFormat = '%Y-W%W';
      periodUnit = 'days';
    }
    
    // 月別/週別/日別の新規案件数
    const newDeals = await c.env.DB.prepare(`
      SELECT 
        strftime(?, created_at) as period,
        COUNT(*) as count
      FROM deals
      WHERE created_at >= datetime('now', '-' || ? || ' ' || ?)
      GROUP BY period
      ORDER BY period
    `).bind(dateFormat, periods, periodUnit).all();

    // 月別/週別/日別の成約件数
    const contractedDeals = await c.env.DB.prepare(`
      SELECT 
        strftime(?, updated_at) as period,
        COUNT(*) as count,
        SUM(desired_price) as total_value,
        AVG(desired_price) as avg_value
      FROM deals
      WHERE status = 'CONTRACTED'
        AND updated_at >= datetime('now', '-' || ? || ' ' || ?)
      GROUP BY period
      ORDER BY period
    `).bind(dateFormat, periods, periodUnit).all();

    // ステータス別推移（積み上げグラフ用）
    const statusTrend = await c.env.DB.prepare(`
      SELECT 
        strftime(?, created_at) as period,
        status,
        COUNT(*) as count
      FROM deals
      WHERE created_at >= datetime('now', '-' || ? || ' ' || ?)
      GROUP BY period, status
      ORDER BY period, status
    `).bind(dateFormat, periods, periodUnit).all();

    // 各ステータスの現在の件数
    const currentStatusCount = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM deals
      GROUP BY status
    `).all();

    // ステータス遷移分析（NEW → REVIEWING → NEGOTIATING → CONTRACTED）
    const statusTransitions = await c.env.DB.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(julianday(updated_at) - julianday(created_at)) as avg_days
      FROM deals
      WHERE created_at >= datetime('now', '-' || ? || ' ' || ?)
      GROUP BY status
    `).bind(periods, periodUnit).all();

    // 成約率推移
    const conversionTrend = await c.env.DB.prepare(`
      SELECT 
        strftime(?, created_at) as period,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as contracted,
        ROUND(CAST(SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 2) as conversion_rate
      FROM deals
      WHERE created_at >= datetime('now', '-' || ? || ' ' || ?)
      GROUP BY period
      ORDER BY period
    `).bind(dateFormat, periods, periodUnit).all();

    return c.json({
      newDeals: newDeals.results,
      contractedDeals: contractedDeals.results,
      statusTrend: statusTrend.results,
      currentStatusCount: currentStatusCount.results,
      statusTransitions: statusTransitions.results,
      conversionTrend: conversionTrend.results,
      metadata: {
        period: periods,
        granularity,
        unit: periodUnit
      }
    });
  } catch (error: any) {
    console.error('Failed to get deal trends:', error);
    return c.json({ error: 'トレンドデータの取得に失敗しました' }, 500);
  }
});

// トレンド分析 - ユーザーアクティビティ
app.get('/trends/activity', async (c) => {
  const { period = '30' } = c.req.query(); // デフォルト30日

  try {
    const days = parseInt(period);
    
    // 日別のメッセージ数
    const messageActivity = await c.env.DB.prepare(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as active_users
      FROM messages
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY date
      ORDER BY date
    `).bind(days).all();

    // 日別のファイルアップロード数
    const fileActivity = await c.env.DB.prepare(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as count,
        SUM(size) as total_size
      FROM files
      WHERE created_at >= datetime('now', '-' || ? || ' days')
        AND deleted_at IS NULL
      GROUP BY date
      ORDER BY date
    `).bind(days).all();

    // ユーザー別のアクティビティランキング
    const topUsers = await c.env.DB.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(m.id) as message_count,
        COUNT(DISTINCT m.deal_id) as active_deals
      FROM users u
      LEFT JOIN messages m ON u.id = m.user_id 
        AND m.created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY u.id
      ORDER BY message_count DESC
      LIMIT 10
    `).bind(days).all();

    return c.json({
      messageActivity: messageActivity.results,
      fileActivity: fileActivity.results,
      topUsers: topUsers.results,
    });
  } catch (error: any) {
    console.error('Failed to get activity trends:', error);
    return c.json({ error: 'アクティビティデータの取得に失敗しました' }, 500);
  }
});

// 成約率分析
app.get('/analytics/conversion', async (c) => {
  try {
    // 全案件の成約率
    const totalDeals = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM deals
    `).first();

    const contractedDeals = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM deals WHERE status = 'contracted'
    `).first();

    const conversionRate = totalDeals && totalDeals.count > 0
      ? (contractedDeals?.count || 0) / totalDeals.count * 100
      : 0;

    // ステータス別の案件数
    const dealsByStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM deals
      GROUP BY status
    `).all();

    // 平均成約期間（調査中から契約まで）
    const avgContractTime = await c.env.DB.prepare(`
      SELECT AVG(julianday(updated_at) - julianday(created_at)) as avg_days
      FROM deals
      WHERE status = 'contracted'
    `).first();

    return c.json({
      conversionRate: conversionRate.toFixed(2),
      totalDeals: totalDeals?.count || 0,
      contractedDeals: contractedDeals?.count || 0,
      dealsByStatus: dealsByStatus.results,
      avgContractDays: Math.round(avgContractTime?.avg_days || 0),
    });
  } catch (error: any) {
    console.error('Failed to get conversion analytics:', error);
    return c.json({ error: '成約率分析の取得に失敗しました' }, 500);
  }
});

// エクスポート - CSV形式でレポートをエクスポート（拡張版）
app.get('/export/deals', async (c) => {
  const { format = 'json', status, from_date, to_date } = c.req.query();

  try {
    // フィルター条件を構築
    let query = `
      SELECT 
        d.*,
        u.name as created_by_name,
        seller.name as seller_name,
        buyer.name as buyer_name
      FROM deals d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users seller ON d.seller_id = seller.id
      LEFT JOIN users buyer ON d.buyer_id = buyer.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }
    
    if (from_date) {
      query += ' AND d.created_at >= ?';
      params.push(from_date);
    }
    
    if (to_date) {
      query += ' AND d.created_at <= ?';
      params.push(to_date);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const { results: deals } = await c.env.DB.prepare(query).bind(...params).all();

    if (format === 'csv') {
      // 詳細なCSV形式で出力
      const headers = [
        'ID', 'タイトル', 'ステータス', '所在地', '最寄り駅', '徒歩分', 
        '土地面積', '建物面積', '用途地域', '建蔽率', '容積率', 
        '希望価格', '構造', '築年', '道路情報', '現況', 
        '売主', '買主', '作成者', '作成日', '更新日'
      ];
      
      const statusMap: Record<string, string> = {
        'NEW': '新規',
        'REVIEWING': 'レビュー中',
        'NEGOTIATING': '交渉中',
        'CONTRACTED': '契約済み',
        'REJECTED': '却下'
      };
      
      const rows = deals.map((d: any) => [
        d.id,
        d.title || '',
        statusMap[d.status] || d.status,
        d.location || '',
        d.station || '',
        d.walk_minutes || '',
        d.land_area || '',
        d.building_area || '',
        d.zoning || '',
        d.building_coverage || '',
        d.floor_area_ratio || '',
        d.desired_price || '',
        d.structure || '',
        d.built_year || '',
        d.road_info || '',
        d.current_status || '',
        d.seller_name || '',
        d.buyer_name || '',
        d.created_by_name || '',
        d.created_at || '',
        d.updated_at || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const filename = `deals-export-${new Date().toISOString().split('T')[0]}.csv`;

      return new Response('\uFEFF' + csv, {  // UTF-8 BOM for Excel compatibility
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return c.json({ deals });
  } catch (error: any) {
    console.error('Failed to export deals:', error);
    return c.json({ error: 'データのエクスポートに失敗しました' }, 500);
  }
});

// KPIレポートのエクスポート
app.get('/export/kpi-report', async (c) => {
  try {
    const { period = '30' } = c.req.query();
    const daysInt = parseInt(period);
    
    // 全体統計
    const totalDeals = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM deals
    `).first();

    const dealsByStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM deals
      GROUP BY status
    `).all();
    
    // エージェント別統計
    const agentStats = await c.env.DB.prepare(`
      SELECT 
        u.name as agent_name,
        COUNT(d.id) as total_deals,
        SUM(CASE WHEN d.status = 'CONTRACTED' THEN 1 ELSE 0 END) as contracted_deals
      FROM users u
      LEFT JOIN deals d ON u.id = d.seller_id
      WHERE u.role = 'AGENT'
        AND (d.created_at IS NULL OR d.created_at >= datetime('now', '-' || ? || ' days'))
      GROUP BY u.name
      ORDER BY total_deals DESC
    `).bind(daysInt).all();
    
    // CSV形式でレポート生成
    const headers = ['エージェント名', '総案件数', '成約件数', '成約率'];
    const rows = (agentStats.results as any[]).map((agent: any) => {
      const successRate = agent.total_deals > 0 
        ? ((agent.contracted_deals / agent.total_deals) * 100).toFixed(2) 
        : '0.00';
      return [
        agent.agent_name,
        agent.total_deals,
        agent.contracted_deals,
        `${successRate}%`
      ];
    });

    const csv = [
      `KPIレポート - ${new Date().toISOString().split('T')[0]}`,
      `対象期間: 過去${daysInt}日間`,
      '',
      `総案件数: ${totalDeals?.count || 0}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const filename = `kpi-report-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response('\uFEFF' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Failed to export KPI report:', error);
    return c.json({ error: 'KPIレポートのエクスポートに失敗しました' }, 500);
  }
});

// 月次レポートのエクスポート
app.get('/export/monthly-report', async (c) => {
  try {
    const { year, month } = c.req.query();
    
    if (!year || !month) {
      return c.json({ error: 'year と month パラメータが必要です' }, 400);
    }

    const targetMonth = `${year}-${month.padStart(2, '0')}`;
    
    // 月次統計
    const newDeals = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM deals
      WHERE strftime('%Y-%m', created_at) = ?
    `).bind(targetMonth).first();

    const contractedDeals = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as count,
        AVG(CASE 
          WHEN desired_price IS NOT NULL AND desired_price != '' 
          THEN CAST(desired_price AS INTEGER) 
          ELSE 0 
        END) as avg_price
      FROM deals
      WHERE status = 'CONTRACTED'
        AND strftime('%Y-%m', updated_at) = ?
    `).bind(targetMonth).first();
    
    const dealsByStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM deals
      WHERE strftime('%Y-%m', created_at) = ?
      GROUP BY status
    `).bind(targetMonth).all();

    // CSV形式でレポート生成
    const statusMap: Record<string, string> = {
      'NEW': '新規',
      'REVIEWING': 'レビュー中',
      'NEGOTIATING': '交渉中',
      'CONTRACTED': '契約済み',
      'REJECTED': '却下'
    };
    
    const csv = [
      `月次レポート - ${year}年${month}月`,
      '',
      '■ 案件統計',
      `新規案件数,${newDeals?.count || 0}`,
      `成約件数,${contractedDeals?.count || 0}`,
      `平均成約価格,${Math.round(contractedDeals?.avg_price || 0).toLocaleString()}円`,
      '',
      '■ ステータス別案件数',
      'ステータス,件数',
      ...(dealsByStatus.results as any[]).map((s: any) => 
        `${statusMap[s.status] || s.status},${s.count}`
      )
    ].join('\n');

    const filename = `monthly-report-${year}-${month}.csv`;

    return new Response('\uFEFF' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Failed to export monthly report:', error);
    return c.json({ error: '月次レポートのエクスポートに失敗しました' }, 500);
  }
});

// エージェント別パフォーマンス分析
app.get('/kpi/agents', async (c) => {
  try {
    const { period = '30' } = c.req.query();
    const daysInt = parseInt(period);
    
    // エージェント別の案件数とステータス分布
    const agentPerformance = await c.env.DB.prepare(`
      SELECT 
        u.id as agent_id,
        u.name as agent_name,
        u.email as agent_email,
        COUNT(d.id) as total_deals,
        SUM(CASE WHEN d.status = 'NEW' THEN 1 ELSE 0 END) as new_deals,
        SUM(CASE WHEN d.status = 'REVIEWING' THEN 1 ELSE 0 END) as reviewing_deals,
        SUM(CASE WHEN d.status = 'NEGOTIATING' THEN 1 ELSE 0 END) as negotiating_deals,
        SUM(CASE WHEN d.status = 'CONTRACTED' THEN 1 ELSE 0 END) as contracted_deals,
        SUM(CASE WHEN d.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_deals,
        ROUND(CAST(SUM(CASE WHEN d.status = 'CONTRACTED' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(d.id) * 100, 2) as success_rate
      FROM users u
      LEFT JOIN deals d ON u.id = d.seller_id
      WHERE u.role = 'AGENT'
        AND (d.created_at IS NULL OR d.created_at >= datetime('now', '-' || ? || ' days'))
      GROUP BY u.id, u.name, u.email
      ORDER BY total_deals DESC
    `).bind(daysInt).all();
    
    // 全体のサマリー
    const totalStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT seller_id) as active_agents,
        COUNT(*) as total_deals,
        SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as contracted_deals,
        ROUND(CAST(SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 2) as overall_success_rate
      FROM deals
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `).bind(daysInt).first();
    
    return c.json({
      success: true,
      data: {
        agents: agentPerformance.results,
        summary: totalStats
      },
      metadata: {
        period_days: daysInt,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Failed to get agent performance:', error);
    return c.json({ 
      error: 'エージェント別分析の取得に失敗しました',
      details: error.message || String(error)
    }, 500);
  }
});

// エリア別統計分析
app.get('/kpi/areas', async (c) => {
  try {
    const { limit = '10' } = c.req.query();
    const limitInt = parseInt(limit);
    
    // 都道府県別の案件分布
    const prefectureStats = await c.env.DB.prepare(`
      SELECT 
        SUBSTR(location, 1, 3) as prefecture,
        COUNT(*) as deal_count,
        SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as contracted_count,
        AVG(CASE 
          WHEN desired_price IS NOT NULL AND desired_price != '' 
          THEN CAST(desired_price AS INTEGER) 
          ELSE 0 
        END) as avg_price
      FROM deals
      WHERE location IS NOT NULL AND location != ''
      GROUP BY SUBSTR(location, 1, 3)
      ORDER BY deal_count DESC
      LIMIT ?
    `).bind(limitInt).all();
    
    // 市区町村別の詳細統計（上位）
    const cityStats = await c.env.DB.prepare(`
      SELECT 
        location,
        station,
        COUNT(*) as deal_count,
        SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as contracted_count,
        AVG(CASE 
          WHEN desired_price IS NOT NULL AND desired_price != '' 
          THEN CAST(desired_price AS INTEGER) 
          ELSE 0 
        END) as avg_price
      FROM deals
      WHERE location IS NOT NULL AND location != ''
      GROUP BY location, station
      ORDER BY deal_count DESC
      LIMIT ?
    `).bind(limitInt).all();
    
    // 最寄り駅別の統計
    const stationStats = await c.env.DB.prepare(`
      SELECT 
        station,
        COUNT(*) as deal_count,
        AVG(CASE 
          WHEN walk_minutes IS NOT NULL AND walk_minutes != '' 
          THEN CAST(walk_minutes AS INTEGER) 
          ELSE 0 
        END) as avg_walk_minutes,
        AVG(CASE 
          WHEN desired_price IS NOT NULL AND desired_price != '' 
          THEN CAST(desired_price AS INTEGER) 
          ELSE 0 
        END) as avg_price
      FROM deals
      WHERE station IS NOT NULL AND station != ''
      GROUP BY station
      ORDER BY deal_count DESC
      LIMIT ?
    `).bind(limitInt).all();
    
    return c.json({
      success: true,
      data: {
        prefectures: prefectureStats.results,
        cities: cityStats.results,
        stations: stationStats.results
      },
      metadata: {
        limit: limitInt,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Failed to get area statistics:', error);
    return c.json({ 
      error: 'エリア別統計の取得に失敗しました',
      details: error.message || String(error)
    }, 500);
  }
});

// 時系列トレンド詳細分析（週次、月次）
app.get('/kpi/trends/detailed', async (c) => {
  try {
    const { period = '90', granularity = 'week' } = c.req.query();
    const daysInt = parseInt(period);
    
    let dateFormat: string;
    let groupByClause: string;
    
    if (granularity === 'day') {
      dateFormat = '%Y-%m-%d';
      groupByClause = 'date';
    } else if (granularity === 'week') {
      dateFormat = '%Y-W%W'; // Year-Week format
      groupByClause = 'week';
    } else { // month
      dateFormat = '%Y-%m';
      groupByClause = 'month';
    }
    
    // 案件作成数の推移
    const dealTrend = await c.env.DB.prepare(`
      SELECT 
        strftime(?, created_at) as period,
        COUNT(*) as deal_count,
        SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN status = 'REVIEWING' THEN 1 ELSE 0 END) as reviewing_count,
        SUM(CASE WHEN status = 'NEGOTIATING' THEN 1 ELSE 0 END) as negotiating_count,
        SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as contracted_count,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count
      FROM deals
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY period
      ORDER BY period
    `).bind(dateFormat, daysInt).all();
    
    // メッセージ数の推移
    const messageTrend = await c.env.DB.prepare(`
      SELECT 
        strftime(?, created_at) as period,
        COUNT(*) as message_count,
        COUNT(DISTINCT sender_id) as active_users
      FROM messages
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY period
      ORDER BY period
    `).bind(dateFormat, daysInt).all();
    
    // 平均成約価格の推移
    const priceTrend = await c.env.DB.prepare(`
      SELECT 
        strftime(?, created_at) as period,
        AVG(CASE 
          WHEN desired_price IS NOT NULL AND desired_price != '' 
          THEN CAST(desired_price AS INTEGER) 
          ELSE 0 
        END) as avg_price,
        MIN(CASE 
          WHEN desired_price IS NOT NULL AND desired_price != '' 
          THEN CAST(desired_price AS INTEGER) 
          ELSE 0 
        END) as min_price,
        MAX(CASE 
          WHEN desired_price IS NOT NULL AND desired_price != '' 
          THEN CAST(desired_price AS INTEGER) 
          ELSE 0 
        END) as max_price
      FROM deals
      WHERE created_at >= datetime('now', '-' || ? || ' days')
        AND desired_price IS NOT NULL 
        AND desired_price != ''
      GROUP BY period
      ORDER BY period
    `).bind(dateFormat, daysInt).all();
    
    return c.json({
      success: true,
      data: {
        deals: dealTrend.results,
        messages: messageTrend.results,
        prices: priceTrend.results
      },
      metadata: {
        period_days: daysInt,
        granularity: granularity,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Failed to get detailed trends:', error);
    return c.json({ 
      error: '詳細トレンド分析の取得に失敗しました',
      details: error.message || String(error)
    }, 500);
  }
});

// 買取条件マッチング分析
app.get('/kpi/matching', async (c) => {
  try {
    // 希望価格帯別の案件分布
    const priceDistribution = await c.env.DB.prepare(`
      SELECT 
        CASE 
          WHEN CAST(desired_price AS INTEGER) < 1000 THEN '1000万円未満'
          WHEN CAST(desired_price AS INTEGER) < 3000 THEN '1000-3000万円'
          WHEN CAST(desired_price AS INTEGER) < 5000 THEN '3000-5000万円'
          WHEN CAST(desired_price AS INTEGER) < 10000 THEN '5000万円-1億円'
          ELSE '1億円以上'
        END as price_range,
        COUNT(*) as deal_count
      FROM deals
      WHERE desired_price IS NOT NULL 
        AND desired_price != ''
        AND CAST(desired_price AS INTEGER) > 0
      GROUP BY price_range
      ORDER BY MIN(CAST(desired_price AS INTEGER))
    `).all();
    
    // 土地面積帯別の分布
    const areaDistribution = await c.env.DB.prepare(`
      SELECT 
        CASE 
          WHEN CAST(land_area AS REAL) < 50 THEN '50㎡未満'
          WHEN CAST(land_area AS REAL) < 100 THEN '50-100㎡'
          WHEN CAST(land_area AS REAL) < 200 THEN '100-200㎡'
          WHEN CAST(land_area AS REAL) < 500 THEN '200-500㎡'
          ELSE '500㎡以上'
        END as area_range,
        COUNT(*) as deal_count
      FROM deals
      WHERE land_area IS NOT NULL 
        AND land_area != ''
        AND CAST(land_area AS REAL) > 0
      GROUP BY area_range
      ORDER BY MIN(CAST(land_area AS REAL))
    `).all();
    
    // 用途地域別の統計
    const zoningStats = await c.env.DB.prepare(`
      SELECT 
        zoning,
        COUNT(*) as deal_count,
        AVG(CASE 
          WHEN desired_price IS NOT NULL AND desired_price != '' 
          THEN CAST(desired_price AS INTEGER) 
          ELSE 0 
        END) as avg_price
      FROM deals
      WHERE zoning IS NOT NULL AND zoning != ''
      GROUP BY zoning
      ORDER BY deal_count DESC
      LIMIT 10
    `).all();
    
    return c.json({
      success: true,
      data: {
        price_distribution: priceDistribution.results,
        area_distribution: areaDistribution.results,
        zoning_stats: zoningStats.results
      },
      metadata: {
        generated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Failed to get matching analysis:', error);
    return c.json({ 
      error: 'マッチング分析の取得に失敗しました',
      details: error.message || String(error)
    }, 500);
  }
});

// CSVエクスポート - 案件一覧
app.get('/export/deals/csv', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.userId;
    const userRole = c.get('jwtPayload')?.role;
    
    if (!userId || !userRole) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    // フィルタリングパラメータ
    const status = c.req.query('status');
    const fromDate = c.req.query('from_date');
    const toDate = c.req.query('to_date');
    
    let query = 'SELECT * FROM deals WHERE 1=1';
    const params: any[] = [];
    
    // 管理者以外は自分の案件のみ
    if (userRole !== 'ADMIN') {
      query += ' AND seller_id = ?';
      params.push(userId);
    }
    
    // ステータスフィルター
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    // 日付範囲フィルター
    if (fromDate) {
      query += ' AND created_at >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      query += ' AND created_at <= ?';
      params.push(toDate);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    const deals = result.results || [];
    
    // CSVヘッダー
    const headers = [
      'ID', 'タイトル', 'ステータス', '所在地', '最寄駅', '徒歩分', 
      '土地面積', '用途地域', '建ぺい率', '容積率', '希望価格', 
      '作成日時', '更新日時'
    ];
    
    // CSVデータ生成
    let csvContent = headers.join(',') + '\n';
    
    for (const deal of deals) {
      const row = [
        deal.id,
        `"${(deal.title || '').replace(/"/g, '""')}"`,
        deal.status,
        `"${(deal.location || '').replace(/"/g, '""')}"`,
        `"${(deal.station || '').replace(/"/g, '""')}"`,
        deal.walk_minutes || '',
        deal.land_area || '',
        `"${(deal.zoning || '').replace(/"/g, '""')}"`,
        deal.building_coverage || '',
        deal.floor_area_ratio || '',
        deal.desired_price || '',
        deal.created_at || '',
        deal.updated_at || ''
      ];
      csvContent += row.join(',') + '\n';
    }
    
    // CSVレスポンス
    return c.text(csvContent, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="deals_${new Date().toISOString().split('T')[0]}.csv"`
    });
  } catch (error: any) {
    console.error('Failed to export deals CSV:', error);
    return c.json({ 
      error: '案件データのCSVエクスポートに失敗しました',
      details: error.message || String(error)
    }, 500);
  }
});

// CSVエクスポート - KPIサマリー
app.get('/export/kpi/csv', async (c) => {
  try {
    // ステータス別集計
    const statusCount = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM deals
      GROUP BY status
      ORDER BY count DESC
    `).all();
    
    // 月別集計（過去12ヶ月）
    const monthlyStats = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as total_deals,
        SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as contracted_deals,
        AVG(CASE 
          WHEN desired_price IS NOT NULL AND desired_price != '' 
          THEN CAST(desired_price AS INTEGER) 
          ELSE 0 
        END) as avg_price
      FROM deals
      WHERE created_at >= datetime('now', '-12 months')
      GROUP BY month
      ORDER BY month DESC
    `).all();
    
    // CSVヘッダーとデータ生成
    let csvContent = 'KPIサマリーレポート\n\n';
    
    // ステータス別集計
    csvContent += 'ステータス,件数\n';
    for (const row of (statusCount.results || [])) {
      csvContent += `"${row.status}",${row.count}\n`;
    }
    
    csvContent += '\n月別統計\n';
    csvContent += '月,総案件数,成約件数,平均価格\n';
    for (const row of (monthlyStats.results || [])) {
      csvContent += `${row.month},${row.total_deals},${row.contracted_deals},${Math.round(row.avg_price as number || 0)}\n`;
    }
    
    return c.text(csvContent, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kpi_summary_${new Date().toISOString().split('T')[0]}.csv"`
    });
  } catch (error: any) {
    console.error('Failed to export KPI CSV:', error);
    return c.json({ 
      error: 'KPIデータのCSVエクスポートに失敗しました',
      details: error.message || String(error)
    }, 500);
  }
});

export default app;
