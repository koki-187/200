import fs from 'fs';
import yaml from 'js-yaml';
import OpenAI from 'openai';

// LLM設定の読み込み
const config = yaml.load(fs.readFileSync(process.env.HOME + '/.genspark_llm.yaml', 'utf8'));
const client = new OpenAI({
  baseURL: config.base_url,
  apiKey: config.api_key
});

// 重要なファイルを読み込み
const authMiddleware = fs.readFileSync('src/utils/auth.ts', 'utf8');
const reinfolibApi = fs.readFileSync('src/routes/reinfolib-api.ts', 'utf8');
const indexTsx = fs.readFileSync('src/index.tsx', 'utf8');

// Codex に包括的なコードレビューを依頼
const prompt = `You are a senior code reviewer specializing in TypeScript, Hono framework, and Cloudflare Workers.

# Context
This is a real estate management web application built with:
- Backend: Hono framework on Cloudflare Workers
- Frontend: Vanilla JavaScript with Axios
- Database: Cloudflare D1 (SQLite)
- Authentication: JWT (HMAC-SHA256)

# Current Problem
User reports that even after logging in, the following features are not working:
1. Real Estate Information Library (不動産情報ライブラリ): Should auto-fill 10 fields
2. OCR Feature: Should auto-fill 17 fields

Error from user's screenshot:
\`\`\`
❌ GET https://real-estate-200units-v2.pages.dev/api/reinclub/property-info/address
   404 (Not Found)
\`\`\`

Note: "reinclub" is a typo (should be "reinfolib"), and "/address" should be a query parameter.
This suggests the user's browser is caching old JavaScript files.

# Your Task
Perform a comprehensive code review and identify:

1. **Authentication Issues**: Any problems with token generation, storage, validation
2. **API Route Issues**: Incorrect paths, middleware problems, missing endpoints
3. **Frontend Issues**: Token retrieval, API calls, error handling
4. **Cache Issues**: Proper cache-busting strategies
5. **Error Handling**: Missing error messages, unclear feedback to users
6. **Security Issues**: Token exposure, XSS vulnerabilities, injection risks
7. **Performance Issues**: Unnecessary API calls, inefficient database queries
8. **Code Quality**: Duplicate code, poor organization, missing types

# Files to Review

## 1. Authentication Middleware (src/utils/auth.ts)
\`\`\`typescript
${authMiddleware}
\`\`\`

## 2. REINFOLIB API Routes (src/routes/reinfolib-api.ts - first 300 lines)
\`\`\`typescript
${reinfolibApi.substring(0, 15000)}
\`\`\`

## 3. Frontend JavaScript (autoFillFromReinfolib function)
\`\`\`typescript
${indexTsx.match(/window\.autoFillFromReinfolib = async function[\s\S]{0,8000}/)?.[0] || 'Function not found'}
\`\`\`

# Response Format
Please provide your response in the following format:

## 🚨 Critical Issues (Must Fix Immediately)
[List issues that could cause the reported 404 errors or authentication failures]

## ⚠️ Major Issues (Should Fix Soon)
[List issues that could cause bugs or security problems]

## 💡 Improvements (Nice to Have)
[List code quality improvements, refactoring suggestions]

## ✅ What's Working Well
[List things that are implemented correctly]

## 🔧 Specific Code Fixes
[Provide exact code snippets to fix the critical issues]

For each issue, please explain:
- What is the problem?
- Why is it happening?
- How to fix it?
- What is the expected behavior after the fix?
`;

console.log('🔍 Codex によるコードレビューを開始します...\n');

try {
  const completion = await client.chat.completions.create({
    model: 'gpt-5-codex',
    messages: [
      { role: 'system', content: 'You are an expert code reviewer specializing in web applications, focusing on debugging, security, and best practices.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 4000
  });

  const review = completion.choices[0].message.content;
  
  console.log('✅ Codex レビュー完了\n');
  console.log('='.repeat(80));
  console.log(review);
  console.log('='.repeat(80));
  
  // レビュー結果をファイルに保存
  const reportPath = 'CODEX_COMPREHENSIVE_REVIEW_v3.149.0.md';
  const reportContent = `# Codex 包括的コードレビュー - v3.149.0

実行日時: ${new Date().toISOString()}
モデル: gpt-5-codex

---

${review}

---

## 次のステップ

1. **Critical Issues** をすぐに修正
2. **Major Issues** を計画的に修正
3. **Improvements** を長期的に実装
4. 修正後にユーザーテストを実施
`;
  
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`\n📄 レビューレポート保存: ${reportPath}`);
  
} catch (error) {
  console.error('❌ Codex レビュー失敗:', error.message);
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response data:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
}
