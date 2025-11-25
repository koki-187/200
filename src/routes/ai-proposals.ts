import { Hono } from 'hono';
import type { Bindings } from '../types';
import { authMiddleware } from '../utils/auth';

const aiProposals = new Hono<{ Bindings: Bindings }>();

// AI提案生成（買主向け）
aiProposals.post('/generate', authMiddleware, async (c) => {
  try {
    const openaiApiKey = c.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API keyが設定されていません' }, 500);
    }

    const { dealData, buyerRequirements } = await c.req.json();

    if (!dealData) {
      return c.json({ error: '案件データが必要です' }, 400);
    }

    // AI提案生成プロンプト
    const proposalPrompt = `あなたは不動産投資の専門家です。以下の物件情報と買主の要望を基に、買主に最適な提案を生成してください。

【物件情報】
- 物件名: ${dealData.title || '未設定'}
- 所在地: ${dealData.location || '未設定'}
- 土地面積: ${dealData.land_area || '未設定'}
- 用途地域: ${dealData.zoning || '未設定'}
- 建ぺい率: ${dealData.building_coverage || '未設定'}
- 容積率: ${dealData.floor_area_ratio || '未設定'}
- 希望価格: ${dealData.desired_price || '未設定'}
- 現況: ${dealData.current_status || '未設定'}

【買主の要望】
${buyerRequirements || '特になし'}

以下の形式でJSON形式の提案を返してください：
{
  "investment_potential": "投資ポテンシャル評価（5段階評価と理由）",
  "strengths": ["強み1", "強み2", "強み3"],
  "risks": ["リスク1", "リスク2"],
  "recommended_use": "推奨活用方法（アパート、戸建て、駐車場等）",
  "expected_roi": "期待利回り（概算）",
  "development_plan": "開発プラン提案",
  "financing_suggestion": "資金調達アドバイス",
  "next_steps": ["次のステップ1", "次のステップ2", "次のステップ3"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは不動産投資の専門家で、買主に最適な提案を行います。'
          },
          {
            role: 'user',
            content: proposalPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return c.json({ error: 'AI提案生成に失敗しました' }, 500);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // JSONを抽出
    let proposal;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      proposal = JSON.parse(jsonString);
    } catch (e) {
      console.error('JSON parse error:', e);
      return c.json({ error: 'AI応答の解析に失敗しました', raw: content }, 500);
    }

    return c.json({
      success: true,
      proposal: proposal,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI proposal error:', error);
    return c.json({
      error: 'AI提案生成中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 提案履歴取得
aiProposals.get('/history/:dealId', authMiddleware, async (c) => {
  try {
    const dealId = c.req.param('dealId');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as string;
    const db = c.env.DB;
    
    // 案件の存在確認と権限チェック
    const deal = await db.prepare('SELECT * FROM deals WHERE id = ?').bind(dealId).first();
    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }
    
    // AGENTは自分の案件のみ、ADMINはすべて閲覧可能
    if (role === 'AGENT' && deal.seller_id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    // データベースから提案履歴を取得（作成日降順）
    const proposals = await db.prepare(`
      SELECT 
        id,
        buyer_profile,
        summary,
        strengths,
        risks,
        cf_summary,
        proposal_text,
        meeting_points,
        created_at,
        updated_at
      FROM proposals 
      WHERE deal_id = ? 
      ORDER BY created_at DESC
    `).bind(dealId).all();
    
    return c.json({
      dealId: dealId,
      proposals: proposals.results || []
    });
  } catch (error) {
    console.error('Get proposals history error:', error);
    return c.json({ 
      error: 'AI提案履歴の取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default aiProposals;
