/**
 * SHA-256パスワードハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256パスワード検証
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * JWTトークン生成（簡易版 - SHA-256ベース）
 */
export function generateSimpleToken(userId: string, role: string, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7日間
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * JWTトークン検証（簡易版）
 */
export function verifySimpleToken(token: string, secret: string): { userId: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`);

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(atob(encodedPayload));
    
    // 有効期限チェック
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
