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

    // ファイル検証
    const fileSize = file.size;
    const fileName = file.name;
    const fileType = file.type;

    // ファイルサイズ検証（10MB上限）
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileSize > MAX_FILE_SIZE) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400);
    }

    // ファイル名検証（危険な文字を排除）
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/g;
    if (dangerousChars.test(fileName)) {
      return c.json({ error: 'Invalid file name' }, 400);
    }

    // MIMEタイプ検証（許可リスト）
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'text/plain'
    ];

    if (!allowedTypes.includes(fileType)) {
      return c.json({ 
        error: 'File type not allowed',
        allowed: 'PDF, JPEG, PNG, GIF, Excel, Word, ZIP, TXT'
      }, 400);
    }

    // 拡張子検証（MIMEタイプと一致するか）
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeExtensionMap: Record<string, string[]> = {
      'application/pdf': ['pdf'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/jpg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'application/vnd.ms-excel': ['xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
      'application/zip': ['zip'],
      'text/plain': ['txt']
    };

    const expectedExtensions = mimeExtensionMap[fileType] || [];
    if (!extension || !expectedExtensions.includes(extension)) {
      return c.json({ error: 'File extension does not match file type' }, 400);
    }

    // 容量チェック
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
