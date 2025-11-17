/**
 * PBKDF2ハッシュ生成スクリプト
 * Node.js環境でPBKDF2ハッシュを生成
 */

const crypto = require('crypto');

function hashPassword(password) {
  // ランダムソルト生成（16バイト）
  const salt = crypto.randomBytes(16);
  
  // PBKDF2ハッシュ生成
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    100000,  // イテレーション数
    32,      // ハッシュ長（バイト）
    'sha256'
  );
  
  // ソルトとハッシュを結合してBase64エンコード
  const combined = Buffer.concat([salt, hash]);
  return combined.toString('base64');
}

// パスワードハッシュ生成
console.log('===== PBKDF2 Password Hashes =====\n');

const passwords = {
  'admin123': 'admin@example.com (管理者)',
  'Admin!2025': 'admin@example.com (新パスワード)',
  'agent123': 'seller1@example.com, seller2@example.com (売側担当者)'
};

for (const [password, description] of Object.entries(passwords)) {
  const hash = hashPassword(password);
  console.log(`Password: ${password}`);
  console.log(`Description: ${description}`);
  console.log(`Hash: ${hash}`);
  console.log('');
}

console.log('===== Copy these hashes to seed.sql =====');
