/**
 * エラーメッセージ定義
 * 全てのエラーメッセージを一元管理し、日本語化
 */

export const ErrorMessages = {
  // 認証エラー
  AUTH: {
    INVALID_CREDENTIALS: {
      code: 'AUTH_001',
      message: 'メールアドレスまたはパスワードが正しくありません',
      userMessage: 'ログイン情報をご確認ください'
    },
    TOKEN_EXPIRED: {
      code: 'AUTH_002',
      message: 'セッションの有効期限が切れました',
      userMessage: '再度ログインしてください'
    },
    TOKEN_INVALID: {
      code: 'AUTH_003',
      message: '認証トークンが無効です',
      userMessage: '再度ログインしてください'
    },
    UNAUTHORIZED: {
      code: 'AUTH_004',
      message: '認証が必要です',
      userMessage: 'ログインしてください'
    },
    FORBIDDEN: {
      code: 'AUTH_005',
      message: 'アクセス権限がありません',
      userMessage: 'この操作を実行する権限がありません'
    }
  },

  // バリデーションエラー
  VALIDATION: {
    REQUIRED_FIELD: {
      code: 'VAL_001',
      message: '必須項目が入力されていません',
      userMessage: '全ての必須項目を入力してください'
    },
    INVALID_EMAIL: {
      code: 'VAL_002',
      message: 'メールアドレスの形式が正しくありません',
      userMessage: '正しいメールアドレスを入力してください'
    },
    INVALID_PASSWORD: {
      code: 'VAL_003',
      message: 'パスワードが要件を満たしていません',
      userMessage: 'パスワードは8文字以上で入力してください'
    },
    INVALID_FORMAT: {
      code: 'VAL_004',
      message: '入力形式が正しくありません',
      userMessage: '正しい形式で入力してください'
    }
  },

  // データベースエラー
  DATABASE: {
    NOT_FOUND: {
      code: 'DB_001',
      message: 'データが見つかりません',
      userMessage: '指定されたデータは存在しません'
    },
    DUPLICATE: {
      code: 'DB_002',
      message: 'データが既に存在します',
      userMessage: 'このデータは既に登録されています'
    },
    CONSTRAINT_VIOLATION: {
      code: 'DB_003',
      message: 'データの整合性エラーです',
      userMessage: '入力内容を確認してください'
    },
    CONNECTION_ERROR: {
      code: 'DB_004',
      message: 'データベース接続エラーです',
      userMessage: '一時的なエラーが発生しました。しばらく待ってから再試行してください'
    }
  },

  // ファイルエラー
  FILE: {
    TOO_LARGE: {
      code: 'FILE_001',
      message: 'ファイルサイズが大きすぎます',
      userMessage: 'ファイルサイズは10MB以下にしてください'
    },
    INVALID_TYPE: {
      code: 'FILE_002',
      message: 'ファイル形式がサポートされていません',
      userMessage: '対応しているファイル形式で再度お試しください'
    },
    UPLOAD_FAILED: {
      code: 'FILE_003',
      message: 'ファイルのアップロードに失敗しました',
      userMessage: 'ファイルのアップロードに失敗しました。再度お試しください'
    },
    STORAGE_QUOTA_EXCEEDED: {
      code: 'FILE_004',
      message: 'ストレージ容量を超過しています',
      userMessage: 'ストレージ容量が不足しています。不要なファイルを削除してください'
    }
  },

  // OCRエラー
  OCR: {
    PROCESSING_FAILED: {
      code: 'OCR_001',
      message: 'OCR処理に失敗しました',
      userMessage: 'OCR処理に失敗しました。ファイルの品質を確認して再度お試しください'
    },
    TIMEOUT: {
      code: 'OCR_002',
      message: 'OCR処理がタイムアウトしました',
      userMessage: 'OCR処理に時間がかかりすぎています。ファイルサイズを小さくして再度お試しください'
    },
    LOW_QUALITY: {
      code: 'OCR_003',
      message: '画像品質が低すぎます',
      userMessage: 'より高解像度の画像を使用してください'
    }
  },

  // 外部API��ラー
  EXTERNAL_API: {
    TIMEOUT: {
      code: 'API_001',
      message: '外部APIがタイムアウトしました',
      userMessage: 'サーバーの応答が遅れています。しばらく待ってから再度お試しください'
    },
    UNAVAILABLE: {
      code: 'API_002',
      message: '外部APIが利用できません',
      userMessage: '一時的にサービスが利用できません。しばらく待ってから再度お試しください'
    },
    RATE_LIMIT: {
      code: 'API_003',
      message: 'APIのレート制限に達しました',
      userMessage: '短時間に多くのリクエストが送信されました。しばらく待ってから再度お試しください'
    }
  },

  // 一般エラー
  GENERAL: {
    INTERNAL_ERROR: {
      code: 'GEN_001',
      message: '内部サーバーエラーが発生しました',
      userMessage: '予期しないエラーが発生しました。管理者に連絡してください'
    },
    NETWORK_ERROR: {
      code: 'GEN_002',
      message: 'ネットワークエラーが発生しました',
      userMessage: 'ネットワーク接続を確認してください'
    },
    TIMEOUT: {
      code: 'GEN_003',
      message: '処理がタイムアウトしました',
      userMessage: '処理に時間がかかりすぎています。再度お試しください'
    }
  }
};

/**
 * エラーレスポンスを生成
 */
export function createErrorResponse(errorType: any, details?: string) {
  return {
    error: true,
    code: errorType.code,
    message: errorType.message,
    userMessage: errorType.userMessage,
    details: details || undefined,
    timestamp: new Date().toISOString()
  };
}

/**
 * HTTPステータスコードとエラーメッセージのマッピング
 */
export const HttpStatusMessages: Record<number, string> = {
  400: '不正なリクエストです',
  401: '認証が必要です',
  403: 'アクセス権限がありません',
  404: 'データが見つかりません',
  409: 'データが競合しています',
  413: 'リクエストが大きすぎます',
  422: '入力内容に誤りがあります',
  429: 'リクエストが多すぎます。しばらく待ってから再度お試しください',
  500: '内部サーバーエラーが発生しました',
  502: 'ゲートウェイエラーが発生しました',
  503: 'サービスが一時的に利用できません',
  504: 'ゲートウェイタイムアウトが発生しました'
};
