import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: '200戸土地仕入れ管理システム API',
    version: '1.5.0',
    description: '不動産仲介業者向け200戸マンション用地取得案件管理システムのREST API',
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    },
    license: {
      name: 'Private',
      url: 'https://example.com/license'
    }
  },
  servers: [
    {
      url: 'https://webapp.pages.dev/api',
      description: '本番環境'
    },
    {
      url: 'http://localhost:3000/api',
      description: 'ローカル開発環境'
    }
  ],
  tags: [
    { name: 'Authentication', description: '認証関連API' },
    { name: 'Users', description: 'ユーザー管理API' },
    { name: 'Deals', description: '案件管理API' },
    { name: 'Messages', description: 'メッセージ・チャットAPI' },
    { name: 'Files', description: 'ファイル管理API' },
    { name: 'Notifications', description: '通知管理API' },
    { name: 'OCR', description: 'OCR処理API' },
    { name: 'PDF', description: 'PDF生成API' },
    { name: 'Email', description: 'メール送信API' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT認証トークン'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'エラーメッセージ'
          },
          details: {
            type: 'object',
            description: '詳細なエラー情報（オプション）'
          }
        },
        required: ['error']
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ユーザーID' },
          email: { type: 'string', format: 'email', description: 'メールアドレス' },
          name: { type: 'string', description: 'ユーザー名' },
          role: { type: 'string', enum: ['ADMIN', 'AGENT'], description: 'ロール' },
          company_name: { type: 'string', description: '会社名（オプション）' },
          created_at: { type: 'string', format: 'date-time', description: '作成日時' },
          updated_at: { type: 'string', format: 'date-time', description: '更新日時' }
        },
        required: ['id', 'email', 'name', 'role', 'created_at', 'updated_at']
      },
      Deal: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '案件ID' },
          title: { type: 'string', description: '案件名' },
          status: { 
            type: 'string', 
            enum: ['NEW', 'IN_REVIEW', 'REPLIED', 'CLOSED'],
            description: 'ステータス'
          },
          buyer_id: { type: 'string', description: '買主ID' },
          seller_id: { type: 'string', description: '売主ID' },
          location: { type: 'string', description: '所在地' },
          station: { type: 'string', description: '最寄り駅' },
          land_area: { type: 'string', description: '土地面積' },
          desired_price: { type: 'string', description: '希望価格' },
          reply_deadline: { type: 'string', format: 'date-time', description: '回答期限' },
          created_at: { type: 'string', format: 'date-time', description: '作成日時' },
          updated_at: { type: 'string', format: 'date-time', description: '更新日時' }
        },
        required: ['id', 'title', 'status', 'buyer_id', 'seller_id', 'created_at', 'updated_at']
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'メッセージID' },
          deal_id: { type: 'string', description: '案件ID' },
          sender_id: { type: 'string', description: '送信者ID' },
          content: { type: 'string', description: 'メッセージ内容' },
          has_attachments: { type: 'integer', description: '添付ファイル有無（0/1）' },
          created_at: { type: 'string', format: 'date-time', description: '作成日時' }
        },
        required: ['id', 'deal_id', 'sender_id', 'content', 'created_at']
      },
      FileRecord: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ファイルID' },
          deal_id: { type: 'string', description: '案件ID' },
          filename: { type: 'string', description: 'ファイル名' },
          file_type: { 
            type: 'string',
            enum: ['OVERVIEW', 'REGISTRY', 'MAP', 'REPORT', 'CHAT', 'OTHER'],
            description: 'ファイルタイプ'
          },
          size_bytes: { type: 'integer', description: 'ファイルサイズ（バイト）' },
          folder: { 
            type: 'string',
            enum: ['deals', 'proposals', 'registry', 'reports', 'chat', 'general'],
            description: 'フォルダー分類'
          },
          created_at: { type: 'string', format: 'date-time', description: '作成日時' }
        },
        required: ['id', 'filename', 'file_type', 'size_bytes', 'created_at']
      }
    },
    responses: {
      UnauthorizedError: {
        description: '認証エラー - トークンが無効または期限切れ',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Authentication required' }
          }
        }
      },
      ForbiddenError: {
        description: '権限エラー - リソースへのアクセス権限がない',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Access denied' }
          }
        }
      },
      NotFoundError: {
        description: 'リソースが見つからない',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Resource not found' }
          }
        }
      },
      ValidationError: {
        description: 'バリデーションエラー',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { 
              error: 'Validation failed',
              details: { email: 'Invalid email format' }
            }
          }
        }
      },
      RateLimitError: {
        description: 'レート制限エラー',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                retryAfter: { type: 'integer', description: '再試行可能になるまでの秒数' }
              }
            },
            example: { 
              error: 'Too many requests, please try again later',
              retryAfter: 60
            }
          }
        }
      }
    }
  },
  security: [
    { bearerAuth: [] }
  ]
}

export function generateOpenApiSpec() {
  return openApiSpec
}
