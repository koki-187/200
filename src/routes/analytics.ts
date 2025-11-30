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

    // アクティブユーザー数
    const activeUsers = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
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

    // ファイル統計
    const totalFiles = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM files WHERE deleted_at IS NULL
    `).first();

    const filesThisMonth = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM files
      WHERE created_at >= datetime('now', '-30 days')
        AND deleted_at IS NULL
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

// エクスポート - CSV形式でレポートをエクスポート
app.get('/export/deals', async (c) => {
  const { format = 'json' } = c.req.query();

  try {
    const { results: deals } = await c.env.DB.prepare(`
      SELECT 
        d.*,
        u.name as created_by_name
      FROM deals d
      LEFT JOIN users u ON d.created_by = u.id
      ORDER BY d.created_at DESC
    `).all();

    if (format === 'csv') {
      // CSV形式で出力
      const headers = ['ID', 'タイトル', 'ステータス', '予想金額', '作成者', '作成日'];
      const rows = deals.map((d: any) => [
        d.id,
        d.title,
        d.status,
        d.estimated_value || 0,
        d.created_by_name,
        d.created_at,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="deals-export.csv"',
        },
      });
    }

    return c.json({ deals });
  } catch (error: any) {
    console.error('Failed to export deals:', error);
    return c.json({ error: 'データのエクスポートに失敗しました' }, 500);
  }
});

export default app;
