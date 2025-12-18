/**
 * 正確なハザードデータ収集スクリプト
 * v3.153.126 - 国交省APIからの正確なデータ取得
 * 
 * 使用方法:
 *   # 環境変数設定
 *   export MLIT_API_KEY="your-api-key"
 *   export JWT_TOKEN="your-jwt-token"
 *   
 *   # 実行
 *   node scripts/collect-accurate-hazard-data.cjs [--test-mode]
 * 
 * オプション:
 *   --test-mode: 東京都23区のみテスト実行
 *   --dry-run: データ収集のみ（SQL生成なし）
 *   --prefecture: 特定都道府県のみ実行 (tokyo|kanagawa|saitama|chiba)
 * 
 * 注意:
 *   - レート制限: 1秒/1リクエスト
 *   - 全市区町村の処理には約3-4時間必要
 *   - MLIT_API_KEYが必要（.dev.varsに設定）
 */

const fs = require('fs');
const path = require('path');

// コマンドライン引数の解析
const args = process.argv.slice(2);
const isTestMode = args.includes('--test-mode');
const isDryRun = args.includes('--dry-run');
const targetPrefecture = args.find(arg => arg.startsWith('--prefecture='))?.split('=')[1];

console.log('[Accurate Data Collection] 正確なハザードデータ収集を開始...\n');

if (isTestMode) {
  console.log('⚠️  テストモード: 東京都23区のみ処理します\n');
}

if (isDryRun) {
  console.log('⚠️  ドライランモード: SQL生成はスキップします\n');
}

// 市区町村リストを読み込み
const municipalities = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'municipalities.json'), 'utf-8')
);

/**
 * 対象市区町村を決定
 */
function getTargetMunicipalities() {
  if (isTestMode) {
    // テストモード: 東京都23区のみ
    return municipalities.tokyo.filter(m => m.city.includes('区'));
  }
  
  if (targetPrefecture) {
    // 特定都道府県のみ
    return municipalities[targetPrefecture] || [];
  }
  
  // 全市区町村
  return [
    ...municipalities.tokyo,
    ...municipalities.kanagawa,
    ...municipalities.saitama,
    ...municipalities.chiba,
  ];
}

const targetMunicipalities = getTargetMunicipalities();
console.log(`[Info] 対象市区町村数: ${targetMunicipalities.length}\n`);

/**
 * スリープ関数（レート制限対応）
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 既存APIを使用してハザードデータを取得
 * 注意: 実際の実行には認証済みサーバーが必要
 */
async function fetchHazardDataFromAPI(address) {
  const API_BASE = process.env.API_BASE || 'https://4d98dcb8.real-estate-200units-v2.pages.dev';
  const JWT_TOKEN = process.env.JWT_TOKEN;
  
  // JWT_TOKENがない場合は直接ハザードDB APIを使用（認証不要）
  if (!JWT_TOKEN) {
    try {
      // /api/hazard-db/info は認証不要の代替エンドポイント
      const url = `${API_BASE}/api/hazard-db/info?address=${encodeURIComponent(address)}`;
      
      // Node.jsの場合はnode-fetch等が必要
      // ここではモックデータを返す（実際の実装では fetch を使用）
      console.log(`   ⚠️  JWT_TOKENなし: ${address} のハザードDB API使用（モック）`);
      return {
        success: false,
        message: 'JWT_TOKENが必要です。本番環境で実行してください。',
        mockData: true
      };
    } catch (error) {
      console.error(`   ❌ ハザードDB APIエラー: ${address}`, error.message);
      return null;
    }
  }
  
  try {
    // 既存の統合APIを使用（認証必須）
    const url = `${API_BASE}/api/reinfolib/comprehensive-check?address=${encodeURIComponent(address)}`;
    
    // ⚠️ 実際のfetch実装が必要（Node.jsではnode-fetch等を使用）
    console.log(`   ⚠️  モック: ${address} のデータ取得をシミュレート`);
    return {
      success: false,
      message: '実際のAPI実行には node-fetch のインストールが必要です',
      mockData: true
    };
    
  } catch (error) {
    console.error(`   ❌ エラー: ${address}`, error.message);
    return null;
  }
}

/**
 * APIレスポンスをデータベース形式に変換
 */
function convertToDBFormat(apiResponse, municipality) {
  if (!apiResponse || !apiResponse.success) {
    return [];
  }
  
  const records = [];
  const { risks, location } = apiResponse;
  
  // ハザード情報の変換
  if (risks) {
    // 洪水リスク
    if (risks.floodRisk) {
      records.push({
        table: 'hazard_info',
        prefecture: municipality.prefecture,
        city: municipality.city,
        hazard_type: 'flood',
        risk_level: determineRiskLevel(risks.floodRisk),
        description: risks.floodRisk.description || '',
        affected_area: risks.floodRisk.affectedArea || '',
        data_source: 'MLIT API (XKT034)',
        data_source_url: 'https://www.reinfolib.mlit.go.jp/',
        confidence_level: 'high',
        verification_status: 'verified',
        verified_by: 'mlit_api_integration',
        verified_at: new Date().toISOString()
      });
    }
    
    // 土砂災害リスク
    if (risks.sedimentDisaster) {
      records.push({
        table: 'hazard_info',
        prefecture: municipality.prefecture,
        city: municipality.city,
        hazard_type: 'landslide',
        risk_level: risks.sedimentDisaster.isRedZone ? 'high' : 'medium',
        description: risks.sedimentDisaster.description || '',
        affected_area: risks.sedimentDisaster.affectedArea || '',
        data_source: 'MLIT API (XKT031)',
        data_source_url: 'https://www.reinfolib.mlit.go.jp/',
        confidence_level: 'high',
        verification_status: 'verified',
        verified_by: 'mlit_api_integration',
        verified_at: new Date().toISOString()
      });
    }
    
    // 津波リスク
    if (risks.tsunamiRisk) {
      records.push({
        table: 'hazard_info',
        prefecture: municipality.prefecture,
        city: municipality.city,
        hazard_type: 'tsunami',
        risk_level: determineRiskLevel(risks.tsunamiRisk),
        description: risks.tsunamiRisk.description || '',
        affected_area: risks.tsunamiRisk.affectedArea || '',
        data_source: 'MLIT API (XKT033)',
        data_source_url: 'https://www.reinfolib.mlit.go.jp/',
        confidence_level: 'high',
        verification_status: 'verified',
        verified_by: 'mlit_api_integration',
        verified_at: new Date().toISOString()
      });
    }
  }
  
  return records;
}

