import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import type { Bindings } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

// JWT認証を適用（管理者のみ）
app.use('*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET || 'default-secret-key-change-in-production',
  });
  await jwtMiddleware(c, next);

  const payload = c.get('jwtPayload');
  const userId = payload.sub;

  // 管理者権限確認
  const user = await c.env.DB.prepare(`
    SELECT role FROM users WHERE id = ?
  `).bind(userId).first();

  if (user?.role !== 'admin') {
    return c.json({ error: '管理者権限が必要です' }, 403);
  }

  await next();
});

/**
 * データベース全体のバックアップを作成
 */
async function createDatabaseBackup(db: D1Database): Promise<any> {
  const tables = ['users', 'deals', 'messages', 'files', 'message_attachments', 
                  'message_mentions', 'notification_settings', 'push_subscriptions'];
  
  const backup: Record<string, any[]> = {};
  
  for (const table of tables) {
    try {
      const { results } = await db.prepare(`SELECT * FROM ${table}`).all();
      backup[table] = results;
    } catch (error) {
      console.error(`Failed to backup table ${table}:`, error);
      backup[table] = [];
    }
  }
  
  return backup;
}

// バックアップ作成
app.post('/create', async (c) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup-${timestamp}`;

    // データベースバックアップ
    const dbBackup = await createDatabaseBackup(c.env.DB);
    
    // R2にバックアップを保存
    const backupData = JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      database: dbBackup,
    }, null, 2);

    await c.env.R2.put(`backups/${backupId}.json`, backupData, {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        type: 'database-backup',
        timestamp: new Date().toISOString(),
      },
    });

    // バックアップ履歴を記録
    await c.env.DB.prepare(`
      INSERT INTO backup_history (backup_id, file_path, size_bytes, status, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      backupId,
      `backups/${backupId}.json`,
      backupData.length,
      'completed',
      c.get('jwtPayload').sub
    ).run();

    return c.json({
      message: 'バックアップを作成しました',
      backupId,
      size: backupData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to create backup:', error);
    return c.json({ error: 'バックアップの作成に失敗しました' }, 500);
  }
});

// バックアップ一覧を取得
app.get('/list', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM backup_history
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    return c.json({ backups: results });
  } catch (error: any) {
    console.error('Failed to list backups:', error);
    return c.json({ error: 'バックアップ一覧の取得に失敗しました' }, 500);
  }
});

// バックアップをダウンロード
app.get('/download/:backupId', async (c) => {
  const backupId = c.req.param('backupId');

  try {
    const object = await c.env.R2.get(`backups/${backupId}.json`);
    
    if (!object) {
      return c.json({ error: 'バックアップが見つかりません' }, 404);
    }

    const data = await object.text();
    
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${backupId}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Failed to download backup:', error);
    return c.json({ error: 'バックアップのダウンロードに失敗しました' }, 500);
  }
});

// バックアップから復元
app.post('/restore/:backupId', async (c) => {
  const backupId = c.req.param('backupId');

  try {
    // バックアップファイルを取得
    const object = await c.env.R2.get(`backups/${backupId}.json`);
    
    if (!object) {
      return c.json({ error: 'バックアップが見つかりません' }, 404);
    }

    const backupData = JSON.parse(await object.text());
    
    // 復元処理（注意: 既存データは削除されます）
    let restoredTables = 0;
    
    for (const [table, rows] of Object.entries(backupData.database)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      
      try {
        // テーブルをクリア（CASCADE制約に注意）
        await c.env.DB.prepare(`DELETE FROM ${table}`).run();
        
        // データを挿入
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        for (const row of rows) {
          const values = columns.map(col => (row as any)[col]);
          await c.env.DB.prepare(insertSql).bind(...values).run();
        }
        
        restoredTables++;
      } catch (error) {
        console.error(`Failed to restore table ${table}:`, error);
      }
    }

    return c.json({
      message: 'バックアップから復元しました',
      restoredTables,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to restore backup:', error);
    return c.json({ error: 'バックアップの復元に失敗しました' }, 500);
  }
});

// バックアップを削除
app.delete('/:backupId', async (c) => {
  const backupId = c.req.param('backupId');

  try {
    // R2から削除
    await c.env.R2.delete(`backups/${backupId}.json`);
    
    // 履歴を更新
    await c.env.DB.prepare(`
      UPDATE backup_history
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE backup_id = ?
    `).bind(backupId).run();

    return c.json({ message: 'バックアップを削除しました' });
  } catch (error: any) {
    console.error('Failed to delete backup:', error);
    return c.json({ error: 'バックアップの削除に失敗しました' }, 500);
  }
});

// 自動バックアップ設定を取得
app.get('/settings', async (c) => {
  try {
    const settings = await c.env.DB.prepare(`
      SELECT * FROM backup_settings LIMIT 1
    `).first();

    return c.json(settings || {
      enabled: false,
      frequency: 'daily',
      retention_days: 30,
    });
  } catch (error: any) {
    console.error('Failed to get backup settings:', error);
    return c.json({ error: 'バックアップ設定の取得に失敗しました' }, 500);
  }
});

// 自動バックアップ設定を更新
app.put('/settings', async (c) => {
  const { enabled, frequency, retention_days } = await c.req.json();

  try {
    const existing = await c.env.DB.prepare(`
      SELECT id FROM backup_settings LIMIT 1
    `).first();

    if (existing) {
      await c.env.DB.prepare(`
        UPDATE backup_settings
        SET enabled = ?, frequency = ?, retention_days = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(enabled ? 1 : 0, frequency, retention_days, existing.id).run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO backup_settings (enabled, frequency, retention_days)
        VALUES (?, ?, ?)
      `).bind(enabled ? 1 : 0, frequency, retention_days).run();
    }

    return c.json({ message: 'バックアップ設定を更新しました' });
  } catch (error: any) {
    console.error('Failed to update backup settings:', error);
    return c.json({ error: 'バックアップ設定の更新に失敗しました' }, 500);
  }
});

export default app;
