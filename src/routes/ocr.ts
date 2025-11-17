import { Hono } from 'hono';
import type { Bindings } from '../types';

const ocr = new Hono<{ Bindings: Bindings }>();

ocr.post('/extract', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'ファイルが指定されていません' }, 400);
    }

    // ファイルをBase64に変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const imageBase64 = `data:${mimeType};base64,${base64}`;

    // OpenAI Vision APIで情報抽出
    const openaiApiKey = c.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API keyが設定されていません' }, 500);
    }

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
            role: 'user',
            content: [
              {
                type: 'text',
                text: `この不動産資料から以下の情報を抽出してJSON形式で返してください。
存在しない項目は空文字列にしてください。

必要な情報：
- property_name: 物件名
- location: 所在地（都道府県、市区町村、番地）
- land_area: 土地面積（平方メートル）
- building_area: 建物面積（平方メートル）
- price: 価格（円）
- building_age: 築年数
- structure: 構造（木造、鉄筋コンクリート造など）
- access: 最寄駅からのアクセス
- current_use: 現況（空室、賃貸中など）
- zoning: 用途地域
- remarks: その他特記事項

JSON形式で返してください。説明文は不要です。`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return c.json({ error: 'OCR処理に失敗しました' }, 500);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // JSONを抽出（```json ... ``` で囲まれている場合を考慮）
    let extracted;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      extracted = JSON.parse(jsonString);
    } catch (e) {
      console.error('JSON parse error:', e);
      return c.json({ error: 'OCR結果の解析に失敗しました', raw: content }, 500);
    }

    return c.json({ 
      success: true,
      extracted: extracted 
    });

  } catch (error) {
    console.error('OCR error:', error);
    return c.json({ 
      error: 'OCR処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default ocr;
