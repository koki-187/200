import { z } from 'zod'

// Allowed file extensions by category
export const ALLOWED_EXTENSIONS = {
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'],
  images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
  archives: ['zip', 'rar', '7z'],
  cad: ['dwg', 'dxf']
}

// Max file sizes by type (in bytes)
export const MAX_FILE_SIZES = {
  document: 10 * 1024 * 1024, // 10MB
  image: 5 * 1024 * 1024, // 5MB
  archive: 50 * 1024 * 1024, // 50MB
  default: 10 * 1024 * 1024 // 10MB
}

// File upload validation schema
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().positive().max(MAX_FILE_SIZES.archive),
  type: z.string().optional(),
  dealId: z.string().optional(),
  folder: z.enum(['deals', 'proposals', 'registry', 'reports', 'chat', 'general']).default('deals')
})

// Folder classification rules
export const FOLDER_CLASSIFICATIONS = {
  deals: {
    description: '案件関連ファイル',
    allowedTypes: [...ALLOWED_EXTENSIONS.documents, ...ALLOWED_EXTENSIONS.images, ...ALLOWED_EXTENSIONS.cad]
  },
  proposals: {
    description: '提案書',
    allowedTypes: [...ALLOWED_EXTENSIONS.documents, ...ALLOWED_EXTENSIONS.images]
  },
  registry: {
    description: '登記簿謄本',
    allowedTypes: ['pdf', ...ALLOWED_EXTENSIONS.images]
  },
  reports: {
    description: 'レポート',
    allowedTypes: [...ALLOWED_EXTENSIONS.documents]
  },
  chat: {
    description: 'チャット添付',
    allowedTypes: [...ALLOWED_EXTENSIONS.documents, ...ALLOWED_EXTENSIONS.images]
  },
  general: {
    description: 'その他',
    allowedTypes: [...ALLOWED_EXTENSIONS.documents, ...ALLOWED_EXTENSIONS.images, ...ALLOWED_EXTENSIONS.archives]
  }
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string, folder: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (!extension) return false
  
  const classification = FOLDER_CLASSIFICATIONS[folder as keyof typeof FOLDER_CLASSIFICATIONS]
  return classification ? classification.allowedTypes.includes(extension) : false
}

/**
 * Validate file size based on type
 */
export function validateFileSizeByType(size: number, extension: string): boolean {
  const ext = extension.toLowerCase()
  
  if (ALLOWED_EXTENSIONS.images.includes(ext)) {
    return size <= MAX_FILE_SIZES.image
  } else if (ALLOWED_EXTENSIONS.archives.includes(ext)) {
    return size <= MAX_FILE_SIZES.archive
  } else if (ALLOWED_EXTENSIONS.documents.includes(ext)) {
    return size <= MAX_FILE_SIZES.document
  }
  
  return size <= MAX_FILE_SIZES.default
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '')
  
  // Remove special characters except dots, dashes, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  
  // Limit filename length (preserve extension)
  const parts = sanitized.split('.')
  const extension = parts.pop() || ''
  let basename = parts.join('.')
  
  if (basename.length > 200) {
    basename = basename.substring(0, 200)
  }
  
  return extension ? `${basename}.${extension}` : basename
}

/**
 * Get file category from extension
 */
export function getFileCategory(extension: string): 'document' | 'image' | 'archive' | 'other' {
  const ext = extension.toLowerCase()
  
  if (ALLOWED_EXTENSIONS.documents.includes(ext)) {
    return 'document'
  } else if (ALLOWED_EXTENSIONS.images.includes(ext)) {
    return 'image'
  } else if (ALLOWED_EXTENSIONS.archives.includes(ext)) {
    return 'archive'
  }
  
  return 'other'
}

/**
 * Validate complete file upload
 */
export function validateFileUpload(
  filename: string,
  size: number,
  folder: string
): { valid: boolean; error?: string } {
  // Sanitize filename
  const sanitized = sanitizeFilename(filename)
  
  // Check extension
  if (!validateFileExtension(sanitized, folder)) {
    return {
      valid: false,
      error: `ファイル形式が許可されていません。許可されている形式: ${FOLDER_CLASSIFICATIONS[folder as keyof typeof FOLDER_CLASSIFICATIONS].allowedTypes.join(', ')}`
    }
  }
  
  // Check size
  const extension = sanitized.split('.').pop() || ''
  if (!validateFileSizeByType(size, extension)) {
    const category = getFileCategory(extension)
    const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます。最大: ${(maxSize / (1024 * 1024)).toFixed(0)}MB`
    }
  }
  
  return { valid: true }
}
