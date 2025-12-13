/**
 * Error Logger - Centralized error tracking and recovery monitoring
 * Version: 3.153.56
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  stack?: string;
  context?: any;
  user_id?: string;
  recovery_attempted: boolean;
  recovery_success: boolean;
}

export class ErrorLogger {
  private static db: D1Database | null = null;
  
  static init(db: D1Database) {
    this.db = db;
    console.log('[Error Logger] ✅ Initialized');
  }
  
  static async log(error: ErrorLog) {
    if (!this.db) {
      console.error('[Error Logger] Database not initialized');
      return;
    }
    
    try {
      await this.db.prepare(`
        INSERT INTO error_logs (
          id, timestamp, level, category, message, stack, context,
          user_id, recovery_attempted, recovery_success
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        error.id,
        error.timestamp,
        error.level,
        error.category,
        error.message,
        error.stack || null,
        JSON.stringify(error.context || {}),
        error.user_id || null,
        error.recovery_attempted ? 1 : 0,
        error.recovery_success ? 1 : 0
      ).run();
      
      console.log(`[Error Logger] 📝 Logged ${error.level}: ${error.id}`);
    } catch (err: any) {
      console.error('[Error Logger] Failed to log error:', err.message);
    }
  }
  
  static async getRecentErrors(limit = 100) {
    if (!this.db) {
      return [];
    }
    
    try {
      const results = await this.db.prepare(`
        SELECT * FROM error_logs
        ORDER BY timestamp DESC
        LIMIT ?
      `).bind(limit).all();
      
      return results.results || [];
    } catch (err: any) {
      console.error('[Error Logger] Failed to retrieve errors:', err.message);
      return [];
    }
  }
  
  static async getErrorStats() {
    if (!this.db) {
      return [];
    }
    
    try {
      const stats = await this.db.prepare(`
        SELECT 
          category,
          level,
          COUNT(*) as count,
          SUM(CASE WHEN recovery_success = 1 THEN 1 ELSE 0 END) as recovered,
          CAST(AVG(CASE WHEN recovery_attempted = 1 THEN recovery_success ELSE NULL END) * 100 AS INTEGER) as recovery_rate_percent
        FROM error_logs
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY category, level
        ORDER BY count DESC
      `).all();
      
      return stats.results || [];
    } catch (err: any) {
      console.error('[Error Logger] Failed to get stats:', err.message);
      return [];
    }
  }
  
  static generateId(category: string): string {
    return `${category}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
