import { 
  debounce, 
  throttle, 
  Paginator, 
  CursorPaginator,
  PerformanceMonitor,
  LocalStorageCache
} from '../utils/performance';

// Mock performance.now() for consistent testing
global.performance = {
  now: jest.fn(() => Date.now())
} as any;

describe('Performance Utils', () => {
  describe('debounce', () => {
    jest.useFakeTimers();

    it('should delay function execution', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous calls', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    it('should limit function execution', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  describe('Paginator', () => {
    const testData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));

    it('should initialize correctly', () => {
      const paginator = new Paginator(testData, 10);
      expect(paginator.getCurrentPage()).toBe(1);
      expect(paginator.getTotalPages()).toBe(5);
    });

    it('should return correct page data', () => {
      const paginator = new Paginator(testData, 10);
      const firstPage = paginator.getCurrentPageData();

      expect(firstPage).toHaveLength(10);
      expect(firstPage[0].id).toBe(1);
      expect(firstPage[9].id).toBe(10);
    });

    it('should navigate to next page', () => {
      const paginator = new Paginator(testData, 10);
      const result = paginator.nextPage();

      expect(result).toBe(true);
      expect(paginator.getCurrentPage()).toBe(2);

      const secondPage = paginator.getCurrentPageData();
      expect(secondPage[0].id).toBe(11);
    });

    it('should navigate to previous page', () => {
      const paginator = new Paginator(testData, 10);
      paginator.nextPage();
      const result = paginator.prevPage();

      expect(result).toBe(true);
      expect(paginator.getCurrentPage()).toBe(1);
    });

    it('should not go beyond last page', () => {
      const paginator = new Paginator(testData, 10);
      paginator.goToPage(5);
      const result = paginator.nextPage();

      expect(result).toBe(false);
      expect(paginator.getCurrentPage()).toBe(5);
    });

    it('should return pagination info', () => {
      const paginator = new Paginator(testData, 10);
      const info = paginator.getInfo();

      expect(info.currentPage).toBe(1);
      expect(info.totalPages).toBe(5);
      expect(info.totalItems).toBe(50);
      expect(info.itemsPerPage).toBe(10);
      expect(info.hasNext).toBe(true);
      expect(info.hasPrev).toBe(false);
    });
  });

  describe('CursorPaginator', () => {
    it('should initialize with null cursor', () => {
      const paginator = new CursorPaginator();
      expect(paginator.getCursor()).toBeNull();
      expect(paginator.getHasMore()).toBe(true);
    });

    it('should set and get cursor', () => {
      const paginator = new CursorPaginator();
      paginator.setCursor('cursor-123');

      expect(paginator.getCursor()).toBe('cursor-123');
    });

    it('should set hasMore flag', () => {
      const paginator = new CursorPaginator();
      paginator.setHasMore(false);

      expect(paginator.getHasMore()).toBe(false);
    });

    it('should reset correctly', () => {
      const paginator = new CursorPaginator();
      paginator.setCursor('cursor-123');
      paginator.setHasMore(false);
      paginator.reset();

      expect(paginator.getCursor()).toBeNull();
      expect(paginator.getHasMore()).toBe(true);
    });
  });

  describe('PerformanceMonitor', () => {
    it('should measure performance', () => {
      const monitor = new PerformanceMonitor();
      monitor.start('test');

      // Simulate some work
      for (let i = 0; i < 1000; i++) {}

      const duration = monitor.end('test');
      expect(duration).not.toBeNull();
      expect(typeof duration).toBe('number');
    });

    it('should return null for non-existent mark', () => {
      const monitor = new PerformanceMonitor();
      const duration = monitor.end('non-existent');

      expect(duration).toBeNull();
    });
  });

  describe('LocalStorageCache', () => {
    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
      };
    })();
    Object.defineProperty(global, 'localStorage', { value: localStorageMock });

    beforeEach(() => {
      localStorageMock.clear();
    });

    it('should set and get cache', () => {
      const cache = new LocalStorageCache();
      const data = { test: 'value' };

      cache.set('test-key', data, 60);
      const retrieved = cache.get('test-key');

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const cache = new LocalStorageCache();
      const retrieved = cache.get('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should remove cache item', () => {
      const cache = new LocalStorageCache();
      cache.set('test-key', { test: 'value' }, 60);
      cache.remove('test-key');

      const retrieved = cache.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired cache', () => {
      const cache = new LocalStorageCache();
      
      // Mock Date.now to simulate expiration
      const now = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      
      cache.set('test-key', { test: 'value' }, 0.0001); // Very short expiration
      
      // Advance time
      jest.spyOn(Date, 'now').mockImplementation(() => now + 10000);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toBeNull();

      jest.restoreAllMocks();
    });

    it('should clear all cache with prefix', () => {
      const cache = new LocalStorageCache('test_');
      cache.set('key1', { test: 1 }, 60);
      cache.set('key2', { test: 2 }, 60);
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });
});
