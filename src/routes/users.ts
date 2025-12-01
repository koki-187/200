// User Management API
// Version: v3.87.0

import { Hono } from 'hono'
import { authMiddleware } from '../utils/auth'
import { Env } from '../types'
import { hashPassword } from '../utils/crypto'

const users = new Hono<{ Bindings: Env }>()

// Apply auth middleware to all routes
users.use('/*', authMiddleware)

// Get user by ID
users.get('/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUser = c.get('user')
    const { DB } = c.env

    // Authorization: Users can only view their own profile, or admins can view any
    if (currentUser.id !== userId && currentUser.role !== 'ADMIN') {
      return c.json({ error: 'この操作を実行する権限がありません' }, 403)
    }

    const user = await DB.prepare(`
      SELECT 
        id,
        email,
        name,
        role,
        company_name,
        company_address,
        position,
        mobile_phone,
        company_phone,
        company_fax,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = ?
    `)
      .bind(userId)
      .first()

    if (!user) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404)
    }

    return c.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({ 
      error: 'ユーザー情報の取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// Get all users (Admin only)
users.get('/', async (c) => {
  try {
    const currentUser = c.get('user')
    const { DB } = c.env

    // Authorization: Admin only
    if (currentUser.role !== 'ADMIN') {
      return c.json({ error: 'この操作を実行する権限がありません' }, 403)
    }

    // Query parameters
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const role = c.req.query('role')
    const search = c.req.query('search')
    const offset = (page - 1) * limit

    // Build query
    let whereConditions: string[] = []
    let params: any[] = []

    if (role) {
      whereConditions.push('role = ?')
      params.push(role)
    }

    if (search) {
      whereConditions.push('(name LIKE ? OR email LIKE ? OR company_name LIKE ?)')
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    // Get total count
    const countResult = await DB.prepare(`
      SELECT COUNT(*) as total FROM users ${whereClause}
    `)
      .bind(...params)
      .first<{ total: number }>()

    const total = countResult?.total || 0

    // Get users
    const results = await DB.prepare(`
      SELECT 
        id,
        email,
        name,
        role,
        company_name,
        company_address,
        position,
        mobile_phone,
        company_phone,
        company_fax,
        created_at,
        updated_at,
        last_login_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
      .bind(...params, limit, offset)
      .all()

    return c.json({
      users: results.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    return c.json({ 
      error: 'ユーザー一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// Update user
users.put('/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUser = c.get('user')
    const { DB } = c.env
    const body = await c.req.json()

    // Authorization: Users can only update their own profile, or admins can update any
    if (currentUser.id !== userId && currentUser.role !== 'ADMIN') {
      return c.json({ error: 'この操作を実行する権限がありません' }, 403)
    }

    // Check if user exists
    const existingUser = await DB.prepare(`
      SELECT id, role FROM users WHERE id = ?
    `)
      .bind(userId)
      .first<{ id: string; role: string }>()

    if (!existingUser) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404)
    }

    // Build update query
    const allowedFields = ['name', 'email', 'company_name', 'company_address', 'position', 'mobile_phone', 'company_phone', 'company_fax']
    const updates: string[] = []
    const params: any[] = []

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        params.push(body[field])
      }
    }

    // Only admins can change role
    if (body.role && currentUser.role === 'ADMIN') {
      updates.push('role = ?')
      params.push(body.role)
    }

    // Handle password update
    if (body.password) {
      const hashedPassword = await hashPassword(body.password)
      updates.push('password_hash = ?')
      params.push(hashedPassword)
    }

    if (updates.length === 0) {
      return c.json({ error: '更新する項目がありません' }, 400)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(userId)

    await DB.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `)
      .bind(...params)
      .run()

    // Get updated user
    const updatedUser = await DB.prepare(`
      SELECT 
        id,
        email,
        name,
        role,
        company_name,
        company_address,
        position,
        mobile_phone,
        company_phone,
        company_fax,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = ?
    `)
      .bind(userId)
      .first()

    return c.json({ 
      message: 'ユーザー情報を更新しました',
      user: updatedUser
    })
  } catch (error) {
    console.error('Update user error:', error)
    return c.json({ 
      error: 'ユーザー情報の更新に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// Delete user (Admin only)
users.delete('/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUser = c.get('user')
    const { DB } = c.env

    // Authorization: Admin only
    if (currentUser.role !== 'ADMIN') {
      return c.json({ error: 'この操作を実行する権限がありません' }, 403)
    }

    // Prevent self-deletion
    if (currentUser.id === userId) {
      return c.json({ error: '自分自身を削除することはできません' }, 400)
    }

    // Check if user exists
    const existingUser = await DB.prepare(`
      SELECT id FROM users WHERE id = ?
    `)
      .bind(userId)
      .first()

    if (!existingUser) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404)
    }

    // Delete user (cascade will handle related records)
    await DB.prepare(`
      DELETE FROM users WHERE id = ?
    `)
      .bind(userId)
      .run()

    return c.json({ message: 'ユーザーを削除しました' })
  } catch (error) {
    console.error('Delete user error:', error)
    return c.json({ 
      error: 'ユーザーの削除に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

export default users
