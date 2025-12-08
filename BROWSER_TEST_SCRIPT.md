# 🧪 ブラウザ自動テストスクリプト v3.153.0

**本番環境URL**: https://f254b9f4.real-estate-200units-v2.pages.dev  
**ログイン情報**: Email: `navigator-187@docomo.ne.jp` / Password: `kouki187`

---

## 📋 テスト手順

### Step 1: ブラウザでアクセス

1. **本番環境にアクセス**:  
   https://f254b9f4.real-estate-200units-v2.pages.dev

2. **ログイン**

3. **開発者ツール（F12）→ Console タブ**を開く

### Step 2: 以下のスクリプトをConsoleに貼り付けて実行

```javascript
//==============================================================================
// 🧪 不動産管理アプリ v3.153.0 - 完全自動テストスクリプト
//==============================================================================

(async function runComprehensiveTest() {
  console.clear();
  console.log('%c========================================', 'color: #4CAF50; font-weight: bold;');
  console.log('%c🧪 不動産管理アプリ 完全自動テスト開始', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
  console.log('%c========================================', 'color: #4CAF50; font-weight: bold;');
  console.log('');

  const results = {
    timestamp: new Date().toISOString(),
    version: 'v3.153.0',
    url: window.location.href,
    tests: []
  };

  // ヘルパー関数
  function addResult(testName, status, details = {}) {
    const result = { testName, status, details, timestamp: new Date().toISOString() };
    results.tests.push(result);
    
    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    const color = status === 'passed' ? '#4CAF50' : status === 'failed' ? '#F44336' : '#FF9800';
    
    console.log(`${icon} %c${testName}`, `color: ${color}; font-weight: bold;`, details);
    return result;
  }

  async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  //==========================================================================
  // Test 1: ヘルスチェックAPI
  //==========================================================================
  console.log('\n%c--- Test 1: ヘルスチェックAPI ---', 'color: #2196F3; font-weight: bold;');
  
  try {
    const healthRes = await fetch('/api/health');
    const healthData = await healthRes.json();
    
    if (healthData.status === 'healthy') {
      addResult('ヘルスチェックAPI', 'passed', {
        status: healthData.status,
        services: healthData.services
      });
    } else {
      addResult('ヘルスチェックAPI', 'warning', {
        status: healthData.status,
        message: 'Some services may be degraded'
      });
    }
  } catch (error) {
    addResult('ヘルスチェックAPI', 'failed', { error: error.message });
  }

  //==========================================================================
  // Test 2: OpenAI API接続テスト
  //==========================================================================
  console.log('\n%c--- Test 2: OpenAI API接続テスト ---', 'color: #2196F3; font-weight: bold;');
  
  try {
    const openaiRes = await fetch('/api/ocr-jobs/test-openai');
    const openaiData = await openaiRes.json();
    
    if (openaiData.success) {
      addResult('OpenAI API接続', 'passed', {
        model: openaiData.model,
        tokens: openaiData.tokens_used?.total_tokens
      });
    } else {
      addResult('OpenAI API接続', 'failed', { error: openaiData.error });
    }
  } catch (error) {
    addResult('OpenAI API接続', 'failed', { error: error.message });
  }

  //==========================================================================
  // Test 3: 認証状態の確認
  //==========================================================================
  console.log('\n%c--- Test 3: 認証状態の確認 ---', 'color: #2196F3; font-weight: bold;');
  
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    addResult('認証状態', 'passed', {
      hasToken: true,
      user: JSON.parse(user).name
    });
  } else {
    addResult('認証状態', 'failed', {
      hasToken: !!token,
      hasUser: !!user
    });
  }

  //==========================================================================
  // Test 4: 売主プルダウン（ユーザーAPI）
  //==========================================================================
  console.log('\n%c--- Test 4: 売主プルダウン（ユーザーAPI） ---', 'color: #2196F3; font-weight: bold;');
  
  try {
    const usersRes = await fetch('/api/auth/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      const agents = usersData.users.filter(u => u.role === 'AGENT');
      
      if (agents.length > 0) {
        addResult('売主プルダウン', 'passed', {
          totalUsers: usersData.users.length,
          agentCount: agents.length,
          agents: agents.map(a => a.name)
        });
      } else {
        addResult('売主プルダウン', 'warning', {
          totalUsers: usersData.users.length,
          agentCount: 0,
          message: 'No AGENT role users found'
        });
      }
    } else {
      addResult('売主プルダウン', 'failed', {
        status: usersRes.status,
        statusText: usersRes.statusText
      });
    }
  } catch (error) {
    addResult('売主プルダウン', 'failed', { error: error.message });
  }

  //==========================================================================
  // Test 5: ストレージ使用量API
  //==========================================================================
  console.log('\n%c--- Test 5: ストレージ使用量API ---', 'color: #2196F3; font-weight: bold;');
  
  try {
    const storageRes = await fetch('/api/storage-quota', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (storageRes.ok) {
      const storageData = await storageRes.json();
      const usagePercent = storageData.quota.usage.usage_percent;
      
      if (usagePercent < 90) {
        addResult('ストレージ使用量', 'passed', {
          used_mb: storageData.quota.usage.used_mb,
          limit_mb: storageData.quota.usage.limit_mb,
          usage_percent: usagePercent
        });
      } else {
        addResult('ストレージ使用量', 'warning', {
          used_mb: storageData.quota.usage.used_mb,
          limit_mb: storageData.quota.usage.limit_mb,
          usage_percent: usagePercent,
          message: 'Storage usage above 90%'
        });
      }
    } else {
      addResult('ストレージ使用量', 'failed', {
        status: storageRes.status
      });
    }
  } catch (error) {
    addResult('ストレージ使用量', 'failed', { error: error.message });
  }

  //==========================================================================
  // Test 6: 不動産情報ライブラリAPI（物件情報自動入力）
  //==========================================================================
  console.log('\n%c--- Test 6: 不動産情報ライブラリAPI ---', 'color: #2196F3; font-weight: bold;');
  
  try {
    const reinfolibRes = await fetch('/api/reinfolib/property-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        address: '東京都港区六本木',
        year: new Date().getFullYear(),
        quarter: Math.ceil((new Date().getMonth() + 1) / 3)
      })
    });
    
    if (reinfolibRes.ok) {
      const reinfolibData = await reinfolibRes.json();
      
      if (reinfolibData.success) {
        addResult('不動産情報ライブラリAPI', 'passed', {
          dataFound: !!reinfolibData.data,
          message: reinfolibData.message
        });
      } else {
        addResult('不動産情報ライブラリAPI', 'warning', {
          message: reinfolibData.message
        });
      }
    } else {
      addResult('不動産情報ライブラリAPI', 'failed', {
        status: reinfolibRes.status
      });
    }
  } catch (error) {
    addResult('不動産情報ライブラリAPI', 'failed', { error: error.message });
  }

  //==========================================================================
  // 最終結果の表示
  //==========================================================================
  console.log('\n%c========================================', 'color: #4CAF50; font-weight: bold;');
  console.log('%c📊 テスト結果サマリー', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
  console.log('%c========================================', 'color: #4CAF50; font-weight: bold;');
  
  const passed = results.tests.filter(t => t.status === 'passed').length;
  const failed = results.tests.filter(t => t.status === 'failed').length;
  const warning = results.tests.filter(t => t.status === 'warning').length;
  const total = results.tests.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`⚠️  Warning: ${warning}/${total}`);
  console.log('');
  
  if (failed === 0) {
    console.log('%c🎉 すべてのテストが成功しました！', 'color: #4CAF50; font-size: 18px; font-weight: bold;');
  } else {
    console.log('%c⚠️ いくつかのテストが失敗しました。詳細を確認してください。', 'color: #FF9800; font-size: 18px; font-weight: bold;');
  }
  
  console.log('\n%c📋 詳細レポート:', 'color: #2196F3; font-weight: bold;');
  console.table(results.tests.map(t => ({
    'Test Name': t.testName,
    'Status': t.status,
    'Details': JSON.stringify(t.details).substring(0, 100)
  })));
  
  console.log('\n%cFull Results Object:', 'color: #9E9E9E;');
  console.log(results);
  
  return results;
})();
```

