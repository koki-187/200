import { Context } from 'hono';
import { Bindings } from '../types';
import { verifyToken } from './crypto';

/**
 * JWT検証ミドルウェア（HMAC-SHA256署名検証）
 */
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) {
  console.log('[AuthMiddleware] ========== START ==========');
  console.log('[AuthMiddleware] Path:', c.req.path);
  console.log('[AuthMiddleware] Method:', c.req.method);
  
  const authHeader = c.req.header('Authorization');
  console.log('[AuthMiddleware] Authorization header exists:', !!authHeader);
  console.log('[AuthMiddleware] Authorization header (first 30 chars):', authHeader?.substring(0, 30) || 'NULL');
  
  const token = authHeader?.replace('Bearer ', '');
  console.log('[AuthMiddleware] Token extracted:', !!token);
  console.log('[AuthMiddleware] Token (first 20 chars):', token?.substring(0, 20) + '...' || 'NULL');

  if (!token) {
    console.error('[AuthMiddleware] ❌ No token provided');
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const secret = c.env.JWT_SECRET;
    console.log('[AuthMiddleware] JWT_SECRET exists:', !!secret);
    
    const payload = await verifyToken(token, secret);
    console.log('[AuthMiddleware] Token verification result:', !!payload);
    console.log('[AuthMiddleware] Payload:', payload);
    
    if (!payload) {
      console.error('[AuthMiddleware] ❌ Token verification failed');
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    // DBからユーザー情報を取得
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, role, company_name
      FROM users
      WHERE id = ?
    `).bind(payload.userId).first();
    
    if (!user) {
      console.error('[AuthMiddleware] ❌ User not found in database, userId:', payload.userId);
      return c.json({ error: 'User not found' }, 401);
    }
    
    console.log('[AuthMiddleware] ✅ User found:', user.email);
    console.log('[AuthMiddleware] User role:', user.role);
    
    // コンテキストにユーザー情報を設定（後方互換性のため両方設定）
    c.set('userId', payload.userId);
    c.set('userRole', payload.role);
    c.set('user', user);
    
    console.log('[AuthMiddleware] ✅ Authentication successful, proceeding to next()');
    await next();
    console.log('[AuthMiddleware] ========== END (next() completed) ==========');
  } catch (error) {
    console.error('[AuthMiddleware] ❌ Exception occurred:', error);
    console.error('[AuthMiddleware] Error message:', error.message);
    console.error('[AuthMiddleware] Error stack:', error.stack);
    return c.json({ error: 'Invalid token', details: error.message }, 401);
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
