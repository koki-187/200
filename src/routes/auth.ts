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
      return c.json({ 
        error: 'バリデーションエラー', 
        message: '入力内容に誤りがあります',
        details: validation.errors || []
      }, 400);
    }

    const { email, password, rememberMe } = validation.data;
    console.log('[Login] Validation passed for email:', email);

    console.log('[Login] Creating database instance, DB exists:', !!c.env.DB);
    const db = new Database(c.env.DB);
    
    console.log('[Login] Querying user by email');
    const user = await db.getUserByEmail(email);
    console.log('[Login] User found:', !!user);

    // IPアドレスとUser-Agentを取得
    const ipAddress = c.req.header('cf-connecting-ip') || 
                      c.req.header('x-forwarded-for') || 
                      c.req.header('x-real-ip') || 
                      'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    if (!user) {
      console.log('[Login] User not found');
      
      // 失敗したログイン試行を記録（ユーザーIDがない場合は仮ID）
      try {
        await c.env.DB.prepare(`
          INSERT INTO login_history (id, user_id, email, ip_address, user_agent, success, failure_reason)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `).bind(
          crypto.randomUUID(),
          'unknown',
          email,
          ipAddress,
          userAgent,
          'User not found'
        ).run();
      } catch (historyError) {
        console.error('[Login] Failed to record login history:', historyError);
      }
      
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // パスワード検証（SHA-256）
    console.log('[Login] Verifying password');
    const isValid = await verifyPassword(password, user.password_hash);
    console.log('[Login] Password valid:', isValid);
    
    if (!isValid) {
      // 失敗したログイン試行を記録
      try {
        await c.env.DB.prepare(`
          INSERT INTO login_history (id, user_id, email, ip_address, user_agent, success, failure_reason)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `).bind(
          crypto.randomUUID(),
          user.id,
          email,
          ipAddress,
          userAgent,
          'Invalid password'
        ).run();
      } catch (historyError) {
        console.error('[Login] Failed to record login history:', historyError);
      }
      
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // 最終ログイン時刻を更新
    console.log('[Login] Updating last login');
    await db.updateLastLogin(user.id);

    // 成功したログイン履歴を記録
    try {
      await c.env.DB.prepare(`
        INSERT INTO login_history (id, user_id, email, ip_address, user_agent, success)
        VALUES (?, ?, ?, ?, ?, 1)
      `).bind(
        crypto.randomUUID(),
        user.id,
        email,
        ipAddress,
        userAgent
      ).run();
      console.log('[Login] Login history recorded successfully');
    } catch (historyError) {
      console.error('[Login] Failed to record login history:', historyError);
      // ログイン履歴の記録失敗はログインそのものを失敗させない
    }

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
    console.error('[Login] Error details - Message:', errorMessage);
    
    // 本番環境ではスタックトレースを表示しない
    return c.json({ 
      error: 'Internal server error', 
      message: 'ログイン処理中にエラーが発生しました'
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

// ログイン履歴取得（自分の履歴 or 管理者は全履歴）
auth.get('/login-history', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    let query = `
      SELECT 
        lh.*,
        u.name as user_name,
        u.role as user_role
      FROM login_history lh
      LEFT JOIN users u ON lh.user_id = u.id
    `;
    
    const params: any[] = [];
    
    // 管理者以外は自分の履歴のみ
    if (userRole !== 'ADMIN') {
      query += ' WHERE lh.user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY lh.login_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // 総件数取得
    let countQuery = 'SELECT COUNT(*) as count FROM login_history';
    const countParams: any[] = [];
    
    if (userRole !== 'ADMIN') {
      countQuery += ' WHERE user_id = ?';
      countParams.push(userId);
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    
    return c.json({
      history: results,
      total: countResult?.count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Get login history error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 最近のログイン失敗を取得（管理者専用）
auth.get('/login-failures', authMiddleware, async (c) => {
  try {
    const userRole = c.get('userRole') as string;
    
    if (userRole !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    
    const limit = parseInt(c.req.query('limit') || '100');
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        lh.*,
        u.name as user_name,
        u.role as user_role
      FROM login_history lh
      LEFT JOIN users u ON lh.user_id = u.id
      WHERE lh.success = 0
      ORDER BY lh.login_at DESC
      LIMIT ?
    `).bind(limit).all();
    
    return c.json({ failures: results });
  } catch (error) {
    console.error('Get login failures error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
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
