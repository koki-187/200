import OpenAI from 'openai';
import fs from 'fs';
import yaml from 'js-yaml';
import os from 'os';
import path from 'path';

// Load configuration from ~/.genspark_llm.yaml
const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
let config = null;

if (fs.existsSync(configPath)) {
  const fileContents = fs.readFileSync(configPath, 'utf8');
  config = yaml.load(fileContents);
}

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: config?.openai?.api_key || process.env.OPENAI_API_KEY,
  baseURL: config?.openai?.base_url || process.env.OPENAI_BASE_URL,
});

// 現在の問題状況
const problemDescription = `
# 現在の問題状況

## ユーザー報告:
- 不動産情報ライブラリ機能が使えない（404エラー）
- OCR機能が使えない
- ログイン後も同じエラーが発生

## スクリーンショットから判明したエラー:
\`\`\`
❌ GET https://real-estate-200units-v2.pages.dev/api/reinclub/property-info/address
   404 (Not Found)

[不動産情報ライブラリ] ❌ エラー発生
[不動産情報ライブラリ] Request failed with status code: 404
\`\`\`

## 特定された根本原因:
1. ユーザーのブラウザが古いJavaScriptファイルをキャッシュしている
2. 古いバージョンでは以下の問題があった:
   - タイポ: "reinclub" → 正しくは "reinfolib"
   - パス構造: "/address" がパスに含まれる → 正しくはクエリパラメータ "?address=..."

## 現在のコード（v3.148.0）:
- コードは完璧に修正済み
- Service Worker強制削除を追加
- Cache API強制クリアを追加
- バージョンを v3.148.0 に更新

## 問題:
ユーザーがシークレットモードでテストしていない、またはハードリロードしていないため、
古いキャッシュが残っている可能性が高い。

## レビュー依頼:
1. この問題の根本原因分析は正しいか？
2. Service Worker + Cache APIの強制削除で解決できるか？
3. 他に考慮すべき点はあるか？
4. ユーザーに追加で依頼すべきことはあるか？
`;

async function analyzeWithCodex() {
  console.log('🔍 Codexでコードレビューを開始します...\n');
  
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-5-codex',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert web application debugger and code reviewer. Analyze the problem deeply and provide actionable solutions in Japanese.' 
        },
        { 
          role: 'user', 
          content: problemDescription
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const analysis = completion.choices[0].message.content;
    
    console.log('📋 Codex分析結果:\n');
    console.log('='.repeat(80));
    console.log(analysis);
    console.log('='.repeat(80));
    
    // 分析結果をファイルに保存
    fs.writeFileSync('/home/user/webapp/CODEX_ANALYSIS_v3.148.0.md', `# Codex分析結果 - v3.148.0

## 実行日時
${new Date().toISOString()}

## 問題の概要
${problemDescription}

## Codex分析
${analysis}
`);
    
    console.log('\n✅ 分析結果を CODEX_ANALYSIS_v3.148.0.md に保存しました');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

analyzeWithCodex();
