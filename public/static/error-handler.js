/**
 * フロントエンド用エラーハンドリングユーティリティ
 * グローバルエラーハンドラーとAPIエラー処理
 */

(function() {
  'use strict';

  // エラーメッセージの表示
  function showErrorMessage(title, message, type = 'error') {
    const colors = {
      error: 'bg-red-100 border-red-400 text-red-700',
      warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
      info: 'bg-blue-100 border-blue-400 text-blue-700'
    };

    const alert = document.createElement('div');
    alert.className = `${colors[type]} border px-4 py-3 rounded relative mb-4 animate-fade-in`;
    alert.setAttribute('role', 'alert');
    alert.innerHTML = `
      <strong class="font-bold">${title}</strong>
      <span class="block sm:inline ml-2">${message}</span>
      <span class="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onclick="this.parentElement.remove()">
        <svg class="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
        </svg>
      </span>
    `;

    // メインコンテンツの最初に挿入
    const mainContent = document.querySelector('main') || document.body;
    mainContent.insertBefore(alert, mainContent.firstChild);

    // 5秒後に自動削除
    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove();
      }
    }, 5000);
  }

  // APIエラーの処理
  function handleAPIError(error, context = 'API呼び出し') {
    console.error(`[${context}]`, error);

    let title = 'エラーが発生しました';
    let message = '予期しないエラーが発生しました。';
    let type = 'error';

    // レスポンスエラーの場合
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          title = '入力エラー';
          message = data?.message || '入力内容に誤りがあります。';
          type = 'warning';
          break;
        case 401:
          title = '認証エラー';
          message = 'ログインしてください。';
          type = 'warning';
          // 3秒後にログインページにリダイレクト
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
          break;
        case 403:
          title = 'アクセス拒否';
          message = 'この操作を実行する権限がありません。';
          type = 'warning';
          break;
        case 404:
          title = 'データが見つかりません';
          message = '指定されたデータが見つかりませんでした。';
          type = 'warning';
          break;
        case 413:
          title = 'ファイルサイズエラー';
          message = 'ファイルサイズが大きすぎます。ストレージ容量を確認してください。';
          type = 'error';
          break;
        case 429:
          title = 'リクエスト制限';
          message = 'リクエストが多すぎます。しばらく待ってから再試行してください。';
          type = 'warning';
          break;
        case 500:
          title = 'サーバーエラー';
          message = data?.message || 'サーバーで問題が発生しました。';
          type = 'error';
          break;
        case 503:
          title = 'サービス一時停止';
          message = 'サービスが一時的に利用できません。しばらく待ってから再試行してください。';
          type = 'warning';
          break;
        case 504:
          title = 'タイムアウト';
          message = 'リクエストがタイムアウトしました。再試行してください。';
          type = 'warning';
          break;
        default:
          message = data?.message || `エラーコード: ${status}`;
      }
    } 
    // ネットワークエラーの場合
    else if (error.request) {
      title = 'ネットワークエラー';
      message = 'サーバーに接続できません。インターネット接続を確認してください。';
      type = 'error';
    }
    // その他のエラー
    else {
      message = error.message || '予期しないエラーが発生しました。';
    }

    showErrorMessage(title, message, type);
    return { title, message, type };
  }

  // リトライ機能付きfetch
  async function fetchWithRetry(url, options = {}, maxRetries = 2, retryDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // 一時的なエラー（503, 504）の場合はリトライ
        if (attempt < maxRetries && (response.status === 503 || response.status === 504)) {
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} for ${url}`);
          await sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after error:`, error.message);
          await sleep(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  // Axios用エラーインターセプター
  function setupAxiosErrorHandler() {
    if (typeof axios !== 'undefined') {
      // レスポンスインターセプター
      axios.interceptors.response.use(
        response => response,
        error => {
          handleAPIError(error, 'Axios Request');
          return Promise.reject(error);
        }
      );

      // リクエストインターセプター（認証トークン自動追加）
      axios.interceptors.request.use(
        config => {
          const authData = localStorage.getItem('auth');
          if (authData) {
            const { token } = JSON.parse(authData);
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          }
          return config;
        },
        error => Promise.reject(error)
      );
    }
  }

  // グローバルエラーハンドラー
  function setupGlobalErrorHandlers() {
    // JavaScriptエラーのキャッチ
    window.addEventListener('error', (event) => {
      console.error('[Global Error]', event.error);
      showErrorMessage(
        'エラー',
        'ページでエラーが発生しました。ページを更新してください。',
        'error'
      );
    });

    // 未処理のPromise rejectionsのキャッチ
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Unhandled Promise Rejection]', event.reason);
      showErrorMessage(
        '処理エラー',
        '非同期処理でエラーが発生しました。',
        'error'
      );
    });
  }

  // sleep関数
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 初期化
  document.addEventListener('DOMContentLoaded', () => {
    setupAxiosErrorHandler();
    setupGlobalErrorHandlers();
    console.log('[Error Handler] Initialized');
  });

  // グローバルに公開
  window.errorHandler = {
    showErrorMessage,
    handleAPIError,
    fetchWithRetry
  };

})();
