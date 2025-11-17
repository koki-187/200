// ダークモード管理
(function() {
  'use strict';

  const STORAGE_KEY = 'theme-preference';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';

  // ダークモード状態管理
  class ThemeManager {
    constructor() {
      this.theme = this.getStoredTheme() || this.getSystemTheme();
      this.init();
    }

    init() {
      // 初期テーマ適用
      this.applyTheme(this.theme);

      // システムテーマ変更を監視
      this.watchSystemTheme();

      // トグルボタン作成
      this.createToggleButton();
    }

    getStoredTheme() {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        return null;
      }
    }

    getSystemTheme() {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return DARK_THEME;
      }
      return LIGHT_THEME;
    }

    storeTheme(theme) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (e) {
        console.error('Failed to store theme preference:', e);
      }
    }

    applyTheme(theme) {
      this.theme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      this.storeTheme(theme);
      this.updateToggleButton();
    }

    toggleTheme() {
      const newTheme = this.theme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
      this.applyTheme(newTheme);
    }

    watchSystemTheme() {
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
          // ユーザーが手動で設定していない場合のみシステムテーマに従う
          if (!this.getStoredTheme()) {
            const newTheme = e.matches ? DARK_THEME : LIGHT_THEME;
            this.applyTheme(newTheme);
          }
        });
      }
    }

    createToggleButton() {
      const button = document.createElement('button');
      button.className = 'theme-toggle';
      button.setAttribute('aria-label', 'テーマ切替');
      button.setAttribute('title', 'ダークモード切替');
      
      button.innerHTML = `
        <svg class="sun-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <svg class="moon-icon" style="display:none;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      `;

      button.addEventListener('click', () => {
        this.toggleTheme();
      });

      document.body.appendChild(button);
      this.toggleButton = button;
      this.updateToggleButton();
    }

    updateToggleButton() {
      if (!this.toggleButton) return;

      const sunIcon = this.toggleButton.querySelector('.sun-icon');
      const moonIcon = this.toggleButton.querySelector('.moon-icon');

      if (this.theme === DARK_THEME) {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
        this.toggleButton.setAttribute('title', 'ライトモードに切替');
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
        this.toggleButton.setAttribute('title', 'ダークモードに切替');
      }
    }
  }

  // ページ読み込み時にテーママネージャーを初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.themeManager = new ThemeManager();
    });
  } else {
    window.themeManager = new ThemeManager();
  }

  // グローバルAPIとして公開
  window.toggleTheme = function() {
    if (window.themeManager) {
      window.themeManager.toggleTheme();
    }
  };

  window.setTheme = function(theme) {
    if (window.themeManager && (theme === DARK_THEME || theme === LIGHT_THEME)) {
      window.themeManager.applyTheme(theme);
    }
  };

  window.getTheme = function() {
    return window.themeManager ? window.themeManager.theme : null;
  };
})();