---

## ✅ 期待される結果

すべてのテストが**✅ Passed**となることを確認してください：

1. ✅ ヘルスチェックAPI - `status: "healthy"`
2. ✅ OpenAI API接続 - `success: true, model: "gpt-4o"`
3. ✅ 認証状態 - `hasToken: true`
4. ✅ 売主プルダウン - `agentCount > 0`
5. ✅ ストレージ使用量 - `usage_percent < 90`
6. ✅ 不動産情報ライブラリAPI - APIが応答

---

## ⚠️ トラブルシューティング

### ❌ OpenAI API接続が失敗する場合

**症状**: `❌ OpenAI API接続: failed`

**原因と対処**:
- 環境変数 `OPENAI_API_KEY` が未設定または無効
- Cloudflare Pages の Environment variables を確認
- 新しいAPIキーを設定して再デプロイ

### ❌ 売主プルダウンが空の場合

**症状**: `⚠️ 売主プルダウン: warning, agentCount: 0`

**原因と対処**:
- データベースにAGENTロールのユーザーが存在しない
- 管理画面でAGENTロールのユーザーを作成

### ❌ 認証状態が失敗する場合

**症状**: `❌ 認証状態: failed`

**原因と対処**:
- ログインが完了していない
- ページをリロードしてから再ログイン

---

## 📸 テスト結果のスクリーンショット

テスト完了後、以下をスクリーンショットで保存してください:

1. **Consoleタブ全体**（テスト結果のサマリー）
2. **詳細レポート**（テーブル表示）
3. **エラーがあれば赤いエラーログ**

---

**このテストスクリプトを実行することで、すべての主要機能の動作確認が自動的に行われます。**
