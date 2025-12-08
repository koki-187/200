# 🔍 売主プルダウン デバッグガイド v3.154.0

**本番環境URL**: https://f254b9f4.real-estate-200units-v2.pages.dev  
**問題**: 売主プルダウンが「選択してください」のまま、選択肢が表示されない

---

## 📋 デバッグ手順

### Step 1: ブラウザでログイン

1. 本番環境にアクセス: https://f254b9f4.real-estate-200units-v2.pages.dev
2. ログイン: Email: `navigator-187@docomo.ne.jp` / Password: `kouki187`
3. F12キーで開発者ツールを開く
4. **Console タブ**を選択

### Step 2: 以下のデバッグスクリプトを実行

```javascript
//==============================================================================
// 🔍 売主プルダウン デバッグスクリプト
//==============================================================================

(async function debugSellerDropdown() {
  console.clear();
  console.log('%c========================================', 'color: #FF5722; font-weight: bold;');
  console.log('%c🔍 売主プルダウン デバッグ開始', 'color: #FF5722; font-size: 16px; font-weight: bold;');
  console.log('%c========================================', 'color: #FF5722; font-weight: bold;');
  
  const results = {
    timestamp: new Date().toISOString(),
    checks: []
  };
  
  function addCheck(name, status, details) {
    results.checks.push({ name, status, details });
    const icon = status === 'ok' ? '✅' : '❌';
    const color = status === 'ok' ? '#4CAF50' : '#F44336';
    console.log(`${icon} %c${name}`, `color: ${color}; font-weight: bold;`, details || '');
  }
  
  // Check 1: DOM要素の存在確認
  console.log('\n%c--- Check 1: DOM要素の存在確認 ---', 'color: #2196F3; font-weight: bold;');
  const sellerSelect = document.getElementById('seller_id');
  
  if (sellerSelect) {
    addCheck('seller_id要素', 'ok', {
      found: true,
      options: sellerSelect.options.length,
      currentValue: sellerSelect.value
    });
    
    console.log('Options:', Array.from(sellerSelect.options).map(o => ({
      value: o.value,
      text: o.textContent
    })));
  } else {
    addCheck('seller_id要素', 'error', { found: false });
    console.error('seller_id要素が見つかりません！');
  }
  
  // Check 2: localStorage の認証情報
  console.log('\n%c--- Check 2: localStorage の認証情報 ---', 'color: #2196F3; font-weight: bold;');
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token) {
    addCheck('認証トークン', 'ok', {
      exists: true,
      length: token.length,
      preview: token.substring(0, 30) + '...'
    });
  } else {
    addCheck('認証トークン', 'error', { exists: false });
  }
  
  if (user) {
    const userData = JSON.parse(user);
    addCheck('ユーザー情報', 'ok', {
      name: userData.name,
      role: userData.role,
      email: userData.email
    });
  } else {
    addCheck('ユーザー情報', 'error', { exists: false });
  }
  
  // Check 3: API直接呼び出しテスト
  console.log('\n%c--- Check 3: API直接呼び出しテスト ---', 'color: #2196F3; font-weight: bold;');
  
  if (!token) {
    console.error('トークンがないため、APIテストをスキップ');
  } else {
    try {
      const response = await fetch('/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const agents = data.users.filter(u => u.role === 'AGENT');
        
        addCheck('Users API', 'ok', {
          status: response.status,
          totalUsers: data.users.length,
          agentCount: agents.length,
          agents: agents.map(a => ({ id: a.id, name: a.name, company: a.company_name }))
        });
        
        console.log('AGENTユーザー:', agents);
        
        if (agents.length === 0) {
          console.warn('⚠️ データベースにAGENTユーザーが存在しません！');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown' }));
        addCheck('Users API', 'error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
      }
    } catch (error) {
      addCheck('Users API', 'error', {
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  // Check 4: loadSellers関数の存在確認
  console.log('\n%c--- Check 4: loadSellers関数の存在確認 ---', 'color: #2196F3; font-weight: bold;');
  
  if (typeof loadSellers === 'function') {
    addCheck('loadSellers関数', 'ok', { exists: true });
  } else {
    addCheck('loadSellers関数', 'error', { exists: false, type: typeof loadSellers });
  }
  
  // Check 5: イベントリスナーの確認
  console.log('\n%c--- Check 5: ページの初期化状態 ---', 'color: #2196F3; font-weight: bold;');
  
  console.log('Document readyState:', document.readyState);
  console.log('Current URL:', window.location.href);
  
  // Check 6: 手動でloadSellersを実行
  console.log('\n%c--- Check 6: 手動でloadSellersを実行 ---', 'color: #2196F3; font-weight: bold;');
  
  if (sellerSelect && token) {
    console.log('手動でAGENTユーザーをロード中...');
    
    try {
      const response = await fetch('/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const agents = data.users.filter(u => u.role === 'AGENT');
        
        // 既存のオプションをクリア（最初の「選択してください」以外）
        while (sellerSelect.options.length > 1) {
          sellerSelect.remove(1);
        }
        
        // AGENTユーザーを追加
        agents.forEach(agent => {
          const option = document.createElement('option');
          option.value = agent.id;
          option.textContent = agent.name + (agent.company_name ? ` (${agent.company_name})` : '');
          sellerSelect.appendChild(option);
        });
        
        addCheck('手動ロード', 'ok', {
          loaded: agents.length,
          currentOptions: sellerSelect.options.length
        });
        
        console.log(`✅ ${agents.length}名のAGENTユーザーをドロップダウンに追加しました`);
        console.log('ドロップダウンを確認してください！');
      }
    } catch (error) {
      addCheck('手動ロード', 'error', { error: error.message });
    }
  }
  
  // 最終結果
  console.log('\n%c========================================', 'color: #FF5722; font-weight: bold;');
  console.log('%c📊 デバッグ結果サマリー', 'color: #FF5722; font-size: 16px; font-weight: bold;');
  console.log('%c========================================', 'color: #FF5722; font-weight: bold;');
  
  const okCount = results.checks.filter(c => c.status === 'ok').length;
  const errorCount = results.checks.filter(c => c.status === 'error').length;
  
  console.log(`✅ OK: ${okCount}/${results.checks.length}`);
  console.log(`❌ Error: ${errorCount}/${results.checks.length}`);
  console.log('');
  
  console.table(results.checks.map(c => ({
    'Check': c.name,
    'Status': c.status,
    'Details': JSON.stringify(c.details).substring(0, 80)
  })));
  
  console.log('\n%cFull Results:', 'color: #9E9E9E;');
  console.log(results);
  
  return results;
})();
```

