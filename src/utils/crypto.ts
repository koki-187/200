import bcrypt from 'bcryptjs';
import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

/**
 * bcryptパスワードハッシュ化（本番対応）
 * ソルト付き、10ラウンド
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

/**
 * bcryptパスワード検証
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
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
