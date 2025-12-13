/**
 * 適応的レート制限モジュール v3.153.68
 * - 動的閾値調整
 * - ユーザー別制限
 * - 段階的制限
 */

class AdaptiveRateLimiter {
  constructor() {
    // デフォルト設定
    this.config = {
      windowMs: 60000, // 1分間のウィンドウ
      maxRequests: 100, // デフォルト最大リクエスト数
      minRequests: 10, // 最小制限
      maxRequestsLimit: 200, // 最大制限
      adaptiveStep: 10, // 調整ステップ
      penaltyDuration: 300000, // ペナルティ期間: 5分
      warningThreshold: 0.8 // 警告閾値 (80%)
    };

    // ユーザー別のトラッキング
    this.userTracking = new Map();
    
    // グローバル統計
    this.globalStats = {
      totalRequests: 0,
      blockedRequests: 0,
      averageLatency: 0,
      errorRate: 0
    };

    // パフォーマンス監視
    this.performanceWindow = [];
    this.maxPerformanceRecords = 100;

    // 定期的な調整
    this.adjustmentInterval = 60000; // 1分ごとに調整
    this.startAutoAdjustment();
  }

  getUserKey() {
    // ユーザー識別子を取得（トークンから、またはセッションIDから）
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.email || 'anonymous';
      } catch (error) {
        console.error('トークン解析エラー:', error);
      }
    }
    
    // フォールバック: セッションID生成
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', sessionId);
    }
    
    return sessionId;
  }

  getUserData(userId) {
    if (!this.userTracking.has(userId)) {
      this.userTracking.set(userId, {
        requests: [],
        blocked: 0,
        totalRequests: 0,
        successRate: 1.0,
        averageLatency: 0,
        currentLimit: this.config.maxRequests,
        penaltyUntil: null,
        violationCount: 0
      });
    }
    return this.userTracking.get(userId);
  }

  async checkLimit(options = {}) {
    const userId = options.userId || this.getUserKey();
    const userData = this.getUserData(userId);
    const now = Date.now();

    // ペナルティ期間中かチェック
    if (userData.penaltyUntil && now < userData.penaltyUntil) {
      const remainingMs = userData.penaltyUntil - now;
      const remainingSec = Math.ceil(remainingMs / 1000);
      
      console.warn(`⛔ レート制限中: あと${remainingSec}秒お待ちください`);
      
      this.globalStats.blockedRequests++;
      
      throw new Error(`レート制限中です。${remainingSec}秒後に再試行してください。`);
    }

    // ウィンドウ外の古いリクエストを削除
    const windowStart = now - this.config.windowMs;
    userData.requests = userData.requests.filter(req => req.timestamp > windowStart);

    // 現在のリクエスト数をチェック
    if (userData.requests.length >= userData.currentLimit) {
      console.warn(`⚠️ レート制限到達: ${userData.requests.length}/${userData.currentLimit}`);
      
      // 違反カウント増加
      userData.violationCount++;
      userData.blocked++;
      this.globalStats.blockedRequests++;

      // 段階的ペナルティ
      this.applyPenalty(userData);

      const remainingSec = Math.ceil(this.config.windowMs / 1000);
      throw new Error(`レート制限を超えました。${remainingSec}秒後に再試行してください。`);
    }

    // 警告チェック
    const usageRatio = userData.requests.length / userData.currentLimit;
    if (usageRatio >= this.config.warningThreshold) {
      console.warn(`⚠️ レート制限に近づいています: ${userData.requests.length}/${userData.currentLimit} (${(usageRatio * 100).toFixed(1)}%)`);
      
      if (window.showToast) {
        window.showToast(
          `リクエスト制限に近づいています (${userData.requests.length}/${userData.currentLimit})`,
          'warning'
        );
      }
    }

    // リクエストを記録
    const request = {
      timestamp: now,
      userId
    };
    userData.requests.push(request);
    userData.totalRequests++;
    this.globalStats.totalRequests++;

    return {
      allowed: true,
      remaining: userData.currentLimit - userData.requests.length,
      limit: userData.currentLimit,
      resetAt: windowStart + this.config.windowMs
    };
  }

  applyPenalty(userData) {
    const now = Date.now();
    
    // 違反回数に応じてペナルティ期間を増加
    const penaltyMultiplier = Math.min(userData.violationCount, 5);
    const penaltyDuration = this.config.penaltyDuration * penaltyMultiplier;
    
    userData.penaltyUntil = now + penaltyDuration;
    
    console.warn(`⛔ ペナルティ適用: ${penaltyDuration / 1000}秒 (違反回数: ${userData.violationCount})`);
    
    if (window.showToast) {
      window.showToast(
        `一時的にアクセスが制限されました。${Math.ceil(penaltyDuration / 1000)}秒後に再試行してください。`,
        'error'
      );
    }
  }

  recordPerformance(latency, isError = false) {
    const record = {
      timestamp: Date.now(),
      latency,
      isError
    };

    this.performanceWindow.push(record);

    // 古いレコードを削除
    if (this.performanceWindow.length > this.maxPerformanceRecords) {
      this.performanceWindow.shift();
    }

    // グローバル統計を更新
    const validRecords = this.performanceWindow.filter(r => !r.isError);
    if (validRecords.length > 0) {
      this.globalStats.averageLatency = 
        validRecords.reduce((sum, r) => sum + r.latency, 0) / validRecords.length;
    }

    const errorRecords = this.performanceWindow.filter(r => r.isError);
    this.globalStats.errorRate = errorRecords.length / this.performanceWindow.length;
  }

  adjustLimits() {
    console.log('🔧 レート制限を動的調整中...');

    // パフォーマンス指標に基づいて調整
    const avgLatency = this.globalStats.averageLatency;
    const errorRate = this.globalStats.errorRate;

    let adjustment = 0;

    // レイテンシが低く、エラー率も低い場合は制限を緩和
    if (avgLatency < 200 && errorRate < 0.05) {
      adjustment = this.config.adaptiveStep;
      console.log('✅ パフォーマンス良好 - 制限を緩和');
    }
    // レイテンシが高い、またはエラー率が高い場合は制限を厳格化
    else if (avgLatency > 1000 || errorRate > 0.15) {
      adjustment = -this.config.adaptiveStep;
      console.log('⚠️ パフォーマンス低下 - 制限を厳格化');
    }

    // 全ユーザーの制限を調整
    for (const [userId, userData] of this.userTracking.entries()) {
      const newLimit = Math.max(
        this.config.minRequests,
        Math.min(
          this.config.maxRequestsLimit,
          userData.currentLimit + adjustment
        )
      );

      if (newLimit !== userData.currentLimit) {
        console.log(`👤 ${userId}: ${userData.currentLimit} → ${newLimit}`);
        userData.currentLimit = newLimit;
      }
    }

    this.logStats();
  }

  startAutoAdjustment() {
    setInterval(() => {
      this.adjustLimits();
      this.cleanupOldData();
    }, this.adjustmentInterval);

    console.log('🔄 自動調整を開始しました');
  }

  cleanupOldData() {
    const now = Date.now();
    const maxAge = this.config.windowMs * 10; // 10分以上前のデータ

    for (const [userId, userData] of this.userTracking.entries()) {
      // 古いリクエストをクリア
      userData.requests = userData.requests.filter(
        req => now - req.timestamp < maxAge
      );

      // ペナルティが解除されたユーザーの違反カウントをリセット
      if (userData.penaltyUntil && now > userData.penaltyUntil) {
        userData.penaltyUntil = null;
        if (userData.violationCount > 0) {
          userData.violationCount = Math.max(0, userData.violationCount - 1);
        }
      }

      // 長期間使用されていないユーザーデータを削除
      if (userData.requests.length === 0 && 
          (!userData.penaltyUntil || now > userData.penaltyUntil)) {
        this.userTracking.delete(userId);
      }
    }
  }

  logStats() {
    console.group('📊 レート制限統計');
    console.log(`総リクエスト数: ${this.globalStats.totalRequests}`);
    console.log(`ブロック数: ${this.globalStats.blockedRequests}`);
    console.log(`平均レイテンシ: ${this.globalStats.averageLatency.toFixed(2)}ms`);
    console.log(`エラー率: ${(this.globalStats.errorRate * 100).toFixed(2)}%`);
    console.log(`追跡ユーザー数: ${this.userTracking.size}`);
    console.groupEnd();
  }

  getStatus() {
    const userId = this.getUserKey();
    const userData = this.getUserData(userId);
    const now = Date.now();

    return {
      userId,
      currentLimit: userData.currentLimit,
      requestCount: userData.requests.length,
      remaining: userData.currentLimit - userData.requests.length,
      totalRequests: userData.totalRequests,
      blocked: userData.blocked,
      violationCount: userData.violationCount,
      penaltyActive: userData.penaltyUntil && now < userData.penaltyUntil,
      penaltyRemaining: userData.penaltyUntil ? Math.max(0, userData.penaltyUntil - now) : 0,
      globalStats: { ...this.globalStats },
      trackedUsers: this.userTracking.size
    };
  }

  reset() {
    this.userTracking.clear();
    this.performanceWindow = [];
    this.globalStats = {
      totalRequests: 0,
      blockedRequests: 0,
      averageLatency: 0,
      errorRate: 0
    };
    console.log('🔄 レート制限データをリセットしました');
  }
}

// グローバルインスタンス作成
window.adaptiveRateLimiter = new AdaptiveRateLimiter();

// Axiosインターセプターに統合
if (window.axios) {
  axios.interceptors.request.use(
    async (config) => {
      // レート制限チェック
      try {
        const startTime = Date.now();
        await window.adaptiveRateLimiter.checkLimit();
        config.rateLimitCheckTime = Date.now() - startTime;
        return config;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => {
      // パフォーマンス記録
      const latency = response.config.rateLimitCheckTime || 0;
      window.adaptiveRateLimiter.recordPerformance(latency, false);
      return response;
    },
    (error) => {
      // エラー記録
      const latency = error.config?.rateLimitCheckTime || 0;
      window.adaptiveRateLimiter.recordPerformance(latency, true);
      return Promise.reject(error);
    }
  );
}

console.log('✅ 適応的レート制限モジュール初期化完了');
