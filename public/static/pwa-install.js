/**
 * PWA Install Prompt Handler
 * iOS SafariでのPWAインストールガイドを表示
 */

(function() {
  'use strict';

  // iOSデバイスかつSafariかどうかを判定
  function isIOSSafari() {
    const ua = window.navigator.userAgent;
    const iOS = /iPhone|iPad|iPod/.test(ua);
    const webkit = /WebKit/.test(ua);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    
    return iOS && webkit && !isStandalone;
  }

  // PWAインストールガイドモーダルを表示
  function showIOSInstallPrompt() {
    // 既にスタンドアロンモードまたは以前に却下された場合はスキップ
    if (window.navigator.standalone || localStorage.getItem('pwa-install-dismissed') === 'true') {
      return;
    }

    // 24時間以内に表示した場合はスキップ
    const lastShown = localStorage.getItem('pwa-install-last-shown');
    if (lastShown && Date.now() - parseInt(lastShown) < 24 * 60 * 60 * 1000) {
      return;
    }

    // モーダルHTML
    const modalHTML = `
      <div id="pwa-install-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        animation: fadeIn 0.3s ease;
      ">
        <div style="
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        ">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="/logo-3d-new.png" alt="Logo" style="width: 64px; height: 64px; margin: 0 auto 16px;">
            <h2 style="font-size: 20px; font-weight: bold; color: #1e293b; margin: 0 0 8px;">
              ホーム画面に追加
            </h2>
            <p style="font-size: 14px; color: #64748b; margin: 0;">
              このアプリをホーム画面に追加して、ネイティブアプリのように利用できます
            </p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8;">
              <li>画面下部の <strong>共有ボタン</strong> <svg style="display: inline; width: 16px; height: 16px; vertical-align: middle;" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 11-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path></svg> をタップ</li>
              <li>「ホーム画面に追加」をタップ</li>
              <li>「追加」をタップして完了</li>
            </ol>
          </div>

          <div style="display: flex; gap: 12px;">
            <button id="pwa-install-later" style="
              flex: 1;
              padding: 12px 24px;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              background: white;
              color: #64748b;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">
              後で
            </button>
            <button id="pwa-install-dismiss" style="
              flex: 1;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
              color: white;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">
              わかりました
            </button>
          </div>
        </div>
      </div>

      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        #pwa-install-later:active {
          background: #f1f5f9;
          transform: scale(0.98);
        }
        #pwa-install-dismiss:active {
          opacity: 0.9;
          transform: scale(0.98);
        }
      </style>
    `;

    // モーダルを追加
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // イベントリスナー
    document.getElementById('pwa-install-later').addEventListener('click', function() {
      localStorage.setItem('pwa-install-last-shown', Date.now().toString());
      document.getElementById('pwa-install-modal').remove();
    });

    document.getElementById('pwa-install-dismiss').addEventListener('click', function() {
      localStorage.setItem('pwa-install-dismissed', 'true');
      localStorage.setItem('pwa-install-last-shown', Date.now().toString());
      document.getElementById('pwa-install-modal').remove();
    });

    // オーバーレイクリックで閉じる
    document.getElementById('pwa-install-modal').addEventListener('click', function(e) {
      if (e.target.id === 'pwa-install-modal') {
        localStorage.setItem('pwa-install-last-shown', Date.now().toString());
        this.remove();
      }
    });
  }

  // Androidの場合: beforeinstallprompt イベントを使用
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', function(e) {
    console.log('[PWA] beforeinstallprompt event triggered');
    e.preventDefault();
    deferredPrompt = e;

    // インストールボタンを表示（既存のボタンがある場合）
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', function() {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
          if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] User accepted the install prompt');
          } else {
            console.log('[PWA] User dismissed the install prompt');
          }
          deferredPrompt = null;
        });
      });
    }
  });

  // インストール完了時
  window.addEventListener('appinstalled', function() {
    console.log('[PWA] App installed successfully');
    localStorage.setItem('pwa-installed', 'true');
    
    // インストールボタンを非表示
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  });

  // ページ読み込み後、少し遅延してプロンプト表示
  if (isIOSSafari()) {
    window.addEventListener('load', function() {
      setTimeout(showIOSInstallPrompt, 3000); // 3秒後に表示
    });
  }

  // Service Worker登録
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/service-worker.js')
        .then(function(registration) {
          console.log('[PWA] Service Worker registered:', registration.scope);
        })
        .catch(function(error) {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  }
})();
