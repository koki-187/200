import { Hono } from 'hono';
import { Bindings } from '../types';
import { authMiddleware } from '../utils/auth';
import { nanoid } from 'nanoid';

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
 * 
 * Note: R2が有効でない場合、ファイルメタデータのみをDBに保存
 */
dealFiles.post('/:deal_id/files', async (c) => {
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

    // フォームデータ取得
    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];
    const fileType = formData.get('file_type') as string || 'document';
    const isOcrSource = formData.get('is_ocr_source') === 'true';

    if (!files || files.length === 0) {
      return c.json({ error: 'ファイルが選択されていません' }, 400);
    }

    const uploadedFiles = [];

    for (const file of files) {
      const fileId = nanoid();
      const fileName = file.name;
      const fileSize = file.size;
      const mimeType = file.type;

      // R2キー生成（将来R2を有効にした場合に備えて）
      const r2Key = `deals/${dealId}/${fileType}/${fileId}_${fileName}`;

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
 * 
 * Note: R2が有効でない場合、メタデータのみを返す
 */
dealFiles.get('/:deal_id/files/:file_id/download', async (c) => {
  try {
    const dealId = c.req.param('deal_id');
    const fileId = c.req.param('file_id');
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    const { DB } = c.env;

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

    // R2が有効でない場合、メタデータのみを返す
    return c.json({
      success: true,
      message: 'R2ストレージが有効でないため、ファイルのダウンロードは現在利用できません',
      file: {
        id: file.id,
        file_name: file.file_name,
        file_size: file.file_size,
        mime_type: file.mime_type,
        uploaded_at: file.uploaded_at
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
 * ファイル削除
 * DELETE /api/deals/:deal_id/files/:file_id
 */
dealFiles.delete('/:deal_id/files/:file_id', async (c) => {
  try {
    const dealId = c.req.param('deal_id');
    const fileId = c.req.param('file_id');
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    const { DB } = c.env;

    // 権限チェック
    const hasAccess = await canAccessDealFiles(DB, userId, userRole, dealId);
    if (!hasAccess) {
      return c.json({ error: 'アクセス権限がありません' }, 403);
    }

    // ファイル削除
    await DB.prepare(`
      DELETE FROM deal_files
      WHERE id = ? AND deal_id = ?
    `).bind(fileId, dealId).run();

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
