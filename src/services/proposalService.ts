import type { Env, Deal, ProposalRequest } from '../types';

/**
 * 提案生成サービス - OpenAI GPTを使用して買主向け提案を生成
 */
export class ProposalService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * AI提案を生成
   */
  async generateProposal(deal: Deal, request: ProposalRequest): Promise<{
    summary: string;
    strengths: string[];
    risks: string[];
    cf_summary: string;
    proposal_text: string;
    meeting_points: string[];
    email_draft: string;
  }> {
    try {
      const prompt = this.buildPrompt(deal, request);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `あなたは不動産投資のプロフェッショナルアドバイザーです。
買主向けのアパート用地提案書を作成してください。
高級感のあるビジネス文体で、具体的かつ説得力のある内容にしてください。

必ず以下のJSON形式で返してください：
{
  "summary": "物件の要点を3行でまとめた文章",
  "strengths": ["強み1", "強み2", "強み3", "強み4", "強み5"],
  "risks": ["留意点1", "留意点2", "留意点3"],
  "cf_summary": "収支シミュレーション結果のサマリー（計算結果を含む）",
  "proposal_text": "提案本文（詳細な説明文）",
  "meeting_points": ["面談で強調すべきポイント1", "面談で強調すべきポイント2", "面談で強調すべきポイント3"],
  "email_draft": "買主へのメール本文（件名含む）"
}`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0].message.content;
      
      return JSON.parse(content);
    } catch (error) {
      console.error('Proposal generation error:', error);
      
      // フォールバック応答
      return {
        summary: '提案生成中にエラーが発生しました。手動で内容を作成してください。',
        strengths: ['駅近', '用途地域良好', '価格妥当'],
        risks: ['接道要確認', '建築制限要確認'],
        cf_summary: '収支計算を実行してください。',
        proposal_text: '物件の詳細な提案内容を手動で作成してください。',
        meeting_points: ['立地の優位性を強調', '収益性を説明', '出口戦略を提示'],
        email_draft: '件名：【物件提案】アパート用地のご案内\n\n本文を手動で作成してください。'
      };
    }
  }

  /**
   * プロンプトを構築
   */
  private buildPrompt(deal: Deal, request: ProposalRequest): string {
    let prompt = `## 物件情報\n`;
    prompt += `- 所在地: ${deal.location || '未入力'}\n`;
    prompt += `- 最寄駅: ${deal.station || '未入力'}駅 徒歩${deal.walk_minutes || '-'}分\n`;
    prompt += `- 土地面積: ${deal.land_area || '未入力'}\n`;
    prompt += `- 用途地域: ${deal.zoning || '未入力'}\n`;
    prompt += `- 建蔽率: ${deal.building_coverage || '未入力'}\n`;
    prompt += `- 容積率: ${deal.floor_area_ratio || '未入力'}\n`;
    prompt += `- 接道状況: ${deal.road_info || '未入力'}\n`;
    prompt += `- 現況: ${deal.current_status || '未入力'}\n`;
    prompt += `- 希望価格: ${deal.desired_price || '未入力'}\n\n`;

    if (request.buyer_profile) {
      prompt += `## 買主プロファイル\n`;
      prompt += `- 投資区分: ${request.buyer_profile.investment_type}\n`;
      prompt += `- 予算レンジ: ${request.buyer_profile.budget_range}\n`;
      prompt += `- 投資方針: ${request.buyer_profile.investment_policy}\n`;
      prompt += `- 保有期間: ${request.buyer_profile.holding_period}\n\n`;
    }

    if (request.cf_data) {
      const cf = request.cf_data;
      prompt += `## 収支計算データ\n`;
      prompt += `- 土地価格: ${cf.land_price.toLocaleString()}円\n`;
      prompt += `- 建築費: ${cf.construction_cost.toLocaleString()}円\n`;
      prompt += `- 家賃単価: ${cf.rent_per_unit.toLocaleString()}円\n`;
      prompt += `- 空室率: ${cf.vacancy_rate}%\n`;
      prompt += `- 運営費率: ${cf.operating_expense_rate}%\n`;
      prompt += `- 融資金利: ${cf.loan_rate}%\n`;
      prompt += `- 融資期間: ${cf.loan_term}年\n\n`;
    }

    prompt += `上記の情報をもとに、買主に提示する魅力的な提案書を作成してください。`;

    return prompt;
  }

  /**
   * 簡易収支計算
   */
  calculateCashFlow(cfData: ProposalRequest['cf_data']): {
    grossYield: number;
    netYield: number;
    annualCF: number;
    dscr: number;
  } | null {
    if (!cfData) return null;

    const {
      land_price,
      construction_cost,
      rent_per_unit,
      vacancy_rate,
      operating_expense_rate,
      loan_rate,
      loan_term
    } = cfData;

    const totalInvestment = land_price + construction_cost;
    
    // 年間賃料収入（仮に10戸として計算）
    const assumedUnits = 10;
    const annualRent = rent_per_unit * 12 * assumedUnits * (1 - vacancy_rate / 100);
    
    // 表面利回り
    const grossYield = (annualRent / totalInvestment) * 100;
    
    // 運営費
    const operatingExpense = annualRent * (operating_expense_rate / 100);
    
    // NOI
    const noi = annualRent - operatingExpense;
    
    // 実質利回り
    const netYield = (noi / totalInvestment) * 100;
    
    // 年間返済額（元利均等）
    const monthlyRate = loan_rate / 100 / 12;
    const numPayments = loan_term * 12;
    const monthlyPayment = totalInvestment * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    const annualDebt = monthlyPayment * 12;
    
    // 年間CF
    const annualCF = noi - annualDebt;
    
    // DSCR
    const dscr = noi / annualDebt;

    return {
      grossYield: Math.round(grossYield * 100) / 100,
      netYield: Math.round(netYield * 100) / 100,
      annualCF: Math.round(annualCF),
      dscr: Math.round(dscr * 100) / 100
    };
  }
}

/**
 * 提案サービスのインスタンスを取得
 */
export function getProposalService(env: Env): ProposalService {
  return new ProposalService(env.OPENAI_API_KEY);
}
