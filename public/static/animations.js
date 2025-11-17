// アニメーションライブラリ統合
(function() {
  'use strict';

  // アニメーション設定
  const ANIMATION_CONFIG = {
    duration: 600,
    easing: 'ease-in-out',
    once: false,
    mirror: false,
    offset: 120,
    delay: 0
  };

  // カスタムアニメーション定義
  const customAnimations = {
    'fade-in-up': {
      from: { opacity: 0, transform: 'translateY(30px)' },
      to: { opacity: 1, transform: 'translateY(0)' }
    },
    'fade-in-down': {
      from: { opacity: 0, transform: 'translateY(-30px)' },
      to: { opacity: 1, transform: 'translateY(0)' }
    },
    'fade-in-left': {
      from: { opacity: 0, transform: 'translateX(-30px)' },
      to: { opacity: 1, transform: 'translateX(0)' }
    },
    'fade-in-right': {
      from: { opacity: 0, transform: 'translateX(30px)' },
      to: { opacity: 1, transform: 'translateX(0)' }
    },
    'zoom-in': {
      from: { opacity: 0, transform: 'scale(0.9)' },
      to: { opacity: 1, transform: 'scale(1)' }
    },
    'zoom-out': {
      from: { opacity: 0, transform: 'scale(1.1)' },
      to: { opacity: 1, transform: 'scale(1)' }
    },
    'slide-up': {
      from: { transform: 'translateY(100%)' },
      to: { transform: 'translateY(0)' }
    },
    'slide-down': {
      from: { transform: 'translateY(-100%)' },
      to: { transform: 'translateY(0)' }
    },
    'rotate-in': {
      from: { opacity: 0, transform: 'rotate(-10deg) scale(0.9)' },
      to: { opacity: 1, transform: 'rotate(0) scale(1)' }
    },
    'bounce-in': {
      from: { opacity: 0, transform: 'scale(0.3)' },
      to: { opacity: 1, transform: 'scale(1)' },
      keyframes: [
        { offset: 0, transform: 'scale(0.3)', opacity: 0 },
        { offset: 0.5, transform: 'scale(1.05)' },
        { offset: 0.7, transform: 'scale(0.9)' },
        { offset: 1, transform: 'scale(1)', opacity: 1 }
      ]
    }
  };

  class AnimationManager {
    constructor() {
      this.observer = null;
      this.animatedElements = new Set();
      this.init();
    }

    init() {
      // Intersection Observerセットアップ
      this.setupObserver();
      
      // 初期要素の検出
      this.observeElements();

      // DOM変更の監視
      this.watchDOMChanges();

      // カスタムイベントリスナー
      this.setupEventListeners();
    }

    setupObserver() {
      const options = {
        root: null,
        rootMargin: `${ANIMATION_CONFIG.offset}px`,
        threshold: 0.1
      };

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animateElement(entry.target);
            
            if (ANIMATION_CONFIG.once) {
              this.observer.unobserve(entry.target);
            }
          } else if (ANIMATION_CONFIG.mirror) {
            this.resetElement(entry.target);
          }
        });
      }, options);
    }

    observeElements() {
      const elements = document.querySelectorAll('[data-animate]');
      elements.forEach(el => {
        if (!this.animatedElements.has(el)) {
          this.observer.observe(el);
        }
      });
    }

    animateElement(element) {
      const animationType = element.getAttribute('data-animate');
      const delay = parseInt(element.getAttribute('data-delay') || ANIMATION_CONFIG.delay);
      const duration = parseInt(element.getAttribute('data-duration') || ANIMATION_CONFIG.duration);
      
      setTimeout(() => {
        if (customAnimations[animationType]) {
          this.applyCustomAnimation(element, animationType, duration);
        } else {
          element.classList.add('animate-' + animationType);
        }
        
        this.animatedElements.add(element);
        element.dispatchEvent(new CustomEvent('animated', { detail: { type: animationType } }));
      }, delay);
    }

    applyCustomAnimation(element, type, duration) {
      const animation = customAnimations[type];
      
      // 初期状態を設定
      Object.assign(element.style, animation.from);
      element.style.transition = `all ${duration}ms ${ANIMATION_CONFIG.easing}`;

      // アニメーション実行
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          Object.assign(element.style, animation.to);
        });
      });

      // アニメーション完了後にスタイルをクリア
      setTimeout(() => {
        element.style.transition = '';
      }, duration);
    }

    resetElement(element) {
      const animationType = element.getAttribute('data-animate');
      element.classList.remove('animate-' + animationType);
      
      if (customAnimations[animationType]) {
        Object.assign(element.style, customAnimations[animationType].from);
      }
      
      this.animatedElements.delete(element);
    }

    watchDOMChanges() {
      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              if (node.hasAttribute('data-animate')) {
                this.observer.observe(node);
              }
              
              const children = node.querySelectorAll('[data-animate]');
              children.forEach(child => this.observer.observe(child));
            }
          });
        });
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    setupEventListeners() {
      // カスタムアニメーショントリガー
      document.addEventListener('triggerAnimation', (e) => {
        const { element, type } = e.detail;
        if (element) {
          element.setAttribute('data-animate', type);
          this.animateElement(element);
        }
      });
    }

    // 手動でアニメーションをトリガー
    trigger(selector, animationType) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.setAttribute('data-animate', animationType);
        this.animateElement(el);
      });
    }

    // すべてのアニメーションをリセット
    resetAll() {
      this.animatedElements.forEach(el => {
        this.resetElement(el);
      });
      this.animatedElements.clear();
    }
  }

  // ページ読み込み時にアニメーションマネージャーを初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.animationManager = new AnimationManager();
    });
  } else {
    window.animationManager = new AnimationManager();
  }

  // グローバルAPI
  window.triggerAnimation = function(selector, animationType) {
    if (window.animationManager) {
      window.animationManager.trigger(selector, animationType);
    }
  };

  window.resetAnimations = function() {
    if (window.animationManager) {
      window.animationManager.resetAll();
    }
  };
})();
