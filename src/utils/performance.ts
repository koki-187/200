/**
 * パフォーマンス最適化ユーティリティ
 * 200棟アパート用地仕入れプロジェクト
 */

/**
 * デバウンス関数
 * 連続した関数呼び出しを制御し、最後の呼び出しから指定時間後に一度だけ実行
 * @param func - 実行する関数
 * @param wait - 待機時間（ミリ秒）
 * @returns デバウンスされた関数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(context, args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * スロットル関数
 * 連続した関数呼び出しを制御し、指定時間ごとに一度だけ実行
 * @param func - 実行する関数
 * @param limit - 制限時間（ミリ秒）
 * @returns スロットルされた関数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 画像遅延読み込み (Lazy Loading) ユーティリティ
 * Intersection Observer APIを使用
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private images: Set<HTMLImageElement> = new Set();

  constructor(options?: IntersectionObserverInit) {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.onIntersection.bind(this),
        {
          rootMargin: '50px',
          threshold: 0.01,
          ...options
        }
      );
    }
  }

  /**
   * 画像要素を監視対象に追加
   */
  observe(img: HTMLImageElement) {
    if (this.observer) {
      this.images.add(img);
      this.observer.observe(img);
    } else {
      // Intersection Observer非対応ブラウザでは即座に読み込み
      this.loadImage(img);
    }
  }

  /**
   * 画像要素の監視を解除
   */
  unobserve(img: HTMLImageElement) {
    if (this.observer) {
      this.images.delete(img);
      this.observer.unobserve(img);
    }
  }

  /**
   * 全ての監視を解除
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.images.clear();
    }
  }

  /**
   * Intersection Observer のコールバック
   */
  private onIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        this.loadImage(img);
        this.unobserve(img);
      }
    });
  }

  /**
   * 画像を読み込む
   */
  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (src) {
      // プレースホルダー効果
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.3s ease-in-out';

      img.src = src;
      img.onload = () => {
        img.style.opacity = '1';
        img.removeAttribute('data-src');
        img.classList.add('loaded');
      };
      img.onerror = () => {
        img.src = '/static/placeholder.png'; // フォールバック画像
        img.classList.add('error');
      };
    }
  }
}

/**
 * ページネーションユーティリティ
 */
export class Paginator<T> {
  private data: T[] = [];
  private currentPage: number = 1;
  private itemsPerPage: number = 20;

  constructor(data: T[], itemsPerPage: number = 20) {
    this.data = data;
    this.itemsPerPage = itemsPerPage;
  }

  /**
   * 現在のページのデータを取得
   */
  getCurrentPageData(): T[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.data.slice(startIndex, endIndex);
  }

  /**
   * 総ページ数を取得
   */
  getTotalPages(): number {
    return Math.ceil(this.data.length / this.itemsPerPage);
  }

  /**
   * 次のページに移動
   */
  nextPage(): boolean {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      return true;
    }
    return false;
  }

  /**
   * 前のページに移動
   */
  prevPage(): boolean {
    if (this.currentPage > 1) {
      this.currentPage--;
      return true;
    }
    return false;
  }

  /**
   * 指定ページに移動
   */
  goToPage(page: number): boolean {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      return true;
    }
    return false;
  }

  /**
   * 現在のページ番号を取得
   */
  getCurrentPage(): number {
    return this.currentPage;
  }

  /**
   * データを更新
   */
  updateData(newData: T[]) {
    this.data = newData;
    this.currentPage = 1;
  }

  /**
   * ページネーション情報を取得
   */
  getInfo(): {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  } {
    return {
      currentPage: this.currentPage,
      totalPages: this.getTotalPages(),
      itemsPerPage: this.itemsPerPage,
      totalItems: this.data.length,
      hasNext: this.currentPage < this.getTotalPages(),
      hasPrev: this.currentPage > 1
    };
  }
}

/**
 * カーソルベースページネーション (無限スクロール用)
 */
export class CursorPaginator {
  private cursor: string | null = null;
  private hasMore: boolean = true;

  /**
   * 次のページのカーソルを設定
   */
  setCursor(cursor: string | null) {
    this.cursor = cursor;
  }

  /**
   * 現在のカーソルを取得
   */
  getCursor(): string | null {
    return this.cursor;
  }

  /**
   * 次のページが存在するか
   */
  setHasMore(hasMore: boolean) {
    this.hasMore = hasMore;
  }

  /**
   * 次のページが存在するか取得
   */
  getHasMore(): boolean {
    return this.hasMore;
  }

  /**
   * リセット
   */
  reset() {
    this.cursor = null;
    this.hasMore = true;
  }
}

/**
 * パフォーマンス測定ユーティリティ
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  /**
   * タイマー開始
   */
  start(label: string) {
    this.marks.set(label, performance.now());
  }

  /**
   * タイマー終了と結果表示
   */
  end(label: string): number | null {
    const startTime = this.marks.get(label);
    if (startTime === undefined) {
      console.warn(`Performance mark "${label}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    this.marks.delete(label);

    return duration;
  }

  /**
   * メモリ使用量を取得 (対応ブラウザのみ)
   */
  getMemoryUsage(): { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }
}

/**
 * ローカルストレージキャッシュユーティリティ (有効期限付き)
 */
export class LocalStorageCache {
  private prefix: string;

  constructor(prefix: string = 'cache_') {
    this.prefix = prefix;
  }

  /**
   * データをキャッシュに保存
   */
  set<T>(key: string, data: T, expiresInMinutes: number = 60) {
    const item = {
      data,
      expires: Date.now() + expiresInMinutes * 60 * 1000
    };

    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));
    } catch (error) {
      console.error('LocalStorage write error:', error);
    }
  }

  /**
   * キャッシュからデータを取得
   */
  get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(`${this.prefix}${key}`);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      
      if (Date.now() > item.expires) {
        this.remove(key);
        return null;
      }

      return item.data as T;
    } catch (error) {
      console.error('LocalStorage read error:', error);
      return null;
    }
  }

  /**
   * キャッシュを削除
   */
  remove(key: string) {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch (error) {
      console.error('LocalStorage remove error:', error);
    }
  }

  /**
   * 全てのキャッシュをクリア
   */
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('LocalStorage clear error:', error);
    }
  }
}
