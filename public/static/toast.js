/**
 * カスタムトーストUI実装
 * 200棟アパート用地仕入れプロジェクト
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }

  init() {
    // トーストコンテナがなければ作成
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  }

  /**
   * トーストを表示
   * @param {string} title - タイトル
   * @param {string} message - メッセージ
   * @param {string} type - success, error, warning, info
   * @param {number} duration - 表示時間（ミリ秒）
   */
  show(title, message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas ${iconMap[type]}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <div class="toast-close">
        <i class="fas fa-times"></i>
      </div>
    `;

    this.container.appendChild(toast);
    this.toasts.push(toast);

    // 閉じるボタンのイベント
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.remove(toast);
    });

    // 自動削除
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }

    return toast;
  }

  /**
   * トーストを削除
   */
  remove(toast) {
    toast.style.animation = 'toast-slide-out 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        this.container.removeChild(toast);
      }
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300);
  }

  /**
   * 成功トースト
   */
  success(title, message, duration = 4000) {
    return this.show(title, message, 'success', duration);
  }

  /**
   * エラートースト
   */
  error(title, message, duration = 6000) {
    return this.show(title, message, 'error', duration);
  }

  /**
   * 警告トースト
   */
  warning(title, message, duration = 5000) {
    return this.show(title, message, 'warning', duration);
  }

  /**
   * 情報トースト
   */
  info(title, message, duration = 4000) {
    return this.show(title, message, 'info', duration);
  }

  /**
   * 全てのトーストを削除
   */
  clearAll() {
    this.toasts.forEach(toast => this.remove(toast));
  }
}

// トーストスライドアウトアニメーション
const style = document.createElement('style');
style.textContent = `
  @keyframes toast-slide-out {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// グローバルインスタンス
window.toast = new ToastManager();

/**
 * カスタムダイアログ実装
 */
class DialogManager {
  /**
   * 確認ダイアログを表示
   * @param {string} title - タイトル
   * @param {string} message - メッセージ
   * @param {string} confirmText - 確認ボタンテキスト
   * @param {string} cancelText - キャンセルボタンテキスト
   * @returns {Promise<boolean>}
   */
  confirm(title, message, confirmText = '確認', cancelText = 'キャンセル') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'custom-dialog';

      dialog.innerHTML = `
        <div class="custom-dialog-header">
          <div class="custom-dialog-title">
            <i class="fas fa-question-circle"></i>
            ${title}
          </div>
          <div class="custom-dialog-close">
            <i class="fas fa-times"></i>
          </div>
        </div>
        <div class="custom-dialog-body">
          <p style="color: #4B5563; line-height: 1.6;">${message}</p>
        </div>
        <div class="custom-dialog-footer">
          <button class="btn-secondary dialog-cancel" style="width: auto;">
            <i class="fas fa-times mr-2"></i>${cancelText}
          </button>
          <button class="btn-primary dialog-confirm" style="width: auto;">
            <i class="fas fa-check mr-2"></i>${confirmText}
          </button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const close = (result) => {
        overlay.style.animation = 'fade-out 0.2s ease-out';
        setTimeout(() => {
          document.body.removeChild(overlay);
          resolve(result);
        }, 200);
      };

      // イベントリスナー
      dialog.querySelector('.dialog-confirm').addEventListener('click', () => close(true));
      dialog.querySelector('.dialog-cancel').addEventListener('click', () => close(false));
      dialog.querySelector('.custom-dialog-close').addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
    });
  }

  /**
   * アラートダイアログを表示
   * @param {string} title - タイトル
   * @param {string} message - メッセージ
   * @param {string} okText - OKボタンテキスト
   * @returns {Promise<void>}
   */
  alert(title, message, okText = 'OK') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'custom-dialog';

      dialog.innerHTML = `
        <div class="custom-dialog-header">
          <div class="custom-dialog-title">
            <i class="fas fa-info-circle"></i>
            ${title}
          </div>
          <div class="custom-dialog-close">
            <i class="fas fa-times"></i>
          </div>
        </div>
        <div class="custom-dialog-body">
          <p style="color: #4B5563; line-height: 1.6;">${message}</p>
        </div>
        <div class="custom-dialog-footer">
          <button class="btn-primary dialog-ok" style="width: auto;">
            <i class="fas fa-check mr-2"></i>${okText}
          </button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const close = () => {
        overlay.style.animation = 'fade-out 0.2s ease-out';
        setTimeout(() => {
          document.body.removeChild(overlay);
          resolve();
        }, 200);
      };

      // イベントリスナー
      dialog.querySelector('.dialog-ok').addEventListener('click', close);
      dialog.querySelector('.custom-dialog-close').addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    });
  }
}

// フェードアウトアニメーション
const dialogStyle = document.createElement('style');
dialogStyle.textContent = `
  @keyframes fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
`;
document.head.appendChild(dialogStyle);

// グローバルインスタンス
window.dialog = new DialogManager();

/**
 * ユーティリティ関数: alert/confirmの置き換え
 */
window.customAlert = (message) => window.dialog.alert('通知', message);
window.customConfirm = (message) => window.dialog.confirm('確認', message);
