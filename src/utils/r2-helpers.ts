import { R2Bucket } from '@cloudflare/workers-types'

export interface FileMetadata {
  originalFilename: string
  uploadedBy: string
  dealId?: string
  uploadedAt: string
  folder: string
}

export interface FileUploadOptions {
  folder: string
  dealId?: string
  userId: string
  contentType?: string
}

/**
 * Generate unique file key for R2 storage
 */
export function generateFileKey(
  fileId: string,
  filename: string,
  folder: string,
  dealId?: string
): string {
  const fileExtension = filename.split('.').pop() || ''
  const basePath = dealId ? `${folder}/${dealId}` : `${folder}/general`
  return `${basePath}/${fileId}.${fileExtension}`
}

/**
 * Upload file to R2 with metadata
 */
export async function uploadToR2(
  r2: R2Bucket,
  fileId: string,
  file: File,
  options: FileUploadOptions
): Promise<string> {
  const objectKey = generateFileKey(fileId, file.name, options.folder, options.dealId)
  
  const arrayBuffer = await file.arrayBuffer()
  
  await r2.put(objectKey, arrayBuffer, {
    httpMetadata: {
      contentType: options.contentType || file.type || 'application/octet-stream'
    },
    customMetadata: {
      originalFilename: file.name,
      uploadedBy: options.userId,
      dealId: options.dealId || '',
      uploadedAt: new Date().toISOString(),
      folder: options.folder
    }
  })
  
  return objectKey
}

/**
 * Get file from R2
 */
export async function getFromR2(
  r2: R2Bucket,
  storagePath: string
): Promise<R2ObjectBody | null> {
  return await r2.get(storagePath)
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(
  r2: R2Bucket,
  storagePath: string
): Promise<void> {
  await r2.delete(storagePath)
}

/**
 * List files in R2 bucket with prefix
 */
export async function listFilesInR2(
  r2: R2Bucket,
  prefix?: string,
  limit: number = 1000
): Promise<R2Objects> {
  return await r2.list({
    prefix,
    limit
  })
}

/**
 * Get file metadata from R2
 */
export async function getFileMetadata(
  r2: R2Bucket,
  storagePath: string
): Promise<FileMetadata | null> {
  const object = await r2.head(storagePath)
  
  if (!object) {
    return null
  }
  
  const metadata = object.customMetadata as Record<string, string>
  
  return {
    originalFilename: metadata.originalFilename || '',
    uploadedBy: metadata.uploadedBy || '',
    dealId: metadata.dealId || undefined,
    uploadedAt: metadata.uploadedAt || '',
    folder: metadata.folder || 'deals'
  }
}

/**
 * Check if file exists in R2
 */
export async function fileExistsInR2(
  r2: R2Bucket,
  storagePath: string
): Promise<boolean> {
  const object = await r2.head(storagePath)
  return object !== null
}

/**
 * Copy file in R2
 */
export async function copyFileInR2(
  r2: R2Bucket,
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  const sourceObject = await r2.get(sourcePath)
  
  if (!sourceObject) {
    throw new Error('Source file not found')
  }
  
  await r2.put(destinationPath, sourceObject.body, {
    httpMetadata: sourceObject.httpMetadata,
    customMetadata: sourceObject.customMetadata
  })
}

/**
 * Get file size from R2
 */
export async function getFileSize(
  r2: R2Bucket,
  storagePath: string
): Promise<number | null> {
  const object = await r2.head(storagePath)
  return object?.size || null
}

/**
 * Validate file type
 */
export function validateFileType(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  return extension ? allowedExtensions.includes(extension) : false
}

/**
 * Validate file size
 */
export function validateFileSize(
  fileSize: number,
  maxSizeBytes: number
): boolean {
  return fileSize <= maxSizeBytes
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Get MIME type from extension
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip'
  }
  
  return mimeTypes[extension] || 'application/octet-stream'
}
