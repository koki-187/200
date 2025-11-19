import { Context } from 'hono';
import { Bindings } from '../types';
import { verifyToken } from './crypto';

/**
 * JWT検証ミドルウェア（HMAC-SHA256署名検証）
 */
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const secret = c.env.JWT_SECRET;
    const payload = await verifyToken(token, secret);
    
    if (!payload) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    // DBからユーザー情報を取得
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, role, company_name
      FROM users
      WHERE id = ?
    `).bind(payload.userId).first();
    
    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }
    
    // コンテキストにユーザー情報を設定（後方互換性のため両方設定）
    c.set('userId', payload.userId);
    c.set('userRole', payload.role);
    c.set('user', user);
    
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}

/**
 * 管理者権限チェックミドルウェア
 */
export async function adminOnly(c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) {
  const role = c.get('userRole') as string;
  
  if (role !== 'ADMIN') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  
  await next();
}
