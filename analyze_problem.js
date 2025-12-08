import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const problem = `
私は不動産管理システムのフロントエンドで、以下の問題に直面しています:

## 問題
1. **売主プルダウンが空白** - HTMLには<select id="seller_id">が存在するが、JavaScriptでloadSellers()が実行されず、4人のAGENTユーザーが表示されない
2. **JavaScriptが一部実行されていない** - Playwrightのコンソールログで[Init]や[Sellers]のログが表示されない
3. **JavaScript構文エラー** - "Invalid or unexpected token"エラーがブラウザコンソールに表示される

## 確認済みの事実
- バックエンドAPI(/api/auth/users)は正常動作し、4人のAGENTユーザーを返す
- loadSellers()関数は実装されている(src/index.tsxとdist/_worker.jsで確認済み)
- initializePage()関数も実装されている
- DOMContentLoadedイベントリスナーも設定されている
- node -c public/static/ocr-init.jsで構文チェックを実行してもエラーなし

## コードスニペット
\`\`\`javascript
// loadSellers() implementation (in production HTML)
async function loadSellers(retryCount = 0) {
  console.log('[Sellers] ========== START (Retry:', retryCount, ') ==========');
  
  try {
    const select = document.getElementById('seller_id');
    if (!select) {
      if (retryCount < 5) {
        setTimeout(() => loadSellers(retryCount + 1), 300);
        return;
      } else {
        console.error('[Sellers] seller_id element not found after 5 retries');
        return;
      }
    }
    
    const response = await axios.get('/api/auth/users', {
      headers: { 'Authorization': 'Bearer ' + token },
      timeout: 10000
    });
    
    const sellers = response.data.users.filter(u => u.role === 'AGENT');
    
    sellers.forEach(seller => {
      const option = document.createElement('option');
      option.value = seller.id;
      option.textContent = seller.name + (seller.company_name ? ' (' + seller.company_name + ')' : '');
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('[Sellers] Error:', error);
  }
}

// initializePage() calls loadSellers()
function initializePage() {
  console.log('[Init] INITIALIZE PAGE');
  setTimeout(() => {
    console.log('[Init] Starting delayed initialization...');
    loadSellers();
  }, 500);
}

// DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Main] DOMContentLoaded event fired');
  initializePage();
});
\`\`\`

## 質問
1. なぜPlaywrightのコンソールログで[Sellers]や[Init]のログが表示されないのか?
2. "Invalid or unexpected token"エラーの原因は何か?
3. どのように修正すればよいか?

具体的な修正案を3つ以上提示してください。
`;

async function main() {
  console.log('[ChatGPT] Sending problem analysis request...');
  
  const completion = await client.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: 'あなたは経験豊富なフロントエンドエンジニアです。JavaScriptのデバッグとトラブルシューティングが得意です。' },
      { role: 'user', content: problem }
    ],
  });

  const analysis = completion.choices[0].message.content;
  console.log('\n[ChatGPT Analysis]\n');
  console.log(analysis);
  
  // Save analysis to file
  fs.writeFileSync('/home/user/webapp/chatgpt_analysis.txt', analysis);
  console.log('\n[ChatGPT] Analysis saved to chatgpt_analysis.txt');
}

main().catch(console.error);
