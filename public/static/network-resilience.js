/**
 * ネットワーク分断対策モジュール v3.153.68
 * - オフライン検出
 * - IndexedDBリクエストキュー
 * - 自動リトライ
 * - ユーザー通知
 */

// IndexedDBの初期化
class RequestQueue {
  constructor() {
    this.dbName = 'RequestQueueDB';
    this.storeName = 'pendingRequests';
    this.db = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
        }
      };
    });
  }

  async add(request) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const queueItem = {
        url: request.url,
        method: request.method,
        data: request.data,
        headers: request.headers,
        timestamp: Date.now(),
        priority: request.priority || 1,
        retryCount: 0
      };
      
      const addRequest = store.add(queueItem);
      addRequest.onsuccess = () => resolve(addRequest.result);
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  async getAll() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async remove(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateRetryCount(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retryCount = (item.retryCount || 0) + 1;
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve(item.retryCount);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

// ネットワーク監視とリトライ管理
class NetworkResilience {
  constructor() {
    this.queue = new RequestQueue();
    this.isOnline = navigator.onLine;
    this.retryDelay = 1000; // 初期リトライ遅延: 1秒
    this.maxRetryDelay = 30000; // 最大リトライ遅延: 30秒
    this.maxRetries = 5; // 最大リトライ回数
    this.processingQueue = false;
    
    this.initEventListeners();
  }

  initEventListeners() {
    // オンライン/オフライン検出
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // ページロード時にキューを処理
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.processQueue());
    } else {
      this.processQueue();
    }
  }

  handleOnline() {
    console.log('✅ ネットワーク接続が復旧しました');
    this.isOnline = true;
    this.showNotification('ネットワーク接続が復旧しました', 'success');
    this.processQueue();
  }

  handleOffline() {
    console.log('⚠️ ネットワーク接続が切断されました');
    this.isOnline = false;
    this.showNotification('オフラインモードです。データは接続復旧後に同期されます。', 'warning');
  }

  showNotification(message, type = 'info') {
    // Toastシステムがあれば使用
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }

    // フォールバック: シンプルな通知表示
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
      type === 'success' ? 'bg-green-500' :
      type === 'warning' ? 'bg-yellow-500' :
      type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } text-white`;
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-${
          type === 'success' ? 'check-circle' :
          type === 'warning' ? 'exclamation-triangle' :
          type === 'error' ? 'times-circle' : 'info-circle'
        } mr-2"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  async queueRequest(axiosConfig) {
    try {
      const id = await this.queue.add({
        url: axiosConfig.url,
        method: axiosConfig.method || 'GET',
        data: axiosConfig.data,
        headers: axiosConfig.headers,
        priority: axiosConfig.priority || 1
      });
      
      console.log(`📦 リクエストをキューに追加: ${axiosConfig.method} ${axiosConfig.url} (ID: ${id})`);
      return id;
    } catch (error) {
      console.error('キューへの追加に失敗:', error);
      throw error;
    }
  }

  async processQueue() {
    if (this.processingQueue || !this.isOnline) {
      return;
    }

    this.processingQueue = true;
    
    try {
      const requests = await this.queue.getAll();
      
      if (requests.length === 0) {
        this.processingQueue = false;
        return;
      }

      console.log(`🔄 キュー処理開始: ${requests.length}件のリクエスト`);
      this.showNotification(`${requests.length}件の保留中リクエストを処理しています...`, 'info');

      // 優先度順にソート (priority降順、timestamp昇順)
      requests.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

      let successCount = 0;
      let failCount = 0;

      for (const request of requests) {
        try {
          // 最大リトライ回数を超えている場合はスキップ
          if (request.retryCount >= this.maxRetries) {
            console.warn(`⚠️ 最大リトライ回数を超えました: ${request.url}`);
            await this.queue.remove(request.id);
            failCount++;
            continue;
          }

          // リトライ実行
          await this.retryRequest(request);
          
          // 成功したらキューから削除
          await this.queue.remove(request.id);
          successCount++;
          
        } catch (error) {
          console.error(`❌ リトライ失敗: ${request.url}`, error);
          
          // リトライカウントを更新
          try {
            await this.queue.updateRetryCount(request.id);
          } catch (updateError) {
            console.error('リトライカウント更新失敗:', updateError);
          }
          
          failCount++;
        }

        // 各リクエスト間に少し遅延を入れる
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ キュー処理完了: 成功 ${successCount}件、失敗 ${failCount}件`);
      
      if (successCount > 0) {
        this.showNotification(`${successCount}件のリクエストを正常に処理しました`, 'success');
      }
      
      if (failCount > 0) {
        this.showNotification(`${failCount}件のリクエストが失敗しました。再試行します。`, 'warning');
      }
      
    } catch (error) {
      console.error('キュー処理エラー:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  async retryRequest(request) {
    const axiosConfig = {
      url: request.url,
      method: request.method,
      data: request.data,
      headers: request.headers,
      timeout: 10000 // 10秒タイムアウト
    };

    // エクスポネンシャルバックオフ
    const delay = Math.min(
      this.retryDelay * Math.pow(2, request.retryCount),
      this.maxRetryDelay
    );

    console.log(`🔄 リトライ実行 (${request.retryCount + 1}/${this.maxRetries}): ${request.method} ${request.url} (遅延: ${delay}ms)`);
    
    await new Promise(resolve => setTimeout(resolve, delay));

    return axios(axiosConfig);
  }

  async wrapAxiosRequest(axiosConfig) {
    // オンラインの場合は通常のリクエスト実行
    if (this.isOnline) {
      try {
        return await axios(axiosConfig);
      } catch (error) {
        // ネットワークエラーの場合はキューに追加
        if (this.isNetworkError(error)) {
          console.warn('⚠️ ネットワークエラー検出、キューに追加します');
          await this.queueRequest(axiosConfig);
          throw error;
        }
        throw error;
      }
    }

    // オフラインの場合は即座にキューに追加
    console.log('📦 オフライン: リクエストをキューに追加');
    await this.queueRequest(axiosConfig);
    
    const error = new Error('オフラインです。リクエストは接続復旧後に自動的に送信されます。');
    error.isOffline = true;
    throw error;
  }

  isNetworkError(error) {
    // ネットワーク関連エラーの判定
    return (
      !error.response || // レスポンスがない = ネットワークエラー
      error.code === 'ECONNABORTED' || // タイムアウト
      error.message === 'Network Error' ||
      error.message.includes('timeout')
    );
  }

  async clearQueue() {
    await this.queue.clear();
    console.log('🗑️ リクエストキューをクリアしました');
  }

  async getQueueStatus() {
    const requests = await this.queue.getAll();
    return {
      count: requests.length,
      requests: requests.map(r => ({
        id: r.id,
        url: r.url,
        method: r.method,
        timestamp: r.timestamp,
        retryCount: r.retryCount
      }))
    };
  }
}

// グローバルインスタンス作成
window.networkResilience = new NetworkResilience();

// ヘルパー関数: axiosリクエストをラップ
window.resilientAxios = async function(config) {
  return window.networkResilience.wrapAxiosRequest(config);
};

console.log('✅ ネットワーク分断対策モジュール初期化完了');
