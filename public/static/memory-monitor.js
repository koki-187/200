/**
 * メモリリーク検出モジュール v3.153.68
 * - パフォーマンス監視
 * - メモリ使用量追跡
 * - リーク警告
 */

class MemoryMonitor {
  constructor() {
    this.measurements = [];
    this.maxMeasurements = 100; // 保持する測定データ数
    this.warningThreshold = 0.8; // メモリ使用率警告閾値 (80%)
    this.criticalThreshold = 0.9; // メモリ使用率危険閾値 (90%)
    this.monitoringInterval = 30000; // 監視間隔: 30秒
    this.isMonitoring = false;
    this.intervalId = null;
    this.leakDetected = false;
    
    // Performance APIのサポート確認
    this.supportsMemory = 'memory' in performance;
    
    if (!this.supportsMemory) {
      console.warn('⚠️ Performance Memory API not supported in this browser');
    }
  }

  start() {
    if (this.isMonitoring) {
      console.log('メモリ監視は既に実行中です');
      return;
    }

    console.log('🔍 メモリ監視を開始します');
    this.isMonitoring = true;
    
    // 初回測定
    this.measure();
    
    // 定期的に測定
    this.intervalId = setInterval(() => {
      this.measure();
      this.analyze();
    }, this.monitoringInterval);
  }

  stop() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('⏹️ メモリ監視を停止します');
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  measure() {
    const measurement = {
      timestamp: Date.now(),
      memory: null,
      domNodes: document.getElementsByTagName('*').length,
      eventListeners: this.estimateEventListeners()
    };

    // Performance Memory APIが利用可能な場合
    if (this.supportsMemory && performance.memory) {
      measurement.memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usageRatio: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
      };
    }

    this.measurements.push(measurement);

