import { Context } from 'hono';
import { Bindings } from '../types';
import { verifyToken } from './crypto';
import { authLog, errorLog } from './logger';

/**
 * JWT検証ミドルウェア（HMAC-SHA256署名検証）
 * v3.149.0: Logger統合により本番環境でのパフォーマンス向上
 */
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) {
  authLog('========== START ==========');
  authLog('Path:', c.req.path);
  authLog('Method:', c.req.method);
  
  const authHeader = c.req.header('Authorization');
  authLog('Authorization header exists:', !!authHeader);
  authLog('Authorization header (first 30 chars):', authHeader?.substring(0, 30) || 'NULL');
  
  const token = authHeader?.replace('Bearer ', '');
  authLog('Token extracted:', !!token);
  authLog('Token (first 20 chars):', token?.substring(0, 20) + '...' || 'NULL');

  if (!token) {
    errorLog('AuthMiddleware', '❌ No token provided');
    return c.json({ 
      error: 'Authentication required',
      code: 'NO_TOKEN',
      message: 'ログインが必要です。再度ログインしてください。'
    }, 401);
  }

  try {
    const secret = c.env.JWT_SECRET;
    authLog('JWT_SECRET exists:', !!secret);
    
    const payload = await verifyToken(token, secret);
    authLog('Token verification result:', !!payload);
    authLog('Payload:', payload);
    
    if (!payload) {
      errorLog('AuthMiddleware', '❌ Token verification failed');
      return c.json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        message: 'トークンが無効です。再度ログインしてください。'
      }, 401);
    }
    
    // DBからユーザー情報を取得
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, role, company_name
      FROM users
      WHERE id = ?
    `).bind(payload.userId).first();
    
    if (!user) {
      errorLog('AuthMiddleware', '❌ User not found in database, userId:', payload.userId);
      return c.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        message: 'ユーザー情報が見つかりません。再度ログインしてください。'
      }, 401);
    }
    
    authLog('✅ User found:', user.email);
    authLog('User role:', user.role);
    
    // コンテキストにユーザー情報を設定（後方互換性のため両方設定）
    c.set('userId', payload.userId);
    c.set('userRole', payload.role);
    c.set('user', user);
    
    authLog('✅ Authentication successful, proceeding to next()');
    await next();
    authLog('========== END (next() completed) ==========');
  } catch (error) {
    errorLog('AuthMiddleware', '❌ Exception occurred:', error);
    errorLog('AuthMiddleware', 'Error message:', error.message);
    errorLog('AuthMiddleware', 'Error stack:', error.stack);
    return c.json({ 
      error: 'Invalid token', 
      code: 'TOKEN_ERROR',
      message: '認証エラーが発生しました。再度ログインしてください。',
      details: error.message 
    }, 401);
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