---

## ✅ 期待される結果

**すべてのチェックが OK になる場合**:
```
✅ seller_id要素: found
✅ 認証トークン: exists
✅ ユーザー情報: 取得成功
✅ Users API: AGENTユーザー X名
✅ loadSellers関数: 存在確認
✅ 手動ロード: X名追加成功
```

**エラーが発生する場合**:
- `❌ seller_id要素`: DOM要素が見つからない
- `❌ 認証トークン`: ログインしていない
- `❌ Users API`: API呼び出しエラー（401, 500など）
- `❌ 手動ロード`: 予期しないエラー

---

## 🔧 問題別の対処法

### 問題1: seller_id要素が見つからない

**原因**: ページが完全にロードされていない、または別のページにいる

**対処法**:
1. 新規案件作成ページに移動
2. ページを完全にリロード（Ctrl+Shift+R）
3. 再度スクリプトを実行

### 問題2: 認証トークンがない

**原因**: ログインしていない、またはトークンが期限切れ

**対処法**:
1. ログアウト
2. 再ログイン
3. 再度スクリプトを実行

### 問題3: Users API が 401 エラー

**原因**: トークンが無効、または期限切れ

**対処法**:
1. 再ログイン
2. 再度スクリプトを実行

### 問題4: AGENTユーザーが 0 名

**原因**: データベースにAGENTロールのユーザーが登録されていない

**対処法**:
1. 管理画面でAGENTロールのユーザーを作成
2. または、wranglerコマンドで直接挿入:

```bash
cd /home/user/webapp

npx wrangler d1 execute real-estate-200units-db --remote --command="
INSERT INTO users (id, name, email, password, role, company_name, created_at, updated_at)
VALUES (
  'agent-' || substr(lower(hex(randomblob(8))), 1, 16),
  'テスト売主',
  'test-agent@example.com',
  '\$2a\$10\$abcdefghijklmnopqrstuvwxyz1234567890ABCD',
  'AGENT',
  'テスト不動産株式会社',
  datetime('now'),
  datetime('now')
)
"
```

---

## 📸 テスト結果の報告

このスクリプトを実行後、以下をスクリーンショットで送ってください:

1. **Consoleタブ全体**（デバッグ結果のサマリー）
2. **売主ドロップダウンの状態**（選択肢が表示されているか）
3. **エラーがあれば詳細ログ**

---

**このスクリプトで問題の原因が特定できます。**
