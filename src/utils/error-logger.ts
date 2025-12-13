/**
 * Error Logger - Centralized error tracking and recovery monitoring
 * Version: 3.153.56
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface ErrorLog {
  id: string;
  user_id?: string;
  error_type: string;
  error_code: string;
  error_message: string;
  stack_trace?: string;
  severity: 'error' | 'warning' | 'info';
  endpoint?: string;
  method?: string;
  request_data?: any;
  context_data?: any;
  ip_address?: string;
  user_agent?: string;
  environment?: string;
  resolved?: boolean;
  resolved_at?: string;
  resolved_by?: string;
  notes?: string;
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
          user_id, error_type, error_code, error_message, stack_trace,
          severity, endpoint, method, request_data, context_data,
          ip_address, user_agent, environment, resolved, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        error.user_id || null,
        error.error_type,
        error.error_code,
        error.error_message,
        error.stack_trace || null,
        error.severity || 'error',
        error.endpoint || null,
        error.method || null,
        JSON.stringify(error.request_data || {}),
        JSON.stringify(error.context_data || {}),
        error.ip_address || null,
        error.user_agent || null,
        error.environment || 'production',
        error.resolved ? 1 : 0,
        error.notes || null
      ).run();
      
      console.log(`[Error Logger] 📝 Logged ${error.severity}: ${error.error_type}`);
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
        ORDER BY created_at DESC
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
          error_type,
          severity,
          COUNT(*) as count,
          SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved,
          CAST((SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS INTEGER) as resolution_rate_percent
        FROM error_logs
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY error_type, severity
        ORDER BY count DESC
      `).all();
      
      return stats.results || [];
    } catch (err: any) {
      console.error('[Error Logger] Failed to get stats:', err.message);
      return [];
    }
  }
  
  static generateId(error_type: string): string {
    return `${error_type}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
