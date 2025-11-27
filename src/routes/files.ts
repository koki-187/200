import { Hono } from 'hono';
import { Bindings, FileRecord } from '../types';
import { Database } from '../db/queries';
import { authMiddleware } from '../utils/auth';
import { nanoid } from 'nanoid';

const files = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
files.use('*', authMiddleware);

// ファイル検索（全案件横断）
files.get('/search', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const role = c.get('userRole') as 'ADMIN' | 'AGENT';
    
    // 検索パラメータ取得
    const filename = c.req.query('filename');
    const fileType = c.req.query('file_type');
    const uploaderId = c.req.query('uploader_id');
    const dealId = c.req.query('deal_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const isArchived = c.req.query('is_archived');
    const minSize = c.req.query('min_size');
    const maxSize = c.req.query('max_size');
    
    // ページネーション
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;
    
    // ソート
    const sortBy = c.req.query('sort_by') || 'created_at';
    const sortOrder = (c.req.query('sort_order') || 'desc').toLowerCase();
    
    const allowedSortColumns = ['created_at', 'filename', 'size_bytes', 'file_type'];
    const orderColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    let query = `
      SELECT f.*, d.title as deal_title, u.name as uploader_name
      FROM files f
      LEFT JOIN deals d ON f.deal_id = d.id
      LEFT JOIN users u ON f.uploader_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    // エージェントの場合、自分に関連する案件のファイルのみ表示
    if (role === 'AGENT') {
      query += ' AND (d.seller_id = ? OR d.buyer_id = ?)';
      params.push(userId, userId);
    }
    
    // ファイル名検索（部分一致）
    if (filename) {
      query += ' AND f.filename LIKE ?';
      params.push(`%${filename}%`);
    }
    
    // ファイルタイプフィルター
    if (fileType) {
      query += ' AND f.file_type = ?';
      params.push(fileType);
    }
    
    // アップローダーフィルター
    if (uploaderId) {
      query += ' AND f.uploader_id = ?';
      params.push(uploaderId);
    }
    
    // 案件IDフィルター
    if (dealId) {
      query += ' AND f.deal_id = ?';
      params.push(dealId);
    }
    
    // 日付範囲フィルター
    if (startDate) {
      query += ' AND f.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND f.created_at <= ?';
      params.push(endDate);
    }
    
    // アーカイブステータスフィルター
    if (isArchived !== undefined) {
      query += ' AND f.is_archived = ?';
      params.push(isArchived === '1' ? 1 : 0);
    }
    
    // ファイルサイズ範囲フィルター
    if (minSize) {
      query += ' AND f.size_bytes >= ?';
      params.push(parseInt(minSize));
    }
    if (maxSize) {
      query += ' AND f.size_bytes <= ?';
      params.push(parseInt(maxSize));
    }
    
    // 合計件数取得
    const countQuery = query.replace(
      'SELECT f.*, d.title as deal_title, u.name as uploader_name',
      'SELECT COUNT(*) as total'
    );
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const totalCount = countResult?.total || 0;
    
    // ソートとページネーション
    query += ` ORDER BY f.${orderColumn} ${orderDirection} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    const filesList = result.results || [];
    
    // 総ファイルサイズを計算
    const totalSizeQuery = query
      .replace('SELECT f.*, d.title as deal_title, u.name as uploader_name', 'SELECT SUM(f.size_bytes) as total_size')
      .replace(`ORDER BY f.${orderColumn} ${orderDirection} LIMIT ? OFFSET ?`, '');
    const sizeParams = params.slice(0, -2); // limit と offset を除外
    const totalSizeResult = await c.env.DB.prepare(totalSizeQuery).bind(...sizeParams).first<{ total_size: number }>();
    const totalSize = totalSizeResult?.total_size || 0;
    
    return c.json({
      files: filesList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      summary: {
        total_files: totalCount,
        total_size_bytes: totalSize,
        total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
      },
      filters: {
        filename,
        file_type: fileType,
        uploader_id: uploaderId,
        deal_id: dealId,
        start_date: startDate,
        end_date: endDate,
        is_archived: isArchived,
        min_size: minSize,
        max_size: maxSize
      },
      sort: {
        by: orderColumn,
        order: orderDirection
      }
    });
  } catch (error) {
    console.error('Search files error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ファイル一覧取得（特定案件）
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
