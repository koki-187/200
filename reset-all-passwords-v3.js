/**
 * v3.96.0 全ユーザーパスワードリセットスクリプト
 * 
 * 目的：
 * - 全ユーザーのパスワードを明確な値に統一
 * - admin@test.com と navigator-187@docomo.ne.jp を元のパスワードに復元
 * - その他のユーザーは Test1234! に統一
 * 
 * PBKDF2 (100,000 iterations, SHA-256) を使用
 */

// Web Crypto APIを使用したPBKDF2ハッシュ生成（Node.js環境用）
const crypto = require('crypto');

function hashPasswordSync(password) {
  // ランダムソルト生成（16バイト）
  const salt = crypto.randomBytes(16);
  
  // PBKDF2キー導出（100,000イテレーション、SHA-256、32バイト出力）
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  // ソルトとハッシュを結合してBase64エンコード
  const combined = Buffer.concat([salt, hash]);
  return combined.toString('base64');
}

// ユーザーごとのパスワード設定
const users = [
  // 実ユーザー - 元のパスワードに復元
  { email: 'navigator-187@docomo.ne.jp', password: 'kouki187' },
  
  // テストユーザー - 元のパスワードに復元
  { email: 'admin@test.com', password: 'admin123' },
  
  // その他全て Test1234! に統一
  { email: 'prod-test-agent@example.com', password: 'Test1234!' },
  { email: 'agent@200units.com', password: 'Test1234!' },
  { email: 'admin@200units.com', password: 'Test1234!' },
  { email: 'seller1@example.com', password: 'Test1234!' },
  { email: 'seller2@example.com', password: 'Test1234!' },
];

console.log('='.repeat(60));
console.log('パスワードリセットSQL生成 - v3.96.0');
console.log('='.repeat(60));
console.log('');

// SQL生成
const sqlStatements = [];

users.forEach(user => {
  const hash = hashPasswordSync(user.password);
  const sql = `UPDATE users SET password_hash = '${hash}' WHERE email = '${user.email}';`;
  sqlStatements.push(sql);
  
  console.log(`✅ ${user.email}`);
  console.log(`   Password: ${user.password}`);
  console.log(`   Hash: ${hash}`);
  console.log('');
});

// SQL確認用カウント
sqlStatements.push(`SELECT COUNT(*) as updated_count FROM users WHERE email IN (${users.map(u => `'${u.email}'`).join(', ')});`);

// SQL出力
console.log('='.repeat(60));
console.log('実行SQL:');
console.log('='.repeat(60));
console.log('');
console.log(sqlStatements.join('\n'));
console.log('');

// ファイルに保存
const fs = require('fs');
fs.writeFileSync('reset-passwords-v3.sql', sqlStatements.join('\n'));
console.log('✅ SQLファイル作成: reset-passwords-v3.sql');
console.log('');
console.log('実行コマンド:');
console.log('  npx wrangler d1 execute real-estate-200units-db --remote --file=./reset-passwords-v3.sql');
