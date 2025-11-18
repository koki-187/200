import { Hono } from 'hono';
import { Bindings } from '../types';

const businessCardOCR = new Hono<{ Bindings: Bindings }>();

/**
 * ArrayBufferをBase64文字列に変換（大容量ファイル対応）
 * チャンク処理により、スタックオーバーフローを回避
 * 
 * @param buffer - 変換するArrayBuffer
 * @returns Base64エンコードされた文字列
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // 8KBチャンク（スタックオーバーフロー回避）
  
  // チャンクごとに処理してメモリ使用量を抑制
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

// 名刺OCR（画像から会社情報を抽出）
businessCardOCR.post('/extract', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: 'ファイルが必要です' }, 400);
    }

    // ファイルタイプチェック（強化版 - PDF対応）
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
      return c.json({ 
        error: '対応していないファイル形式です',
        details: 'PNG, JPG, JPEG, WEBP, PDF形式のファイルのみ対応しています'
      }, 400);
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json({ 
        error: 'ファイルサイズが大きすぎます',
        details: 'ファイルサイズは10MB以下にしてください'
      }, 400);
    }

    // ファイルサイズ最小チェック（1KB以上）
    if (file.size < 1024) {
      return c.json({ 
        error: 'ファイルサイズが小さすぎます',
        details: 'ファイルが破損している可能性があります'
      }, 400);
    }

    // OpenAI Vision APIで名刺を解析
    const arrayBuffer = await file.arrayBuffer();
    // チャンク処理でbase64変換（150KB以上のファイルでもスタックオーバーフローしない）
    const base64Image = arrayBufferToBase64(arrayBuffer);
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
      
      // APIエラーの詳細を返す
      let errorMessage = 'OCR処理に失敗しました';
      if (openaiResponse.status === 401) {
        errorMessage = 'OpenAI APIキーが無効です';
      } else if (openaiResponse.status === 429) {
        errorMessage = 'APIリクエスト制限に達しました。しばらく待ってから再試行してください';
      } else if (openaiResponse.status === 400) {
        errorMessage = '画像の読み取りに失敗しました。別の画像を試してください';
      }
      
      return c.json({ 
        error: errorMessage,
        details: errorText.substring(0, 200)
      }, openaiResponse.status);
    }

    const result = await openaiResponse.json();
    
    // レスポンスの検証
    if (!result.choices || result.choices.length === 0) {
      return c.json({ 
        error: 'OCR処理結果が空です',
        details: 'OpenAI APIから有効なレスポンスが返されませんでした'
      }, 500);
    }
    
    const content = result.choices[0].message.content;

    // JSON部分を抽出（マークダウンコードブロックがある場合も対応）
    let extractedData;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/) || content.match(/\{[\s\S]+\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        extractedData = JSON.parse(jsonStr);
      } else {
        extractedData = JSON.parse(content);
      }

      // 抽出データの検証
      const requiredFields = ['company_name', 'name'];
      const missingFields = requiredFields.filter(field => !extractedData[field]);
      
      if (missingFields.length > 0) {
        console.warn('Missing required fields:', missingFields);
        // 警告としてログに残すが、エラーは返さない（部分的な抽出も許可）
      }

      // 電話番号のフォーマット検証（存在する場合のみ）
      ['mobile_phone', 'company_phone', 'company_fax'].forEach(field => {
        if (extractedData[field] && extractedData[field] !== null) {
          // ハイフンまたはスペースを含む電話番号形式かチェック
          const phonePattern = /^[\d\-\+\(\)\s]+$/;
          if (!phonePattern.test(extractedData[field])) {
            console.warn(`Invalid phone format for ${field}:`, extractedData[field]);
          }
        }
      });

      return c.json({
        success: true,
        data: extractedData,
        message: '名刺情報を正常に抽出しました'
      });

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content received:', content);
      return c.json({ 
        error: '名刺情報の解析に失敗しました',
        details: 'OCRは成功しましたが、データの構造化に失敗しました。別の画像を試してください。'
      }, 500);
    }

  } catch (error) {
    console.error('Business card OCR error:', error);
    
    // エラータイプに応じた詳細メッセージ
    let errorMessage = '名刺の読み取りに失敗しました';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = 'OpenAI APIへの接続に失敗しました';
        errorDetails = 'ネットワーク接続を確認してください';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'レスポンスの解析に失敗しました';
        errorDetails = 'APIレスポンスの形式が不正です';
      }
    }
    
    return c.json({ 
      error: errorMessage,
      details: errorDetails
    }, 500);
  }
});

export default businessCardOCR;
