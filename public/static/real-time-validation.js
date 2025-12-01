/**
 * リアルタイムバリデーション
 * フォーム入力時に即座にバリデーションを実行
 */

(function() {
  'use strict';

  // バリデーションルール定義
  const validationRules = {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: '正しいメールアドレスを入力してください'
    },
    password: {
      minLength: 8,
      pattern: /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/,
      message: 'パスワードは8文字以上で、英字と数字を含む必要があります'
    },
    required: {
      test: (value) => value && value.trim().length > 0,
      message: 'この項目は必須です'
    },
    number: {
      pattern: /^\d+$/,
      message: '数字のみを入力してください'
    },
    decimal: {
      pattern: /^\d+(\.\d+)?$/,
      message: '数値を入力してください'
    },
    phone: {
      pattern: /^[\d-]+$/,
      message: '電話番号の形式が正しくありません'
    },
    url: {
      pattern: /^https?:\/\/.+/,
      message: '正しいURLを入力してください'
    }
  };

  // バリデーション実行
  function validateField(field) {
    const value = field.value;
    const rules = field.dataset.validate ? field.dataset.validate.split(',') : [];
    const errorContainer = document.getElementById(field.id + '-error') || 
                           field.parentElement.querySelector('.error-message');
    
    // エラーメッセージをクリア
    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.style.display = 'none';
    }
    
    // フィールドのエラースタイルをクリア
    field.classList.remove('border-red-500', 'border-green-500');
    
    // 必須チェック
    if (rules.includes('required')) {
      if (!validationRules.required.test(value)) {
        showError(field, errorContainer, validationRules.required.message);
        return false;
      }
    }
    
    // 値が空の場合は他のバリデーションをスキップ
    if (!value || value.trim().length === 0) {
      field.classList.add('border-green-500');
      return true;
    }
    
    // 各ルールを適用
    for (const rule of rules) {
      if (rule === 'required') continue; // 既にチェック済み
      
      const validator = validationRules[rule];
      if (!validator) continue;
      
      // パターンマッチング
      if (validator.pattern && !validator.pattern.test(value)) {
        showError(field, errorContainer, validator.message);
        return false;
      }
      
      // 最小長チェック
      if (validator.minLength && value.length < validator.minLength) {
        showError(field, errorContainer, validator.message);
        return false;
      }
      
      // カスタムテスト関数
      if (validator.test && !validator.test(value)) {
        showError(field, errorContainer, validator.message);
        return false;
      }
    }
    
    // 全てのバリデーションをパス
    field.classList.add('border-green-500');
    return true;
  }

  // エラー表示
  function showError(field, errorContainer, message) {
    field.classList.add('border-red-500');
    
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    } else {
      // エラーコンテナがない場合は動的に作成
      const error = document.createElement('div');
      error.id = field.id + '-error';
      error.className = 'error-message text-red-500 text-sm mt-1';
      error.textContent = message;
      field.parentElement.appendChild(error);
    }
  }

  // フォームバリデーション
  function validateForm(form) {
    const fields = form.querySelectorAll('[data-validate]');
    let isValid = true;
    
    fields.forEach(field => {
      if (!validateField(field)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  // イベントリスナー設定
  function initValidation() {
    // リアルタイムバリデーション（入力時）
    document.addEventListener('input', (e) => {
      const field = e.target;
      if (field.dataset.validate) {
        // デバウンス処理（300ms）
        clearTimeout(field.validationTimeout);
        field.validationTimeout = setTimeout(() => {
          validateField(field);
        }, 300);
      }
    });

    // フォーカスアウト時のバリデーション
    document.addEventListener('blur', (e) => {
      const field = e.target;
      if (field.dataset.validate) {
        validateField(field);
      }
    }, true);

    // フォーム送信時のバリデーション
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.dataset.validateForm !== undefined) {
        if (!validateForm(form)) {
          e.preventDefault();
          
          // 最初のエラーフィールドにフォーカス
          const firstError = form.querySelector('.border-red-500');
          if (firstError) {
            firstError.focus();
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          
          // エラートースト表示
          if (window.showToast) {
            window.showToast('入力内容に誤りがあります', 'error');
          }
        }
      }
    });
  }

  // パスワード確認バリデーション
  function initPasswordConfirm() {
    const passwordField = document.getElementById('password');
    const confirmField = document.getElementById('password-confirm');
    
    if (passwordField && confirmField) {
      confirmField.addEventListener('input', () => {
        const errorContainer = document.getElementById('password-confirm-error') ||
                              confirmField.parentElement.querySelector('.error-message');
        
        confirmField.classList.remove('border-red-500', 'border-green-500');
        
        if (confirmField.value && confirmField.value !== passwordField.value) {
          showError(confirmField, errorContainer, 'パスワードが一致しません');
        } else if (confirmField.value) {
          confirmField.classList.add('border-green-500');
          if (errorContainer) {
            errorContainer.style.display = 'none';
          }
        }
      });
    }
  }

  // 数値範囲バリデーション
  function initRangeValidation() {
    document.querySelectorAll('[data-min], [data-max]').forEach(field => {
      field.addEventListener('input', () => {
        const value = parseFloat(field.value);
        const min = parseFloat(field.dataset.min);
        const max = parseFloat(field.dataset.max);
        const errorContainer = document.getElementById(field.id + '-error');
        
        field.classList.remove('border-red-500', 'border-green-500');
        
        if (isNaN(value)) return;
        
        if (!isNaN(min) && value < min) {
          showError(field, errorContainer, `${min}以上の値を入力してください`);
        } else if (!isNaN(max) && value > max) {
          showError(field, errorContainer, `${max}以下の値を入力してください`);
        } else {
          field.classList.add('border-green-500');
          if (errorContainer) {
            errorContainer.style.display = 'none';
          }
        }
      });
    });
  }

  // 初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initValidation();
      initPasswordConfirm();
      initRangeValidation();
    });
  } else {
    initValidation();
    initPasswordConfirm();
    initRangeValidation();
  }

  // グローバルに公開
  window.validateForm = validateForm;
  window.validateField = validateField;

  console.log('[Real-time Validation] Initialized');
})();
