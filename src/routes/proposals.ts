import { Hono } from 'hono';
import { Bindings } from '../types';
import { Database } from '../db/queries';
import { authMiddleware } from '../utils/auth';
import { nanoid } from 'nanoid';

const proposals = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
proposals.use('*', authMiddleware);

// AI提案生成
proposals.post('/deals/:dealId', async (c) => {
  try {
    const dealId = c.param('dealId');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    
    const body = await c.req.json();

    const db = new Database(c.env.DB);
    const deal = await db.getDealById(dealId);

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    // 権限チェック（管理者のみ）
    if (role !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    // OpenAI APIで提案生成
    const prompt = `
あなたは不動産投資のプロフェッショナルアドバイザーです。
以下の物件情報を元に、買主向けの提案を作成してください。

【物件情報】
- 所在地: ${deal.location || '未入力'}
- 最寄駅: ${deal.station || '未入力'} 徒歩${deal.walk_minutes || '?'}分
- 土地面積: ${deal.land_area || '未入力'}
- 用途地域: ${deal.zoning || '未入力'}
- 建蔽率/容積率: ${deal.building_coverage || '?'}% / ${deal.floor_area_ratio || '?'}%
- 接道状況: ${deal.road_info || '未入力'}
- 現況: ${deal.current_status || '未入力'}
- 希望価格: ${deal.desired_price || '未入力'}

【買主プロファイル】
${JSON.stringify(body.buyer_profile, null, 2)}

【収支データ】
${JSON.stringify(body.cf_data, null, 2)}

以下の形式でJSON形式で回答してください：
{
  "summary": "提案サマリー（3行程度）",
  "strengths": ["強み1", "強み2", "強み3"],
  "risks": ["留意点1", "留意点2", "留意点3"],
  "cf_summary": "収支まとめ（表面利回り、実質利回り等）",
  "proposal_text": "提案本文（詳細な説明）",
  "meeting_points": ["面談ポイント1", "面談ポイント2", "面談ポイント3"],
  "email_draft": "メール文面のドラフト"
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'あなたは不動産投資の専門家です。JSON形式で回答してください。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // JSONをパース
    let proposalData;
    try {
      proposalData = JSON.parse(content);
    } catch (e) {
      // JSONパースに失敗した場合のフォールバック
      proposalData = {
        summary: '提案生成中にエラーが発生しました',
        strengths: ['データ処理中'],
        risks: ['再度お試しください'],
        cf_summary: '計算中',
        proposal_text: content,
        meeting_points: ['面談でご説明します'],
        email_draft: '自動生成に失敗しました'
      };
    }

    // データベースに保存
    const proposalId = nanoid();
    await c.env.DB
      .prepare(`
        INSERT INTO proposals (
          id, deal_id, buyer_profile, cf_data, summary, strengths,
          risks, cf_summary, proposal_text, meeting_points, email_draft
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        proposalId,
        dealId,
        JSON.stringify(body.buyer_profile),
        JSON.stringify(body.cf_data),
        proposalData.summary,
        JSON.stringify(proposalData.strengths),
        JSON.stringify(proposalData.risks),
        proposalData.cf_summary,
        proposalData.proposal_text,
        JSON.stringify(proposalData.meeting_points),
        proposalData.email_draft
      )
      .run();

    return c.json({
      id: proposalId,
      ...proposalData
    });
  } catch (error) {
    console.error('Generate proposal error:', error);
    return c.json({
      error: 'Failed to generate proposal',
      fallback: {
        summary: '提案書を生成できませんでした',
        strengths: ['物件の詳細情報をご確認ください'],
        risks: ['システムエラーが発生しました'],
        cf_summary: '収支計算は手動でお願いします',
        proposal_text: 'エラーが発生しました。再度お試しください。',
        meeting_points: ['直接ご相談ください'],
        email_draft: '自動生成に失敗しました'
      }
    }, 500);
  }
});

// 提案取得
proposals.get('/deals/:dealId/latest', async (c) => {
  try {
    const dealId = c.param('dealId');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';

    const db = new Database(c.env.DB);
    const deal = await db.getDealById(dealId);

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    if (role !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const proposal = await c.env.DB
      .prepare('SELECT * FROM proposals WHERE deal_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(dealId)
      .first();

    if (!proposal) {
      return c.json({ error: 'No proposal found' }, 404);
    }

    return c.json({ proposal });
  } catch (error) {
    console.error('Get proposal error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default proposals;
