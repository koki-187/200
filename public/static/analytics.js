/**
 * Google Analytics 統合
 * GA4 (Google Analytics 4) 対応
 */

class AnalyticsManager {
  constructor() {
    this.measurementId = null;
    this.initialized = false;
  }

  /**
   * Google Analytics初期化
   * @param {string} measurementId - GA4測定ID (例: G-XXXXXXXXXX)
   */
  init(measurementId) {
    if (this.initialized) {
      console.warn('Analytics already initialized');
      return;
    }

    if (!measurementId || !measurementId.startsWith('G-')) {
      console.error('Invalid GA4 measurement ID');
      return;
    }

    this.measurementId = measurementId;

    // gtag.jsスクリプトを動的に読み込み
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);

    // gtag関数を初期化
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      page_path: window.location.pathname,
      send_page_view: true
    });

    this.initialized = true;
    console.log('Google Analytics initialized:', measurementId);
  }

  /**
   * ページビューを記録
   * @param {string} pagePath - ページパス
   * @param {string} pageTitle - ページタイトル
   */
  trackPageView(pagePath, pageTitle) {
    if (!this.initialized) {
      console.warn('Analytics not initialized');
      return;
    }

    window.gtag('event', 'page_view', {
      page_path: pagePath || window.location.pathname,
      page_title: pageTitle || document.title
    });
  }

  /**
   * イベントを記録
   * @param {string} eventName - イベント名
   * @param {object} params - イベントパラメータ
   */
  trackEvent(eventName, params = {}) {
    if (!this.initialized) {
      console.warn('Analytics not initialized');
      return;
    }

    window.gtag('event', eventName, params);
  }

  /**
   * ユーザープロパティを設定
   * @param {object} properties - ユーザープロパティ
   */
  setUserProperties(properties) {
    if (!this.initialized) {
      console.warn('Analytics not initialized');
      return;
    }

    window.gtag('set', 'user_properties', properties);
  }

  /**
   * カスタムディメンションを設定
   * @param {object} dimensions - カスタムディメンション
   */
  setCustomDimensions(dimensions) {
    if (!this.initialized) {
      console.warn('Analytics not initialized');
      return;
    }

    window.gtag('config', this.measurementId, dimensions);
  }

  // === ビジネスイベント ===

  /**
   * 案件作成イベント
   */
  trackDealCreated(dealId, dealValue) {
    this.trackEvent('deal_created', {
      deal_id: dealId,
      value: dealValue,
      currency: 'JPY'
    });
  }

  /**
   * 案件更新イベント
   */
  trackDealUpdated(dealId, status) {
    this.trackEvent('deal_updated', {
      deal_id: dealId,
      deal_status: status
    });
  }

  /**
   * メッセージ送信イベント
   */
  trackMessageSent(dealId, hasAttachment) {
    this.trackEvent('message_sent', {
      deal_id: dealId,
      has_attachment: hasAttachment
    });
  }

  /**
   * ファイルアップロードイベント
   */
  trackFileUploaded(fileType, fileSize) {
    this.trackEvent('file_uploaded', {
      file_type: fileType,
      file_size: fileSize
    });
  }

  /**
   * 検索イベント
   */
  trackSearch(searchTerm, resultCount) {
    this.trackEvent('search', {
      search_term: searchTerm,
      result_count: resultCount
    });
  }

  /**
   * ログインイベント
   */
  trackLogin(method = 'email') {
    this.trackEvent('login', {
      method: method
    });
  }

  /**
   * サインアップイベント
   */
  trackSignUp(method = 'email') {
    this.trackEvent('sign_up', {
      method: method
    });
  }

  /**
   * エラーイベント
   */
  trackError(errorType, errorMessage) {
    this.trackEvent('exception', {
      description: errorType + ': ' + errorMessage,
      fatal: false
    });
  }

  /**
   * パフォーマンスイベント
   */
  trackTiming(category, variable, value, label) {
    this.trackEvent('timing_complete', {
      name: variable,
      value: value,
      event_category: category,
      event_label: label
    });
  }

  // === Eコマースイベント（将来の有料機能用） ===

  /**
   * 購入イベント
   */
  trackPurchase(transactionId, value, items = []) {
    this.trackEvent('purchase', {
      transaction_id: transactionId,
      value: value,
      currency: 'JPY',
      items: items
    });
  }
}

// グローバルインスタンス
window.analyticsManager = new AnalyticsManager();

// 自動初期化（環境変数から取得）
document.addEventListener('DOMContentLoaded', () => {
  // 本番環境のみで有効化（環境変数GA_MEASUREMENT_IDを設定）
  const measurementId = window.GA_MEASUREMENT_ID || null;
  
  if (measurementId) {
    window.analyticsManager.init(measurementId);
    
    // SPA用のページ遷移検出
    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      window.analyticsManager.trackPageView(arguments[2]);
    };

    window.addEventListener('popstate', () => {
      window.analyticsManager.trackPageView(window.location.pathname);
    });
  } else {
    console.log('Google Analytics: Measurement ID not configured (set GA_MEASUREMENT_ID)');
  }
});

// 使用例をコンソールに出力
console.log(`
Analytics Manager Usage:
  - Track page view: analyticsManager.trackPageView('/page')
  - Track event: analyticsManager.trackEvent('event_name', {param: 'value'})
  - Track deal created: analyticsManager.trackDealCreated('deal-123', 50000000)
  - Track search: analyticsManager.trackSearch('keyword', 10)
  - Track error: analyticsManager.trackError('API Error', 'Failed to fetch data')
`);
