import { Hono } from 'hono'
import type { Context } from 'hono'
import { Database } from '../db/queries'

const settings = new Hono()

// 設定取得
settings.get('/', async (c: Context) => {
  try {
    const db = new Database(c.env.DB)
    const settingsData = await db.getSettings()
    
    return c.json({ settings: settingsData })
  } catch (error: any) {
    console.error('Failed to get settings:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 設定更新
settings.put('/', async (c: Context) => {
  try {
    const role = c.get('userRole') as string
    
    // 管理者権限チェック
    if (role !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const updates = await c.req.json()
    const db = new Database(c.env.DB)
    
    // 設定の更新（Zodバリデーション付き）
    if (updates.business_days !== undefined) {
      const validation = validateData(businessDaysSchema, { business_days: updates.business_days });
      if (!validation.success) {
        return c.json({ error: 'Validation failed', details: validation.errors }, 400);
      }
      await db.updateSetting('business_days', JSON.stringify(updates.business_days))
    }
    
    if (updates.holidays !== undefined) {
      await db.updateSetting('holidays', JSON.stringify(updates.holidays))
    }
    
    if (updates.storage_limit_mb !== undefined) {
      const validation = validateData(storageLimitSchema, { storage_limit_mb: updates.storage_limit_mb });
      if (!validation.success) {
        return c.json({ error: 'Validation failed', details: validation.errors }, 400);
      }
      await db.updateSetting('storage_limit_mb', updates.storage_limit_mb.toString())
    }
    
    if (updates.reply_deadline_hours !== undefined) {
      await db.updateSetting('reply_deadline_hours', updates.reply_deadline_hours.toString())
    }
    
    const settingsData = await db.getSettings()
    return c.json({ settings: settingsData })
  } catch (error: any) {
    console.error('Failed to update settings:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 休日追加
settings.post('/holidays', async (c: Context) => {
  try {
    const role = c.get('userRole') as string
    
    if (role !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const { date, description } = await c.req.json()
    const db = new Database(c.env.DB)
    
    // 現在の休日設定を取得
    const settingsData = await db.getSettings()
    let holidays = []
    
    if (settingsData.holidays) {
      try {
        holidays = JSON.parse(settingsData.holidays)
      } catch (e) {
        holidays = []
      }
    }
    
    // 新しい休日を追加
    holidays.push({ date, description: description || '休日' })
    holidays.sort((a: any, b: any) => a.date.localeCompare(b.date))
    
    await db.updateSetting('holidays', JSON.stringify(holidays))
    
    return c.json({ holidays })
  } catch (error: any) {
    console.error('Failed to add holiday:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 休日削除
settings.delete('/holidays/:date', async (c: Context) => {
  try {
    const role = c.get('userRole') as string
    
    if (role !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const date = c.req.param('date')
    const db = new Database(c.env.DB)
    
    // 現在の休日設定を取得
    const settingsData = await db.getSettings()
    let holidays = []
    
    if (settingsData.holidays) {
      try {
        holidays = JSON.parse(settingsData.holidays)
      } catch (e) {
        holidays = []
      }
    }
    
    // 指定された日付を削除
    holidays = holidays.filter((h: any) => h.date !== date)
    
    await db.updateSetting('holidays', JSON.stringify(holidays))
    
    return c.json({ holidays })
  } catch (error: any) {
    console.error('Failed to delete holiday:', error)
    return c.json({ error: error.message }, 500)
  }
})

// ユーザー一覧取得（管理者専用）
settings.get('/users', async (c: Context) => {
  try {
    const role = c.get('userRole') as string
    
    if (role !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const db = new Database(c.env.DB)
    const users = await db.getAllUsers()
    
    // パスワードハッシュを除外
    const safeUsers = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      created_at: u.created_at
    }))
    
    return c.json({ users: safeUsers })
  } catch (error: any) {
    console.error('Failed to get users:', error)
    return c.json({ error: error.message }, 500)
  }
})

// ユーザー作成（管理者専用）
settings.post('/users', async (c: Context) => {
  try {
    const role = c.get('userRole') as string
    
    if (role !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const { email, name, password, userRole } = await c.req.json()
    const db = new Database(c.env.DB)
    
    // パスワードハッシュ化は crypto.ts の hashPassword を使用
    const { hashPassword } = await import('../utils/crypto')
    const passwordHash = await hashPassword(password)
    
    const userId = await db.createNewUser(email, passwordHash, name, userRole)
    
    return c.json({ 
      user: { id: userId, email, name, role: userRole }
    })
  } catch (error: any) {
    console.error('Failed to create user:', error)
    return c.json({ error: error.message }, 500)
  }
})

export default settings
