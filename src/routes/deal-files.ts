import { Hono } from 'hono';
import { Bindings } from '../types';
import { authMiddleware } from '../utils/auth';
import { nanoid } from 'nanoid';
import { checkStorageQuota, updateStorageQuotaOnUpload, updateStorageQuotaOnDelete } from '../utils/storage-quota';

const dealFiles = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
dealFiles.use('*', authMiddleware);

/**
 * ファイルアクセス権限チェック
 */
async function canAccessDealFiles(
  db: D1Database,
  userId: string,
  userRole: string,
  dealId: string
): Promise<boolean> {
  // 管理者は全案件のファイルにアクセス可能
  if (userRole === 'ADMIN') {
    return true;
  }

  // 案件の所有者チェック
  const deal = await db
    .prepare('SELECT seller_id FROM deals WHERE id = ?')
    .bind(dealId)
    .first<{ seller_id: string }>();

  return deal ? deal.seller_id === userId : false;
}

/**
 * ファイル一覧取得
 * GET /api/deals/:deal_id/files
 */
dealFiles.get('/:deal_id/files', async (c) => {
  try {
    const dealId = c.req.param('deal_id');
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    const { DB } = c.env;

    // 権限チェック
    const hasAccess = await canAccessDealFiles(DB, userId, userRole, dealId);
    if (!hasAccess) {
      return c.json({ error: 'アクセス権限がありません' }, 403);
    }

    // ファイル一覧取得
    const files = await DB.prepare(`
      SELECT 
        id,
        file_name,
        file_type,
        file_size,
        uploaded_at,
        uploaded_by,
        is_ocr_source
      FROM deal_files
      WHERE deal_id = ?
      ORDER BY uploaded_at DESC
    `).bind(dealId).all();

    // 合計サイズとファイル数を計算
    const totalSize = files.results.reduce((sum: number, file: any) => sum + (file.file_size || 0), 0);

    return c.json({
      success: true,
      files: files.results || [],
      total_size: totalSize,
      file_count: files.results.length
    });
  } catch (error) {
    console.error('Get deal files error:', error);
    return c.json({
      error: 'ファイル一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * ファイルアップロード
 * POST /api/deals/:deal_id/files
 */
dealFiles.post('/:deal_id/files', async (c) => {
  try {
    const dealId = c.req.param('deal_id');
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    const { DB, FILES_BUCKET } = c.env;

    // 権限チェック
    const hasAccess = await canAccessDealFiles(DB, userId, userRole, dealId);
    if (!hasAccess) {
      return c.json({ error: 'アクセス権限がありません' }, 403);
    }

    // フォームデータ取得
    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];
    const fileType = formData.get('file_type') as string || 'document';
    const isOcrSource = formData.get('is_ocr_source') === 'true';

    if (!files || files.length === 0) {
      return c.json({ error: 'ファイルが選択されていません' }, 400);
    }

    // 合計ファイルサイズ計算
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    // ストレージクォータチェック
    const quotaCheck = await checkStorageQuota(DB, userId, totalSize);
    if (!quotaCheck.allowed) {
      return c.json({ 
        error: 'ストレージ容量不足',
        message: quotaCheck.message 
      }, 413);
    }

    const uploadedFiles = [];

    for (const file of files) {
      const fileId = nanoid();
      const fileName = file.name;
      const fileSize = file.size;
      const mimeType = file.type;

      // R2キー生成
      const r2Key = `deals/${dealId}/${fileType}/${fileId}_${fileName}`;

      // R2にファイル実体を保存
      const arrayBuffer = await file.arrayBuffer();
      await FILES_BUCKET.put(r2Key, arrayBuffer, {
        httpMetadata: {
          contentType: mimeType
        }
      });

      // DBにメタデータを保存
      await DB.prepare(`
        INSERT INTO deal_files (
          id, deal_id, user_id, file_name, file_type, file_size,
          r2_key, mime_type, uploaded_by, is_ocr_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        fileId,
        dealId,
        userId,
        fileName,
        fileType,
        fileSize,
        r2Key,
        mimeType,
        userId,
        isOcrSource ? 1 : 0
      ).run();

      // ストレージクォータを更新
      const fileCategory = fileType === 'ocr' ? 'ocr_document' : 
                          fileType === 'image' ? 'photo' : 'other';
      await updateStorageQuotaOnUpload(DB, userId, fileSize, fileCategory);

      uploadedFiles.push({
        id: fileId,
        file_name: fileName,
        file_size: fileSize,
        r2_key: r2Key
      });
    }

    return c.json({
      success: true,
      message: `${uploadedFiles.length}件のファイルをアップロードしました`,
      uploaded_files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload deal files error:', error);
    return c.json({
      error: 'ファイルのアップロードに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * ファイルダウンロード
 * GET /api/deals/:deal_id/files/:file_id/download
 */
dealFiles.get('/:deal_id/files/:file_id/download', async (c) => {
  try {
    const dealId = c.req.param('deal_id');
    const fileId = c.req.param('file_id');
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    const { DB, FILES_BUCKET } = c.env;

    // 権限チェック
    const hasAccess = await canAccessDealFiles(DB, userId, userRole, dealId);
    if (!hasAccess) {
      return c.json({ error: 'アクセス権限がありません' }, 403);
    }

    // ファイルメタデータ取得
    const file = await DB.prepare(`
      SELECT * FROM deal_files
      WHERE id = ? AND deal_id = ?
    `).bind(fileId, dealId).first();

    if (!file) {
      return c.json({ error: 'ファイルが見つかりません' }, 404);
    }

    // R2からファイル実体を取得
    const object = await FILES_BUCKET.get(file.r2_key as string);
    if (!object) {
      return c.json({ error: 'ファイルの実体が見つかりません' }, 404);
    }

    // ファイルをダウンロード
    return new Response(object.body, {
      headers: {
        'Content-Type': file.mime_type as string || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.file_name}"`,
        'Content-Length': String(file.file_size)
      }
    });
  } catch (error) {
    console.error('Download deal file error:', error);
    return c.json({
      error: 'ファイルのダウンロードに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 管理者用: 全ユーザーのファイル一覧取得
 * GET /api/deals/admin/files/all
 */
dealFiles.get('/admin/files/all', async (c) => {
  try {
    const userRole = c.get('userRole') as string;
    const { DB } = c.env;

    // 管理者権限チェック
    if (userRole !== 'ADMIN') {
      return c.json({ error: 'アクセス権限がありません' }, 403);
    }

    // 全ファイルを取得（案件情報、ユーザー情報を結合）
    const files = await DB.prepare(`
      SELECT 
        df.id,
        df.file_name,
        df.file_type,
        df.file_size,
        df.uploaded_at,
        df.deal_id,
        df.user_id,
        df.is_ocr_source,
        d.location AS deal_location,
        d.status AS deal_status,
        u.name AS user_name
      FROM deal_files df
      LEFT JOIN deals d ON df.deal_id = d.id
      LEFT JOIN users u ON df.user_id = u.id
      ORDER BY df.uploaded_at DESC
    `).all();

    // 統計情報を計算
    const totalSize = files.results.reduce((sum: number, file: any) => sum + (file.file_size || 0), 0);
    const totalFiles = files.results.length;

    // ユーザー別統計
    const userStats = new Map<string, { user_name: string; file_count: number; total_size: number }>();
    for (const file of files.results) {
      const userId = (file as any).user_id as string;
      const userName = (file as any).user_name as string;
      const fileSize = (file as any).file_size as number;
      
      if (!userStats.has(userId)) {
        userStats.set(userId, { user_name: userName, file_count: 0, total_size: 0 });
      }
      const stats = userStats.get(userId)!;
      stats.file_count++;
      stats.total_size += fileSize;
    }

    return c.json({
      success: true,
      files: files.results || [],
      statistics: {
        total_files: totalFiles,
        total_size: totalSize,
        user_stats: Array.from(userStats.entries()).map(([user_id, stats]) => ({
          user_id,
          ...stats
        }))
      }
    });
  } catch (error) {
    console.error('Get all files error:', error);
    return c.json({
      error: 'ファイル一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 複数ファイルの一括ダウンロード（ZIP形式）
 * POST /api/deals/:deal_id/files/bulk-download
 * リクエストボディ: { file_ids: string[] }
 */
dealFiles.post('/:deal_id/files/bulk-download', async (c) => {
  try {
    const dealId = c.req.param('deal_id');
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    const { DB, FILES_BUCKET } = c.env;

    // 権限チェック
    const hasAccess = await canAccessDealFiles(DB, userId, userRole, dealId);
    if (!hasAccess) {
      return c.json({ error: 'アクセス権限がありません' }, 403);
    }

    // リクエストボディから file_ids を取得
    const body = await c.req.json();
    const fileIds = body.file_ids as string[];

    if (!fileIds || fileIds.length === 0) {
      return c.json({ error: 'ファイルIDが指定されていません' }, 400);
    }

    // ファイルメタデータを一括取得
    const placeholders = fileIds.map(() => '?').join(',');
    const files = await DB.prepare(`
      SELECT * FROM deal_files
      WHERE deal_id = ? AND id IN (${placeholders})
    `).bind(dealId, ...fileIds).all();

    if (!files.results || files.results.length === 0) {
      return c.json({ error: 'ファイルが見つかりません' }, 404);
    }

    // ZIP作成（簡易実装: TransformStreamを使用）
    // Cloudflare WorkersではNode.jsのzipライブラリが使えないため、
    // クライアント側でZIP作成するか、シンプルなストリーミング実装が必要
    
    // ここでは、複数ファイルのメタデータを返し、
    // クライアント側で個別ダウンロード→JSZipでZIP化する方式を採用
    const downloadableFiles = files.results.map((file: any) => ({
      id: file.id,
      file_name: file.file_name,
      file_size: file.file_size,
      download_url: `/api/deals/${dealId}/files/${file.id}/download`
    }));

    return c.json({
      success: true,
      message: `${downloadableFiles.length}件のファイルをダウンロード準備完了`,
      files: downloadableFiles,
      deal_id: dealId
    });

  } catch (error) {
    console.error('Bulk download error:', error);
    return c.json({
      error: '一括ダウンロードの準備に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * ファイル削除
 * DELETE /api/deals/:deal_id/files/:file_id
 */
dealFiles.delete('/:deal_id/files/:file_id', async (c) => {
  try {
    const dealId = c.req.param('deal_id');
    const fileId = c.req.param('file_id');
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    const { DB, FILES_BUCKET } = c.env;

    // 権限チェック
    const hasAccess = await canAccessDealFiles(DB, userId, userRole, dealId);
    if (!hasAccess) {
      return c.json({ error: 'アクセス権限がありません' }, 403);
    }

    // ファイルメタデータ取得
    const file = await DB.prepare(`
      SELECT * FROM deal_files
      WHERE id = ? AND deal_id = ?
    `).bind(fileId, dealId).first();

    if (!file) {
      return c.json({ error: 'ファイルが見つかりません' }, 404);
    }

    // R2からファイル実体を削除
    await FILES_BUCKET.delete(file.r2_key as string);

    // DBからメタデータを削除
    await DB.prepare(`
      DELETE FROM deal_files
      WHERE id = ? AND deal_id = ?
    `).bind(fileId, dealId).run();

    // ストレージクォータを更新
    const fileCategory = (file.file_type as string) === 'ocr' ? 'ocr_document' : 
                        (file.file_type as string) === 'image' ? 'photo' : 'other';
    await updateStorageQuotaOnDelete(DB, file.user_id as string, file.file_size as number, fileCategory);

    return c.json({
      success: true,
      message: 'ファイルを削除しました'
    });
  } catch (error) {
    console.error('Delete deal file error:', error);
    return c.json({
      error: 'ファイルの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default dealFiles;
