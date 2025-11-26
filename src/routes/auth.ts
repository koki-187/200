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
    console.log('[Login] Starting login attempt');
    
    const body = await c.req.json();
    console.log('[Login] Request body received');

    // Zodバリデーション
    const validation = validateData(loginSchema, body);
    if (!validation.success) {
      console.log('[Login] Validation failed:', validation.errors);
      return c.json({ error: 'Validation failed', details: validation.errors }, 400);
    }

    const { email, password, rememberMe } = validation.data;
    console.log('[Login] Validation passed for email:', email);

    console.log('[Login] Creating database instance, DB exists:', !!c.env.DB);
    const db = new Database(c.env.DB);
    
    console.log('[Login] Querying user by email');
    const user = await db.getUserByEmail(email);
    console.log('[Login] User found:', !!user);

    if (!user) {
      console.log('[Login] User not found');
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // パスワード検証（SHA-256）
    console.log('[Login] Verifying password');
    const isValid = await verifyPassword(password, user.password_hash);
    console.log('[Login] Password valid:', isValid);
    
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // 最終ログイン時刻を更新
    console.log('[Login] Updating last login');
    await db.updateLastLogin(user.id);

    // JWTトークン生成（HMAC-SHA256署名）
    // rememberMe = true なら30日間、false なら7日間
    console.log('[Login] Generating JWT token, JWT_SECRET exists:', !!c.env.JWT_SECRET);
    const token = await generateToken(user.id, user.role, c.env.JWT_SECRET, rememberMe || false);
    console.log('[Login] Token generated successfully');

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
    console.error('[Login] Error occurred:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('[Login] Error details - Message:', errorMessage);
    console.error('[Login] Error details - Stack:', errorStack);
    return c.json({ 
      error: 'Internal server error', 
      message: errorMessage,
      stack: errorStack.substring(0, 500)
    }, 500);
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
