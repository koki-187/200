import { Hono } from 'hono';
import { Bindings, FileRecord } from '../types';
import { Database } from '../db/queries';
import { authMiddleware } from '../utils/auth';
import { nanoid } from 'nanoid';

const files = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
files.use('*', authMiddleware);

// ファイル一覧取得
files.get('/deals/:dealId', async (c) => {
  try {
    const dealId = c.req.param('dealId');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';

    const db = new Database(c.env.DB);
    const deal = await db.getDealById(dealId);

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    // 権限チェック
    if (role === 'AGENT' && deal.seller_id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const filesList = await db.getFilesByDeal(dealId);
    const totalSize = await db.getTotalFileSize(dealId);
    const settings = await db.getSettings();
    const maxSize = settings?.max_storage_per_deal || 52428800;

    return c.json({
      files: filesList,
      storage: {
        used: totalSize,
        max: maxSize,
        percentage: Math.round((totalSize / maxSize) * 100)
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ファイルアップロード（簡易版 - 実際のファイルストレージは未実装）
files.post('/deals/:dealId', async (c) => {
  try {
    const dealId = c.req.param('dealId');
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';

    const db = new Database(c.env.DB);
    const deal = await db.getDealById(dealId);

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    // 権限チェック
    if (role === 'AGENT' && deal.seller_id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // 容量チェック
    const totalSize = await db.getTotalFileSize(dealId);
    const settings = await db.getSettings();
    const maxSize = settings?.max_storage_per_deal || 52428800;

    // TODO: 実際のファイルアップロード処理
    // 現在は簡易版としてメタデータのみ保存

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const fileSize = file.size;

    if (totalSize + fileSize > maxSize) {
      return c.json({
        error: 'Storage limit exceeded',
        warning: 'この案件の保存容量上限を超えています。古い資料のアーカイブをご検討ください。',
        storage: {
          used: totalSize,
          max: maxSize,
          percentage: Math.round((totalSize / maxSize) * 100)
        }
      }, 400);
    }

    const newFile: Omit<FileRecord, 'created_at'> = {
      id: nanoid(),
      deal_id: dealId,
      uploader_id: userId,
      filename: file.name,
      file_type: 'OTHER',
      size_bytes: fileSize,
      storage_path: `files/${dealId}/${nanoid()}-${file.name}`,
      is_archived: 0
    };

    await db.createFile(newFile);

    return c.json({
      file: newFile,
      message: 'File uploaded successfully'
    }, 201);
  } catch (error) {
    console.error('Upload file error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default files;
