import { Hono } from 'hono'
import { Bindings } from '../types'
import { authMiddleware } from '../utils/auth'
import { nanoid } from 'nanoid'
import { uploadToR2, getFromR2, deleteFromR2 } from '../utils/r2-helpers'
import { validateFileUpload, sanitizeFilename } from '../utils/file-validators'

const app = new Hono<{ Bindings: Bindings }>()

// すべてのルートに認証を適用
app.use('/*', authMiddleware)

// ファイルアップロード
app.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const dealId = formData.get('dealId') as string | null
    const folder = (formData.get('folder') as string) || 'deals'
    
    if (!file) {
      return c.json({ error: 'ファイルが見つかりません' }, 400)
    }

    // Sanitize and validate filename
    const sanitizedFilename = sanitizeFilename(file.name)
    const validation = validateFileUpload(sanitizedFilename, file.size, folder)
    
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400)
    }

    // Generate unique file ID
    const fileId = nanoid()

    // Upload to R2
    const objectKey = await uploadToR2(c.env.R2_FILES, fileId, file, {
      folder,
      dealId: dealId || undefined,
      userId: c.get('userId'),
      contentType: file.type
    })

    // Save file record to database
    const db = c.env.DB
    await db
      .prepare(`
        INSERT INTO files (id, deal_id, uploader_id, filename, file_type, size_bytes, storage_path, folder, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(
        fileId,
        dealId || null,
        c.get('userId'),
        sanitizedFilename,
        folder.toUpperCase(),
        file.size,
        objectKey,
        folder
      )
      .run()

    return c.json({
      success: true,
      file: {
        id: fileId,
        filename: sanitizedFilename,
        size: file.size,
        type: file.type,
        key: objectKey,
        url: `/api/r2/download/${fileId}`
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'アップロードに失敗しました' }, 500)
  }
})

// ファイルダウンロード
app.get('/download/:fileId', async (c) => {
  try {
    const { fileId } = c.req.param()
    const db = c.env.DB

    // Get file record from database
    const fileRecord = await db
      .prepare('SELECT * FROM files WHERE id = ? AND is_archived = 0')
      .bind(fileId)
      .first()

    if (!fileRecord) {
      return c.json({ error: 'ファイルが見つかりません' }, 404)
    }

    // Get file from R2
    const object = await getFromR2(c.env.R2_FILES, fileRecord.storage_path as string)

    if (!object) {
      return c.json({ error: 'ファイルが見つかりません' }, 404)
    }

    // Return file
    const headers = new Headers()
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${fileRecord.filename}"`)
    headers.set('Content-Length', object.size.toString())

    return new Response(object.body, { headers })
  } catch (error) {
    console.error('Download error:', error)
    return c.json({ error: 'ダウンロードに失敗しました' }, 500)
  }
})

// ファイルリスト取得
app.get('/files', async (c) => {
  try {
    const dealId = c.req.query('dealId')
    const folder = c.req.query('folder')
    const db = c.env.DB

    let query = 'SELECT * FROM files WHERE is_archived = 0'
    const params: any[] = []

    if (dealId) {
      query += ' AND deal_id = ?'
      params.push(dealId)
    }

    if (folder) {
      query += ' AND file_type = ?'
      params.push(folder.toUpperCase())
    }

    query += ' ORDER BY created_at DESC'

    const { results } = await db.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      files: results.map((file: any) => ({
        ...file,
        url: `/api/r2/download/${file.id}`
      }))
    })
  } catch (error) {
    console.error('List files error:', error)
    return c.json({ error: 'ファイルリストの取得に失敗しました' }, 500)
  }
})

// ファイル削除（論理削除）
app.delete('/:fileId', async (c) => {
  try {
    const { fileId } = c.req.param()
    const db = c.env.DB

    // Mark as archived instead of deleting
    await db
      .prepare('UPDATE files SET is_archived = 1 WHERE id = ?')
      .bind(fileId)
      .run()

    return c.json({ success: true, message: 'ファイルを削除しました' })
  } catch (error) {
    console.error('Delete error:', error)
    return c.json({ error: 'ファイルの削除に失敗しました' }, 500)
  }
})

// ファイル物理削除（管理者のみ）
app.delete('/permanent/:fileId', async (c) => {
  try {
    const userRole = c.get('userRole')
    if (userRole !== 'ADMIN') {
      return c.json({ error: '権限がありません' }, 403)
    }

    const { fileId } = c.req.param()
    const db = c.env.DB

    // Get file record
    const fileRecord = await db
      .prepare('SELECT storage_path FROM files WHERE id = ?')
      .bind(fileId)
      .first()

    if (!fileRecord) {
      return c.json({ error: 'ファイルが見つかりません' }, 404)
    }

    // Delete from R2
    await deleteFromR2(c.env.R2_FILES, fileRecord.storage_path as string)

    // Delete from database
    await db
      .prepare('DELETE FROM files WHERE id = ?')
      .bind(fileId)
      .run()

    return c.json({ success: true, message: 'ファイルを完全に削除しました' })
  } catch (error) {
    console.error('Permanent delete error:', error)
    return c.json({ error: 'ファイルの削除に失敗しました' }, 500)
  }
})

// ストレージ使用量取得
app.get('/storage/usage', async (c) => {
  try {
    const dealId = c.req.query('dealId')
    const db = c.env.DB

    let query = 'SELECT SUM(size_bytes) as total_size, COUNT(*) as file_count FROM files WHERE is_archived = 0'
    const params: any[] = []

    if (dealId) {
      query += ' AND deal_id = ?'
      params.push(dealId)
    }

    const result = await db.prepare(query).bind(...params).first()

    return c.json({
      success: true,
      usage: {
        totalSize: result?.total_size || 0,
        fileCount: result?.file_count || 0,
        totalSizeMB: ((result?.total_size || 0) / (1024 * 1024)).toFixed(2)
      }
    })
  } catch (error) {
    console.error('Storage usage error:', error)
    return c.json({ error: 'ストレージ使用量の取得に失敗しました' }, 500)
  }
})

export default app
