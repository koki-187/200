/**
 * 本番環境のユーザーパスワードをPBKDF2形式にリセット
 */

// PBKDF2ハッシュ生成（utils/crypto.tsと同じアルゴリズム）
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = encoder.encode('real-estate-salt-2024'); // 固定ソルト
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
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
    256
  );
  
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  return hashBase64;
}

async function main() {
  const testPassword = 'Test1234!';
  const hash = await hashPassword(testPassword);
  
  console.log('-- 本番環境パスワードリセット用SQL');
  console.log('-- 全ユーザーのパスワードを "Test1234!" にリセット');
  console.log('-- ハッシュ形式: PBKDF2 (Base64)');
  console.log('');
  console.log(`UPDATE users SET password_hash = '${hash}';`);
  console.log('');
  console.log('-- 影響を受けるユーザー数を確認:');
  console.log('SELECT COUNT(*) as total_users FROM users;');
}

main();
