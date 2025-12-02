/**
 * 本番環境のユーザーパスワードをPBKDF2形式にリセット（正しいアルゴリズム）
 * utils/crypto.tsのhashPassword()関数と完全に同じアルゴリズム
 */

// PBKDF2ハッシュ生成（utils/crypto.tsと同じアルゴリズム）
async function hashPassword(password) {
  // ランダムソルト生成（16バイト）
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // TextEncoderでパスワードをバイト配列に変換
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  
  // PBKDF2キー導出
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256  // 256ビット = 32バイト
  );
  
  // ソルトとハッシュを結合してBase64エンコード
  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt, 0);
  combined.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function main() {
  const testPassword = 'Test1234!';
  
  console.log('-- 本番環境パスワードリセット用SQL (v2 - 正しいアルゴリズム)');
  console.log('-- 全ユーザーのパスワードを "Test1234!" にリセット');
  console.log('-- ハッシュ形式: PBKDF2 (ランダムソルト + SHA-256)');
  console.log('');
  
  // 各ユーザーごとに異なるハッシュを生成
  const users = [
    { id: 'seller-001', email: 'seller1@example.com' },
    { id: 'seller-002', email: 'seller2@example.com' },
    { id: 'e3e7b2cb-3e3e-4b99-840f-7287a4c45b86', email: 'admin@200units.com' },
    { id: '1805f040-561f-4fae-8f22-792cc852d941', email: 'agent@200units.com' },
    { id: 'user-aN7DwjL7fR', email: 'prod-test-agent@example.com' },
    { id: 'test-buyer-001', email: 'buyer1@example.com' },
    { id: 'user-cHJvZHVjdGlv', email: 'prod-test-buyer@example.com' }
  ];
  
  for (const user of users) {
    const hash = await hashPassword(testPassword);
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE id = '${user.id}'; -- ${user.email}`);
  }
  
  console.log('');
  console.log('-- 影響を受けるユーザー数を確認:');
  console.log('SELECT COUNT(*) as total_users FROM users;');
}

main();
