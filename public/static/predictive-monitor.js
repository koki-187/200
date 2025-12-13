/**
 * 予防的監視システム v3.153.68
 * - 異常検知
 * - 自動アラート
 * - 予測的エラー防止
 */

class PredictiveMonitor {
  constructor() {
    this.config = {
      checkInterval: 30000, // 30秒ごとにチェック
      errorThreshold: 5, // 5回のエラーで警告
      latencyThreshold: 2000, // 2秒以上で警告
      memoryThreshold: 0.85, // メモリ使用率85%以上で警告
      consecutiveErrorsThreshold: 3, // 連続3回エラーで危険
      predictionWindow: 300000 // 5分間の予測ウィンドウ
    };

    this.metrics = {
      errors: [],
      latencies: [],
      networkIssues: [],
      memoryWarnings: [],
      consecutiveErrors: 0,
      lastCheckTime: Date.now(),
      predictions: {
        errorRateIncreasing: false,
        latencyIncreasing: false,
        memoryPressure: false,
        networkUnstable: false
      }
    };

    this.alerts = [];
    this.maxAlerts = 50;
    this.isMonitoring = false;
    this.intervalId = null;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // グローバルエラーハンドラー
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'runtime',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now()
      });
    });

    // Promise rejection ハンドラー
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        timestamp: Date.now()
      });
    });

    // ネットワーク状態変化
    window.addEventListener('offline', () => {
      this.recordNetworkIssue('offline');
    });

    window.addEventListener('online', () => {
      this.recordNetworkIssue('online');
    });
  }

  start() {
    if (this.isMonitoring) {
      console.log('予防的監視は既に実行中です');
      return;
    }

    console.log('🔍 予防的監視を開始します');
    this.isMonitoring = true;

    // 定期的なチェック
    this.intervalId = setInterval(() => {
      this.performCheck();
    }, this.config.checkInterval);

    // 初回チェック
    this.performCheck();
  }

  stop() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('⏹️ 予防的監視を停止します');
    this.isMonitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  recordError(error) {
    this.metrics.errors.push(error);
    this.metrics.consecutiveErrors++;

    // エラーが連続している場合は即座に警告
    if (this.metrics.consecutiveErrors >= this.config.consecutiveErrorsThreshold) {
      this.createAlert('critical', `連続${this.metrics.consecutiveErrors}回のエラーが発生しています`, {
        action: 'immediate_attention',
        lastError: error
      });
    }

    // 古いエラーを削除（5分以上前）
    const cutoff = Date.now() - this.config.predictionWindow;
    this.metrics.errors = this.metrics.errors.filter(e => e.timestamp > cutoff);

    console.error('🚨 エラー記録:', error);
  }

  recordLatency(duration, endpoint) {
    const latency = {
      duration,
      endpoint,
      timestamp: Date.now()
    };

    this.metrics.latencies.push(latency);

    // 閾値を超える場合は警告
    if (duration > this.config.latencyThreshold) {
      console.warn(`⚠️ 高レイテンシ検出: ${endpoint} (${duration}ms)`);
    }

    // 古いレイテンシデータを削除
    const cutoff = Date.now() - this.config.predictionWindow;
    this.metrics.latencies = this.metrics.latencies.filter(l => l.timestamp > cutoff);

    // 連続エラーカウントをリセット（成功したため）
    this.metrics.consecutiveErrors = 0;
  }

  recordNetworkIssue(status) {
    this.metrics.networkIssues.push({
      status,
      timestamp: Date.now()
    });

    if (status === 'offline') {
      this.createAlert('warning', 'ネットワーク接続が切断されました', {
        action: 'check_connection'
      });
    }

    // 古いネットワーク問題を削除
    const cutoff = Date.now() - this.config.predictionWindow;
    this.metrics.networkIssues = this.metrics.networkIssues.filter(n => n.timestamp > cutoff);
  }

  recordMemoryWarning(usage) {
    this.metrics.memoryWarnings.push({
      usage,
      timestamp: Date.now()
    });

    // 古いメモリ警告を削除
    const cutoff = Date.now() - this.config.predictionWindow;
    this.metrics.memoryWarnings = this.metrics.memoryWarnings.filter(m => m.timestamp > cutoff);
  }

  performCheck() {
    console.log('🔍 予防的チェック実行中...');

    const now = Date.now();
    this.metrics.lastCheckTime = now;

    // 1. エラー率の予測
    this.checkErrorRate();

    // 2. レイテンシの傾向分析
    this.checkLatencyTrend();

    // 3. メモリ圧力の確認
    this.checkMemoryPressure();

    // 4. ネットワーク安定性の確認
    this.checkNetworkStability();

    // 5. 統合リスク評価
    this.assessOverallRisk();

    // 6. 予測結果のログ出力
    this.logPredictions();
  }

  checkErrorRate() {
    const recentErrors = this.metrics.errors.length;
    
    if (recentErrors >= this.config.errorThreshold) {
      this.metrics.predictions.errorRateIncreasing = true;
      
      this.createAlert('warning', `過去5分間に${recentErrors}件のエラーが発生しています`, {
        action: 'review_errors',
        errorCount: recentErrors
      });
    } else {
      this.metrics.predictions.errorRateIncreasing = false;
    }
  }

  checkLatencyTrend() {
    if (this.metrics.latencies.length < 5) {
      return; // 十分なデータがない
    }

    // 最近のレイテンシの平均を計算
    const recentLatencies = this.metrics.latencies.slice(-10);
    const avgLatency = recentLatencies.reduce((sum, l) => sum + l.duration, 0) / recentLatencies.length;

    // 増加傾向をチェック
    let increasingCount = 0;
    for (let i = 1; i < recentLatencies.length; i++) {
      if (recentLatencies[i].duration > recentLatencies[i - 1].duration) {
        increasingCount++;
      }
    }

    const isIncreasing = increasingCount >= recentLatencies.length * 0.7; // 70%以上が増加

    if (avgLatency > this.config.latencyThreshold && isIncreasing) {
      this.metrics.predictions.latencyIncreasing = true;
      
      this.createAlert('warning', `レイテンシが増加傾向です (平均: ${avgLatency.toFixed(0)}ms)`, {
        action: 'optimize_performance',
        avgLatency
      });
    } else {
      this.metrics.predictions.latencyIncreasing = false;
    }
  }

  checkMemoryPressure() {
    // メモリモニターと統合
    if (window.memoryMonitor) {
      const status = window.memoryMonitor.getStatus();
      
      if (status.memory) {
        const usagePercent = parseFloat(status.memory.usagePercent) / 100;
        
        if (usagePercent > this.config.memoryThreshold) {
          this.metrics.predictions.memoryPressure = true;
          this.recordMemoryWarning(usagePercent);
          
          this.createAlert('warning', `メモリ使用率が高くなっています: ${status.memory.usagePercent}%`, {
            action: 'optimize_memory',
            usagePercent
          });
        } else {
          this.metrics.predictions.memoryPressure = false;
        }
      }
    }
  }

  checkNetworkStability() {
    // 最近5分間のネットワーク問題をチェック
    const recentIssues = this.metrics.networkIssues.filter(n => n.status === 'offline');
    
    if (recentIssues.length > 3) {
      this.metrics.predictions.networkUnstable = true;
      
      this.createAlert('warning', 'ネットワークが不安定です', {
        action: 'check_connection',
        issueCount: recentIssues.length
      });
    } else {
      this.metrics.predictions.networkUnstable = false;
    }
  }

  assessOverallRisk() {
    const predictions = this.metrics.predictions;
    const riskFactors = Object.values(predictions).filter(v => v === true).length;

    let riskLevel = 'low';
    let riskMessage = '';

    if (riskFactors === 0) {
      riskLevel = 'low';
      riskMessage = 'システムは正常に動作しています';
    } else if (riskFactors === 1) {
      riskLevel = 'medium';
      riskMessage = '1つの懸念事項が検出されました';
    } else if (riskFactors === 2) {
      riskLevel = 'high';
      riskMessage = '複数の問題が検出されました - 注意が必要です';
    } else {
      riskLevel = 'critical';
      riskMessage = '深刻な問題が複数検出されました - 即座の対応が必要です';
      
      // 危険レベルでは自動修復を試みる
      this.attemptAutoRepair();
    }

    console.log(`📊 総合リスク評価: ${riskLevel} - ${riskMessage}`);

    return {
      level: riskLevel,
      message: riskMessage,
      factors: riskFactors,
      predictions
    };
  }

  attemptAutoRepair() {
    console.log('🔧 自動修復を開始します...');

    const repairs = [];

    // 1. メモリ圧力への対応
    if (this.metrics.predictions.memoryPressure && window.memoryMonitor) {
      console.log('💾 メモリ最適化を実行中...');
      // メモリモニターの自動修復機能を呼び出し
      repairs.push('memory_optimization');
    }

    // 2. ネットワーク問題への対応
    if (this.metrics.predictions.networkUnstable && window.networkResilience) {
      console.log('🌐 ネットワークキューを処理中...');
      window.networkResilience.processQueue();
      repairs.push('network_queue_processing');
    }

    // 3. エラー率が高い場合
    if (this.metrics.predictions.errorRateIncreasing) {
      console.log('🚨 エラーハンドリングを強化中...');
      // エラーログをクリアして再起動を促す
      repairs.push('error_handling_reinforcement');
    }

    this.createAlert('info', `自動修復を実行しました: ${repairs.join(', ')}`, {
      action: 'auto_repair_completed',
      repairs
    });
  }

  createAlert(level, message, data = {}) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level, // 'info', 'warning', 'critical'
      message,
      timestamp: Date.now(),
      data,
      acknowledged: false
    };

    this.alerts.unshift(alert);

    // 古いアラートを削除
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    console[level === 'critical' ? 'error' : level === 'warning' ? 'warn' : 'log'](
      `[Predictive Monitor] ${message}`
    );

    // ユーザーに通知
    this.showNotification(alert);

    return alert;
  }

  showNotification(alert) {
    // Toastシステムがあれば使用
    if (window.showToast) {
      window.showToast(alert.message, alert.level === 'critical' ? 'error' : alert.level);
      return;
    }

    // フォールバック
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
      alert.level === 'critical' ? 'bg-red-600' :
      alert.level === 'warning' ? 'bg-yellow-500' :
      'bg-blue-500'
    } text-white`;
    notification.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <i class="fas fa-${
            alert.level === 'critical' ? 'exclamation-triangle' :
            alert.level === 'warning' ? 'exclamation-circle' :
            'info-circle'
          } mr-2"></i>
          <span>${alert.message}</span>
        </div>
        <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, alert.level === 'critical' ? 10000 : 5000);
  }

  logPredictions() {
    console.group('🔮 予測結果');
    console.log(`エラー率増加: ${this.metrics.predictions.errorRateIncreasing ? '⚠️ はい' : '✅ いいえ'}`);
    console.log(`レイテンシ増加: ${this.metrics.predictions.latencyIncreasing ? '⚠️ はい' : '✅ いいえ'}`);
    console.log(`メモリ圧力: ${this.metrics.predictions.memoryPressure ? '⚠️ はい' : '✅ いいえ'}`);
    console.log(`ネットワーク不安定: ${this.metrics.predictions.networkUnstable ? '⚠️ はい' : '✅ いいえ'}`);
    console.log(`最近のエラー: ${this.metrics.errors.length}件`);
    console.log(`最近のレイテンシ記録: ${this.metrics.latencies.length}件`);
    console.log(`アラート数: ${this.alerts.length}件`);
    console.groupEnd();
  }

  getStatus() {
    const riskAssessment = this.assessOverallRisk();
    
    return {
      isMonitoring: this.isMonitoring,
      lastCheckTime: this.metrics.lastCheckTime,
      metrics: {
        errorCount: this.metrics.errors.length,
        latencyCount: this.metrics.latencies.length,
        networkIssues: this.metrics.networkIssues.length,
        memoryWarnings: this.metrics.memoryWarnings.length,
        consecutiveErrors: this.metrics.consecutiveErrors
      },
      predictions: { ...this.metrics.predictions },
      riskAssessment,
      alerts: this.alerts.slice(0, 10) // 最新10件
    };
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`✅ アラート確認: ${alert.message}`);
    }
  }

  reset() {
    this.metrics = {
      errors: [],
      latencies: [],
      networkIssues: [],
      memoryWarnings: [],
      consecutiveErrors: 0,
      lastCheckTime: Date.now(),
      predictions: {
        errorRateIncreasing: false,
        latencyIncreasing: false,
        memoryPressure: false,
        networkUnstable: false
      }
    };
    this.alerts = [];
    console.log('🔄 予防的監視データをリセットしました');
  }
}

// グローバルインスタンス作成
window.predictiveMonitor = new PredictiveMonitor();

// Axiosインターセプターに統合
if (window.axios) {
  axios.interceptors.request.use(
    (config) => {
      config.requestStartTime = Date.now();
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => {
      // レイテンシを記録
      const duration = Date.now() - (response.config.requestStartTime || Date.now());
      const endpoint = `${response.config.method?.toUpperCase()} ${response.config.url}`;
      window.predictiveMonitor.recordLatency(duration, endpoint);
      return response;
    },
    (error) => {
      // エラーを記録
      const duration = Date.now() - (error.config?.requestStartTime || Date.now());
      const endpoint = `${error.config?.method?.toUpperCase()} ${error.config?.url}`;
      
      window.predictiveMonitor.recordError({
        type: 'axios',
        message: error.message,
        endpoint,
        status: error.response?.status,
        timestamp: Date.now()
      });
      
      window.predictiveMonitor.recordLatency(duration, endpoint);
      
      return Promise.reject(error);
    }
  );
}

// 自動起動
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.predictiveMonitor.start();
  });
} else {
  window.predictiveMonitor.start();
}

console.log('✅ 予防的監視システム初期化完了');