    // 古い測定データを削除
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }

    return measurement;
  }

  estimateEventListeners() {
    // イベントリスナー数の推定（正確な値は取得できないため概算）
    let count = 0;
    
    // グローバルイベントリスナー
    if (window._addEventListener) {
      count += window._addEventListener.length || 0;
    }
    
    // DOM要素の概算
    const elements = document.getElementsByTagName('*');
    for (let i = 0; i < Math.min(elements.length, 100); i++) {
      const element = elements[i];
      // onclick等の属性があるか確認
      if (element.onclick || element.onchange || element.onsubmit) {
        count++;
      }
    }
    
    return count;
  }

  analyze() {
    if (this.measurements.length < 3) {
      return; // 十分なデータがない
    }

    const latest = this.measurements[this.measurements.length - 1];
    const previous = this.measurements[this.measurements.length - 2];
    
    // メモリ使用率チェック
    if (latest.memory) {
      const usageRatio = latest.memory.usageRatio;
      
      if (usageRatio >= this.criticalThreshold) {
        this.showAlert('critical', `メモリ使用率が危険レベルです: ${(usageRatio * 100).toFixed(1)}%`);
      } else if (usageRatio >= this.warningThreshold) {
        this.showAlert('warning', `メモリ使用率が高くなっています: ${(usageRatio * 100).toFixed(1)}%`);
      }

      // メモリリーク検出: 継続的なメモリ増加
      const memoryGrowth = this.detectMemoryGrowth();
      if (memoryGrowth.isLeaking) {
        this.handleMemoryLeak(memoryGrowth);
      }
    }

    // DOM要素数の急激な増加をチェック
    const domGrowth = latest.domNodes - previous.domNodes;
    if (domGrowth > 100) {
      console.warn(`⚠️ DOM要素が急激に増加しました: +${domGrowth}個`);
    }

    // 定期的にサマリーを出力
    if (this.measurements.length % 10 === 0) {
      this.logSummary();
    }
  }

  detectMemoryGrowth() {
    if (this.measurements.length < 5 || !this.measurements[0].memory) {
      return { isLeaking: false };
    }

    // 最近5回の測定でメモリが継続的に増加しているかチェック
    const recentMeasurements = this.measurements.slice(-5);
    let consecutiveIncreases = 0;
    let totalGrowth = 0;

    for (let i = 1; i < recentMeasurements.length; i++) {
      const prev = recentMeasurements[i - 1].memory.usedJSHeapSize;
      const curr = recentMeasurements[i].memory.usedJSHeapSize;
      const growth = curr - prev;

      if (growth > 1000000) { // 1MB以上の増加
        consecutiveIncreases++;
        totalGrowth += growth;
      } else {
        consecutiveIncreases = 0;
      }
    }

    // 4回連続で1MB以上増加している場合はリークの可能性
    const isLeaking = consecutiveIncreases >= 4;
    
    return {
      isLeaking,
      consecutiveIncreases,
      totalGrowth,
      averageGrowth: totalGrowth / Math.max(1, consecutiveIncreases)
    };
  }

  handleMemoryLeak(growthInfo) {
    if (this.leakDetected) {
      return; // 既に検出済み
    }

    this.leakDetected = true;
    
    const growthMB = (growthInfo.totalGrowth / 1024 / 1024).toFixed(2);
    const message = `メモリリークの可能性を検出しました。${growthMB}MBのメモリが増加しています。`;
    
    console.error('🚨 ' + message);
    this.showAlert('critical', message);

    // 自動修復を試みる
    this.attemptAutoRepair();
  }

  attemptAutoRepair() {
    console.log('🔧 メモリリークの自動修復を試みます...');

    // 1. 不要なキャッシュをクリア
    try {
      if (window.caches) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('temp') || name.includes('cache')) {
              caches.delete(name);
            }
          });
        });
      }
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
    }

    // 2. 不要なイベントリスナーを削除（カスタムロジック必要）
    // アプリケーション固有の実装が必要

    // 3. ガベージコレクションを促す
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
        console.log('✅ ガベージコレクション実行');
      } catch (error) {
        console.error('ガベージコレクションエラー:', error);
      }
    }

    // 4. ページリロードを提案
    setTimeout(() => {
      if (confirm('メモリ使用量を最適化するため、ページを再読み込みしますか？')) {
        window.location.reload();
      }
    }, 5000);
  }

  showAlert(level, message) {
    console[level === 'critical' ? 'error' : 'warn'](`[Memory Monitor] ${message}`);

    // Toastシステムがあれば使用
    if (window.showToast) {
      window.showToast(message, level === 'critical' ? 'error' : 'warning');
      return;
    }

    // フォールバック: シンプルな通知表示
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
      level === 'critical' ? 'bg-red-600' : 'bg-yellow-500'
    } text-white`;
    alert.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-${level === 'critical' ? 'exclamation-triangle' : 'exclamation-circle'} mr-2"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transition = 'opacity 0.5s';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  }

  logSummary() {
    const latest = this.measurements[this.measurements.length - 1];
    
    console.group('📊 メモリ監視サマリー');
    console.log(`測定回数: ${this.measurements.length}`);
    console.log(`DOM要素数: ${latest.domNodes}`);
    console.log(`イベントリスナー推定数: ${latest.eventListeners}`);
    
    if (latest.memory) {
      console.log(`メモリ使用量: ${(latest.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`メモリ使用率: ${(latest.memory.usageRatio * 100).toFixed(1)}%`);
      console.log(`メモリ制限: ${(latest.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
    }
    
    console.groupEnd();
  }

  getStatus() {
    const latest = this.measurements[this.measurements.length - 1];
    
    if (!latest) {
      return { status: 'no_data' };
    }

    const status = {
      isMonitoring: this.isMonitoring,
      timestamp: latest.timestamp,
      domNodes: latest.domNodes,
      eventListeners: latest.eventListeners,
      memory: latest.memory ? {
        usedMB: (latest.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
        totalMB: (latest.memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
        limitMB: (latest.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
        usagePercent: (latest.memory.usageRatio * 100).toFixed(1)
      } : null,
      measurementCount: this.measurements.length,
      leakDetected: this.leakDetected
    };

    return status;
  }

  reset() {
    this.measurements = [];
    this.leakDetected = false;
    console.log('🔄 メモリ監視データをリセットしました');
  }
}

// グローバルインスタンス作成
window.memoryMonitor = new MemoryMonitor();

// 自動起動
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.memoryMonitor.start();
  });
} else {
  window.memoryMonitor.start();
}

console.log('✅ メモリ監視モジュール初期化完了');
