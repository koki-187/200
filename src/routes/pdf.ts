import { Hono } from 'hono';
import type { Bindings } from '../types';
import { Database } from '../db/queries';
import { prepareDealReportData } from '../utils/pdf';

const pdf = new Hono<{ Bindings: Bindings }>();

// 案件レポート用のデータ取得API
pdf.get('/deal/:id/data', async (c) => {
  try {
    const dealId = c.req.param('id');
    const db = new Database(c.env.DB);

    // 案件情報取得
    const deal = await db.getDealById(dealId);
    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    // ユーザー情報取得
    const buyer = await db.getUserById(deal.buyer_id);
    const seller = await db.getUserById(deal.seller_id);

    // メッセージ取得
    const messages = await db.getMessagesByDeal(dealId);
    
    // メッセージに送信者情報を追加
    const messagesWithSender = await Promise.all(
      messages.map(async (msg) => {
        const sender = await db.getUserById(msg.sender_id);
        return {
          ...msg,
          sender_name: sender?.name || 'Unknown',
          sender_role: sender?.role || 'USER'
        };
      })
    );

    // ファイル取得
    const files = await db.getFilesByDeal(dealId);

    // AI提案取得
    const proposals = await db.getProposalsByDeal(dealId);
    const latestProposal = proposals.length > 0 ? proposals[0] : null;

    // データ整形
    const reportData = prepareDealReportData(
      deal,
      buyer,
      seller,
      messagesWithSender,
      files,
      latestProposal
    );

    return c.json({ 
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('PDF data generation error:', error);
    return c.json({ 
      error: 'Failed to generate PDF data',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 複数案件のサマリーデータ取得（一覧レポート用）
pdf.get('/deals/summary', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    
    const db = new Database(c.env.DB);
    
    // ユーザーロールに応じて案件を取得
    let deals;
    if (userRole === 'ADMIN') {
      deals = await db.getAllDeals();
    } else {
      deals = await db.getDealsBySeller(userId);
    }

    // 各案件の基本情報とメッセージ数、ファイル数を集計
    const summary = await Promise.all(
      deals.map(async (deal) => {
        const messages = await db.getMessagesByDeal(deal.id);
        const files = await db.getFilesByDeal(deal.id);
        const buyer = await db.getUserById(deal.buyer_id);
        const seller = await db.getUserById(deal.seller_id);

        return {
          id: deal.id,
          title: deal.title,
          status: deal.status,
          location: deal.location,
          response_deadline: deal.response_deadline,
          created_at: deal.created_at,
          buyer_name: buyer?.name || 'Unknown',
          seller_name: seller?.name || 'Unknown',
          message_count: messages.length,
          file_count: files.length
        };
      })
    );

    return c.json({ 
      success: true,
      data: summary,
      total_deals: summary.length
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    return c.json({ 
      error: 'Failed to generate summary',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default pdf;
