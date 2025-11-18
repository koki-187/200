import { Hono } from 'hono';
import { Bindings } from '../types';

const businessCardOCR = new Hono<{ Bindings: Bindings }>();

// 名刺OCR（画像から会社情報を抽出）
businessCardOCR.post('/extract', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: 'ファイルが必要です' }, 400);
    }

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      return c.json({ error: '画像ファイルのみ対応しています' }, 400);
    }

    // OpenAI Vision APIで名刺を解析
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = file.type;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `あなたは名刺情報を正確に抽出する専門家です。日本語・英語両方の名刺に対応し、縦型・横型どちらのレイアウトでも読み取ることができます。

以下のJSON形式で情報を返してください：

{
  "company_name": "会社名 / Company Name",
  "company_address": "会社住所（都道府県から番地まで）/ Full Address",
  "position": "役職・肩書き / Position/Title",
  "name": "氏名（姓名をスペース区切り）/ Full Name (space separated)",
  "email": "メールアドレス / Email Address",
  "mobile_phone": "携帯電話番号 / Mobile Phone",
  "company_phone": "会社電話番号 / Company Phone",
  "company_fax": "FAX番号 / Fax Number"
}

重要なルール：
1. 縦型名刺の場合は、縦書きテキストを正しく認識してください
2. 横型名刺の場合は、横書きテキストを正しく認識してください
3. 英語名刺の場合は、すべて英語で返してください
4. 日本語名刺の場合は、すべて日本語で返してください
5. 混在している場合は、主要言語で統一してください
6. 抽出できない情報は null にしてください
7. 電話番号はハイフン付きで統一してください（例: 03-1234-5678, +81-3-1234-5678）
8. メールアドレスは小文字に統一してください
9. 名前は姓と名をスペースで区切ってください（例: "山田 太郎", "John Smith"）`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'この名刺画像から会社情報を抽出してください。縦型・横型・英語・日本語すべてに対応してください。画像の向きを自動判定し、適切に情報を読み取ってください。'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return c.json({ error: 'OCR処理に失敗しました' }, 500);
    }

    const result = await openaiResponse.json();
    const content = result.choices[0].message.content;

    // JSON部分を抽出（マークダウンコードブロックがある場合も対応）
    let extractedData;
    const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/) || content.match(/\{[\s\S]+\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      extractedData = JSON.parse(jsonStr);
    } else {
      extractedData = JSON.parse(content);
    }

    return c.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error('Business card OCR error:', error);
    return c.json({ 
      error: '名刺の読み取りに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default businessCardOCR;
