import { Bindings, User, Deal, Message, FileRecord, Settings } from '../types';

export class Database {
  constructor(private db: D1Database) {}

  // Users
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<User>();
    return result || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();
    return result || null;
  }

  async createUser(user: Omit<User, 'created_at' | 'updated_at' | 'last_login_at'>): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO users (id, email, password_hash, name, role, company_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(user.id, user.email, user.password_hash, user.name, user.role, user.company_name || null)
      .run();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db
      .prepare('UPDATE users SET last_login_at = datetime("now") WHERE id = ?')
      .bind(userId)
      .run();
  }

  // Deals
  async getDeals(userId: string, role: 'ADMIN' | 'AGENT'): Promise<Deal[]> {
    let query = 'SELECT * FROM deals';
    const params: string[] = [];

    if (role === 'AGENT') {
      query += ' WHERE seller_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.prepare(query).bind(...params).all<Deal>();
    return result.results || [];
  }

  async getDealById(id: string): Promise<Deal | null> {
    const result = await this.db
      .prepare('SELECT * FROM deals WHERE id = ?')
      .bind(id)
      .first<Deal>();
    return result || null;
  }

  async createDeal(deal: Omit<Deal, 'created_at' | 'updated_at'>): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO deals (
          id, title, status, buyer_id, seller_id, location, station, walk_minutes,
          land_area, zoning, building_coverage, floor_area_ratio, height_district,
          fire_zone, road_info, current_status, desired_price, remarks,
          missing_fields, reply_deadline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        deal.id, deal.title, deal.status, deal.buyer_id, deal.seller_id,
        deal.location || null, deal.station || null, deal.walk_minutes || null,
        deal.land_area || null, deal.zoning || null, deal.building_coverage || null,
        deal.floor_area_ratio || null, deal.height_district || null,
        deal.fire_zone || null, deal.road_info || null, deal.current_status || null,
        deal.desired_price || null, deal.remarks || null,
        deal.missing_fields, deal.reply_deadline || null
      )
      .run();
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<void> {
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (updates as any)[f]);

    await this.db
      .prepare(`UPDATE deals SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
      .bind(...values, id)
      .run();
  }

  async deleteDeal(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM deals WHERE id = ?').bind(id).run();
  }

  // Messages
  async getMessagesByDeal(dealId: string): Promise<Message[]> {
    const result = await this.db
      .prepare('SELECT * FROM messages WHERE deal_id = ? ORDER BY created_at ASC')
      .bind(dealId)
      .all<Message>();
    return result.results || [];
  }

  async createMessage(message: Omit<Message, 'created_at'>): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO messages (
          id, deal_id, sender_id, content, has_attachments,
          is_read_by_buyer, is_read_by_seller
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        message.id, message.deal_id, message.sender_id, message.content,
        message.has_attachments, message.is_read_by_buyer, message.is_read_by_seller
      )
      .run();
  }

  // Files
  async getFilesByDeal(dealId: string): Promise<FileRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM files WHERE deal_id = ? ORDER BY created_at DESC')
      .bind(dealId)
      .all<FileRecord>();
    return result.results || [];
  }

  async createFile(file: Omit<FileRecord, 'created_at'>): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO files (
          id, deal_id, uploader_id, filename, file_type,
          size_bytes, storage_path, is_archived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        file.id, file.deal_id, file.uploader_id, file.filename,
        file.file_type, file.size_bytes, file.storage_path, file.is_archived
      )
      .run();
  }

  async getTotalFileSize(dealId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT SUM(size_bytes) as total FROM files WHERE deal_id = ? AND is_archived = 0')
      .bind(dealId)
      .first<{ total: number }>();
    return result?.total || 0;
  }

  // Settings
  async getSettings(): Promise<any> {
    const result = await this.db
      .prepare('SELECT * FROM settings WHERE id = 1')
      .first();
    return result || null;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await this.db
      .prepare(`UPDATE settings SET ${key} = ?, updated_at = datetime('now') WHERE id = 1`)
      .bind(value)
      .run();
  }

  async updateSettings(updates: Partial<Settings>): Promise<void> {
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (updates as any)[f]);

    await this.db
      .prepare(`UPDATE settings SET ${setClause}, updated_at = datetime('now') WHERE id = 1`)
      .bind(...values)
      .run();
  }

  // Notifications
  async getNotificationsByUser(userId: string): Promise<any[]> {
    const result = await this.db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all();
    return result.results || [];
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
      .bind(userId)
      .first<{ count: number }>();
    return result?.count || 0;
  }

  async getNotificationById(id: string): Promise<any | null> {
    const result = await this.db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .bind(id)
      .first();
    return result || null;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.db
      .prepare('UPDATE notifications SET is_read = 1 WHERE id = ?')
      .bind(id)
      .run();
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.db
      .prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')
      .bind(userId)
      .run();
  }

  async createNotification(
    userId: string,
    dealId: string | null,
    type: string,
    title: string,
    message: string
  ): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(`
        INSERT INTO notifications (id, user_id, deal_id, type, title, message, is_read)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `)
      .bind(id, userId, dealId, type, title, message)
      .run();
    return id;
  }

  async deleteNotification(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM notifications WHERE id = ?')
      .bind(id)
      .run();
  }

  // Users
  async getAllUsers(): Promise<any[]> {
    const result = await this.db
      .prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC')
      .all();
    return result.results || [];
  }

  async createNewUser(email: string, passwordHash: string, name: string, role: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(`
        INSERT INTO users (id, email, password_hash, name, role)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(id, email, passwordHash, name, role)
      .run();
    return id;
  }
}
