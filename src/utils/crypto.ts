import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

/**
 * PBKDF2パスワードハッシュ化（Cloudflare Workers互換）
 * Web Crypto API使用、100,000イテレーション
 */
export async function hashPassword(password: string): Promise<string> {
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

/**
 * PBKDFパスワード検証
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Base64デコード
    const combined = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
    
    // ソルトとハッシュを分離
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);
    
    // パスワードを同じ方法でハッシュ化
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    
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
      256
    );
    
    const computedHash = new Uint8Array(derivedBits);
    
    // タイミング攻撃耐性のある比較
    if (computedHash.length !== storedHash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash[i] ^ storedHash[i];
    }
    
    return result === 0;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * JWTトークン生成（HMAC-SHA256署名）
 */
export async function generateToken(userId: string, role: string, secret: string): Promise<string> {
  return await sign({
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7日間
  }, secret);
}

/**
 * JWTトークン検証（HMAC-SHA256署名検証）
 */
export async function verifyToken(token: string, secret: string): Promise<{ userId: string; role: string } | null> {
  try {
    const isValid = await verify(token, secret);
    if (!isValid) return null;

    const decoded = JSON.parse(atob(token.split('.')[1]));
    
    // 有効期限チェック
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: decoded.userId,
      role: decoded.role
    };
  } catch (error) {
    return null;
  }
}

/**
 * 旧関数（後方互換性のため残す - 非推奨）
 * @deprecated generateToken()を使用してください
 */
export function generateSimpleToken(userId: string, role: string, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * 旧関数（後方互換性のため残す - 非推奨）
 * @deprecated verifyToken()を使用してください
 */
export function verifySimpleToken(token: string, secret: string): { userId: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`);

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(atob(encodedPayload));
    
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role
    };
  } catch (error) {
    return null;
  }
}
