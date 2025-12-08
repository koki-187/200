/**
 * ブラウザプッシュ通知管理
 * Web Push API使用
 */

class PushNotificationManager {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.publicKey = null;
  }

  /**
   * プッシュ通知のサポート確認
   */
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * 初期化
   */
  async init(publicKey) {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    this.publicKey = publicKey;

    try {
      // Service Worker登録
      this.registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully');

      // 既存のサブスクリプションを確認
      this.subscription = await this.registration.pushManager.getSubscription();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * 通知権限をリクエスト
   */
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else {
      console.warn('Notification permission denied');
      return false;
    }
  }

  /**
   * プッシュ通知をサブスクライブ
   */
  async subscribe() {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      // VAPID公開鍵をUint8Arrayに変換
      const convertedVapidKey = this.urlBase64ToUint8Array(this.publicKey);

      // プッシュ通知をサブスクライブ
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      console.log('Push notification subscribed:', this.subscription);

      // サーバーにサブスクリプションを送信
      await this.sendSubscriptionToServer(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * プッシュ通知をアンサブスクライブ
   */
  async unsubscribe() {
    if (!this.subscription) {
      console.warn('No active subscription');
      return;
    }

    try {
      await this.subscription.unsubscribe();
      console.log('Push notification unsubscribed');

      // サーバーからサブスクリプションを削除
      await this.removeSubscriptionFromServer(this.subscription);

      this.subscription = null;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  /**
   * サブスクリプション状態を確認
   */
  async isSubscribed() {
    if (!this.registration) {
      return false;
    }

    const subscription = await this.registration.pushManager.getSubscription();
    return subscription !== null;
  }

  /**
   * サブスクリプションをサーバーに送信
   */
  async sendSubscriptionToServer(subscription) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/push-subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription to server');
    }

    return await response.json();
  }

  /**
   * サブスクリプションをサーバーから削除
   */
  async removeSubscriptionFromServer(subscription) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/push-subscriptions', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server');
    }

    return await response.json();
  }

  /**
   * Base64 URLエンコードされたVAPID公開鍵をUint8Arrayに変換
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * テスト通知を送信
   */
  async sendTestNotification() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/push-subscriptions/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }

    return await response.json();
  }
}

// グローバルインスタンス
window.pushNotificationManager = new PushNotificationManager();

// UIヘルパー関数
window.setupPushNotificationUI = function() {
  const toggleButton = document.getElementById('push-notification-toggle');
  const testButton = document.getElementById('push-notification-test');

  if (!toggleButton) return;

  const updateButtonState = async () => {
    const isSubscribed = await window.pushNotificationManager.isSubscribed();
    toggleButton.textContent = isSubscribed ? 'プッシュ通知を無効化' : 'プッシュ通知を有効化';
    toggleButton.classList.toggle('active', isSubscribed);
    
    if (testButton) {
      testButton.disabled = !isSubscribed;
    }
  };

  toggleButton.addEventListener('click', async () => {
    try {
      const isSubscribed = await window.pushNotificationManager.isSubscribed();
      
      if (isSubscribed) {
        await window.pushNotificationManager.unsubscribe();
        // alert removed per user requirement - see console
    console.error('プッシュ通知を無効化しました');
      } else {
        const permitted = await window.pushNotificationManager.requestPermission();
        if (permitted) {
          await window.pushNotificationManager.subscribe();
          // alert removed per user requirement - see console
    console.error('プッシュ通知を有効化しました');
        } else {
          // alert removed per user requirement - see console
    console.error('通知の許可が必要です');
        }
      }
      
      await updateButtonState();
    } catch (error) {
      console.error('Failed to toggle push notifications:', error);
      // alert removed per user requirement - see console
    console.error('プッシュ通知の切り替えに失敗しました: ' + error.message);
    }
  });

  if (testButton) {
    testButton.addEventListener('click', async () => {
      try {
        await window.pushNotificationManager.sendTestNotification();
        // alert removed per user requirement - see console
    console.error('テスト通知を送信しました');
      } catch (error) {
        console.error('Failed to send test notification:', error);
        // alert removed per user requirement - see console
    console.error('テスト通知の送信に失敗しました: ' + error.message);
      }
    });
  }

  updateButtonState();
};
