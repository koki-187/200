import { Hono } from 'hono';
import { Bindings } from '../types';
import { Database } from '../db/queries';
import { authMiddleware } from '../utils/auth';
import { verifyPassword, generateSimpleToken } from '../utils/crypto';

const auth = new Hono<{ Bindings: Bindings }>();

// ログイン
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const db = new Database(c.env.DB);
    const user = await db.getUserByEmail(email);

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // 簡易パスワード検証（SHA-256ハッシュ）
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // 最終ログイン時刻を更新
    await db.updateLastLogin(user.id);

    // JWTトークン生成
    const token = generateSimpleToken(user.id, user.role, c.env.JWT_SECRET);

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_name: user.company_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 現在のユーザー情報取得
auth.get('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = new Database(c.env.DB);
    const user = await db.getUserById(userId);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company_name: user.company_name
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ログアウト（クライアント側でトークン削除）
auth.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' });
});

export default auth;
