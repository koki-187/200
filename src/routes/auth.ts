import { Hono } from 'hono';
import { Bindings } from '../types';
import { Database } from '../db/queries';
import { authMiddleware } from '../utils/auth';
import { verifyPassword, generateToken } from '../utils/crypto';
import { loginSchema, registerSchema, validateData } from '../utils/validation';

const auth = new Hono<{ Bindings: Bindings }>();

// ログイン
auth.post('/login', async (c) => {
  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      console.error('Login request JSON parse error:', jsonError);
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const { DB, JWT_SECRET } = c.env;
    if (!DB || !JWT_SECRET) {
      console.error('Login configuration error: missing DB or JWT_SECRET');
      return c.json({ error: 'Authentication service is not configured correctly' }, 500);
    }

    // Zodバリデーション
    const validation = validateData(loginSchema, body);
    if (!validation.success) {
      return c.json({ error: 'Validation failed', details: validation.errors }, 400);
    }
    const { email, password, rememberMe } = validation.data;

    const db = new Database(DB);
    const user = await db.getUserByEmail(email);

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    if (!user.password_hash) {
      console.error('User record is missing password hash:', user.id);
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // パスワード検証（SHA-256）
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // 最終ログイン時刻を更新
    await db.updateLastLogin(user.id);

    // JWTトークン生成（HMAC-SHA256署名）
    // rememberMe = true なら30日間、false なら7日間
    const token = await generateToken(user.id, user.role, JWT_SECRET, rememberMe || false);

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

// ユーザー一覧取得（認証済みユーザー用）
auth.get('/users', authMiddleware, async (c) => {
  try {
    const db = new Database(c.env.DB);
    const users = await db.getAllUsers();

    return c.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 新規ユーザー登録（管理者専用）
auth.post('/register', authMiddleware, async (c) => {
  try {
    const userRole = c.get('userRole') as string;
    if (userRole !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const body = await c.req.json();

    // Zodバリデーション
    const validation = validateData(registerSchema, body);
    if (!validation.success) {
      return c.json({ error: 'Validation failed', details: validation.errors }, 400);
    }

    const { 
      email, 
      password, 
      name, 
      role, 
      company_name, 
      company_address, 
      position, 
      mobile_phone, 
      company_phone, 
      company_fax 
    } = validation.data;

    const db = new Database(c.env.DB);
    
    // メールアドレス重複チェック
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return c.json({ error: 'Email already exists' }, 409);
    }

    // パスワードハッシュ化
    const { hashPassword } = await import('../utils/crypto');
    const passwordHash = await hashPassword(password);

    // ユーザー作成
    const { nanoid } = await import('nanoid');
    const userId = `user-${nanoid(10)}`;

    await db.createUser({
      id: userId,
      email,
      password_hash: passwordHash,
      name,
      role,
      company_name: company_name || null,
      company_address: company_address || null,
      position: position || null,
      mobile_phone: mobile_phone || null,
      company_phone: company_phone || null,
      company_fax: company_fax || null
    });

    return c.json({ 
      message: 'User created successfully',
      user: { id: userId, email, name, role, company_name, position }
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default auth;