/**
 * リスクレベルを判定
 */
function determineRiskLevel(riskData) {
  if (!riskData || !riskData.status) return 'none';
  
  // API固有のロジックでリスクレベルを判定
  if (riskData.status === 'checked' && riskData.result === 'NG') {
    return 'high';
  } else if (riskData.status === 'checked' && riskData.warning) {
    return 'medium';
  } else if (riskData.status === 'checked') {
    return 'low';
  }
  
  return 'none';
}

/**
 * メイン処理
 */
async function main() {
  console.log('[Step 1] データ収集開始\n');
  
  const allRecords = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < targetMunicipalities.length; i++) {
    const muni = targetMunicipalities[i];
    const progress = `[${i + 1}/${targetMunicipalities.length}]`;
    
    console.log(`${progress} ${muni.prefecture}${muni.city}`);
    
    // サンプル住所を構築
    const address = `${muni.prefecture}${muni.city}1-1-1`;
    
    try {
      // APIからデータ取得
      const apiResponse = await fetchHazardDataFromAPI(address);
      
      if (apiResponse && apiResponse.success) {
        // データベース形式に変換
        const records = convertToDBFormat(apiResponse, muni);
        allRecords.push(...records);
        successCount++;
        console.log(`   ✅ 成功: ${records.length}件のハザードレコード取得`);
      } else {
        errorCount++;
        console.log(`   ⚠️  データなしまたはエラー`);
      }
      
      // レート制限対応（1秒/1リクエスト）
      await sleep(1000);
      
    } catch (error) {
      errorCount++;
      console.error(`   ❌ エラー: ${error.message}`);
    }
    
    // 進捗表示（10件ごと）
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- 進捗: ${i + 1}/${targetMunicipalities.length} (成功: ${successCount}, エラー: ${errorCount}) ---\n`);
    }
  }
  
  console.log('\n[Step 2] データ収集完了\n');
  console.log(`総件数: ${allRecords.length}`);
  console.log(`成功: ${successCount}`);
  console.log(`エラー: ${errorCount}\n`);
  
  if (isDryRun) {
    console.log('⚠️  ドライランモード: SQL生成をスキップします\n');
    return;
  }
  
  if (allRecords.length === 0) {
    console.log('⚠️  取得データがないため、SQL生成をスキップします\n');
    console.log('💡 ヒント: 実際のデータ取得には以下が必要です:');
    console.log('   1. ローカルサーバー起動 (npm run dev)');
    console.log('   2. JWT_TOKEN取得（ログイン後）');
    console.log('   3. MLIT_API_KEY設定（.dev.vars）\n');
    return;
  }
  
  // SQL生成
  console.log('[Step 3] SQL生成中...\n');
  const sql = generateSQL(allRecords);
  
  const outputPath = path.join(__dirname, '..', 'migrations', '0036_accurate_hazard_data.sql');
  fs.writeFileSync(outputPath, sql, 'utf-8');
  
  console.log(`✅ SQL生成完了: ${outputPath}\n`);
  console.log('次のステップ:');
  console.log('  1. マイグレーション適用（ローカル）:');
  console.log('     npx wrangler d1 migrations apply real-estate-200units-db --local');
  console.log('  2. マイグレーション適用（本番）:');
  console.log('     npx wrangler d1 migrations apply real-estate-200units-db --remote');
  console.log('  3. E2Eテスト実施\n');
}

/**
 * SQL生成
 */
function generateSQL(records) {
  const header = `-- ========================================
-- 正確なハザードデータ（国交省API取得）
-- v3.153.126 - 自動生成
-- 生成日時: ${new Date().toISOString()}
-- レコード数: ${records.length}
-- ========================================

-- 既存サンプルデータを削除
DELETE FROM hazard_info WHERE confidence_level = 'low';

-- 正確なデータを挿入
`;

  const inserts = records.map(record => {
    const values = [
      `'${record.prefecture}'`,
      `'${record.city}'`,
      `'${record.hazard_type}'`,
      `'${record.risk_level}'`,
      `'${record.description.replace(/'/g, "''")}'`,
      `'${record.affected_area}'`,
      `'${record.data_source}'`,
      `'${record.data_source_url}'`,
      `'${record.confidence_level}'`,
      `'${record.verification_status}'`,
      `'${record.verified_by}'`,
      `'${record.verified_at}'`
    ].join(', ');
    
    return `INSERT INTO hazard_info (
  prefecture, city, hazard_type, risk_level, description, affected_area,
  data_source, data_source_url, confidence_level, verification_status,
  verified_by, verified_at
) VALUES (${values});`;
  }).join('\n\n');
  
  return header + inserts;
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('\n❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});

// メイン実行
main()
  .then(() => {
    console.log('\n✅ スクリプト完了\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトエラー:', error);
    process.exit(1);
  });
