#!/usr/bin/env node

/**
 * データベースハザードデータ検証スクリプト v3.153.128
 * 
 * 本番DBまたはローカルDBのハザードデータを検証し、
 * confidence_levelとverification_statusを更新
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { verifyHazardData, generateVerificationReport } = require('./verify-hazard-data.cjs');

const isRemote = process.argv.includes('--remote');
const envFlag = isRemote ? '--remote' : '--local';
const envName = isRemote ? 'REMOTE (本番)' : 'LOCAL (ローカル)';

console.log(`\n========================================`);
console.log(`ハザードデータ検証 (${envName})`);
console.log(`========================================\n`);

// Step 1: DBからハザードデータを取得
console.log(`[Step 1] ハザードデータ取得中...`);

const query = `
  SELECT 
    id,
    prefecture,
    city,
    district,
    hazard_type,
    risk_level,
    confidence_level,
    verification_status
  FROM hazard_info
  ORDER BY prefecture, city, hazard_type
`;

let hazardsData = [];

try {
  const result = execSync(
    `npx wrangler d1 execute real-estate-200units-db ${envFlag} --json --command="${query.replace(/\n/g, ' ')}"`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  
  const parsed = JSON.parse(result);
  if (parsed[0] && parsed[0].results) {
    hazardsData = parsed[0].results;
    console.log(`✅ ${hazardsData.length}件のハザードデータを取得\n`);
  } else {
    console.error('❌ データ取得失敗');
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ データ取得エラー: ${error.message}`);
  process.exit(1);
}

// Step 2: データ検証実行
console.log(`[Step 2] データ検証実行中...\n`);

verifyHazardData(hazardsData).then(results => {
  // レポート生成
  const report = generateVerificationReport(results);
  const reportPath = path.join(__dirname, '..', `HAZARD_VERIFICATION_REPORT_${envName.replace(/[^A-Z]/g, '')}_v3.153.128.md`);
  fs.writeFileSync(reportPath, report, 'utf8');
  
  console.log(`\n✅ 検証完了！`);
  console.log(`📄 レポート: ${reportPath}\n`);
  
  // サマリー表示
  console.log(`========================================`);
  console.log(`検証結果サマリー`);
  console.log(`========================================`);
  console.log(`総データ数: ${results.totalHazards}件`);
  console.log(`対象市区町村: ${results.totalCities}市区町村`);
  console.log(`検証済み: ${results.verifiedHazards}件 (${(results.verifiedHazards / results.totalHazards * 100).toFixed(1)}%)`);
  console.log(`問題発見: ${results.issuesFound}件`);
  console.log(`  - 🔴 HIGH: ${results.highSeverityIssues}件`);
  console.log(`  - 🟡 MEDIUM: ${results.mediumSeverityIssues}件`);
  console.log(`  - 🟢 LOW: ${results.lowSeverityIssues}件\n`);
  
  const verifiedRatio = results.verifiedHazards / results.totalHazards;
  
  if (verifiedRatio >= 0.9) {
    console.log(`✅ データ品質は非常に良好です！`);
    console.log(`推奨 confidence_level: high\n`);
  } else if (verifiedRatio >= 0.7) {
    console.log(`⚠️ データ品質は良好ですが、一部改善の余地があります。`);
    console.log(`推奨 confidence_level: high\n`);
  } else if (verifiedRatio >= 0.5) {
    console.log(`⚠️ データ品質は許容範囲内ですが、改善推奨です。`);
    console.log(`推奨 confidence_level: medium\n`);
  } else {
    console.log(`❌ データ品質が低いです。修正が必須です。`);
    console.log(`推奨 confidence_level: low\n`);
  }
  
  // Step 3: confidence_level更新のSQLを生成
  if (verifiedRatio >= 0.7 && results.highSeverityIssues === 0) {
    console.log(`[Step 3] confidence_level 更新SQL生成中...\n`);
    
    const updateSql = `
-- confidence_level 更新 (検証済みデータ)
-- 生成日時: ${new Date().toISOString()}
-- 検証済み割合: ${(verifiedRatio * 100).toFixed(1)}%
-- 重大な問題: ${results.highSeverityIssues}件

UPDATE hazard_info 
SET 
  confidence_level = 'high',
  verification_status = 'verified',
  verified_at = CURRENT_TIMESTAMP
WHERE confidence_level = 'medium'
  AND verification_status = 'pending';

-- 検証結果確認
SELECT 
  confidence_level, 
  verification_status, 
  COUNT(*) as count 
FROM hazard_info 
GROUP BY confidence_level, verification_status;
`;
    
    const sqlPath = path.join(__dirname, '..', 'migrations', '0038_update_confidence_level.sql');
    fs.writeFileSync(sqlPath, updateSql.trim(), 'utf8');
    
    console.log(`✅ 更新SQL生成完了: ${sqlPath}\n`);
    console.log(`適用コマンド:`);
    console.log(`  ローカルDB: npx wrangler d1 execute real-estate-200units-db --local --file=${sqlPath}`);
    console.log(`  本番DB: npx wrangler d1 execute real-estate-200units-db --remote --file=${sqlPath}\n`);
  } else {
    console.log(`⚠️ データ品質が基準を満たしていないため、confidence_level更新はスキップされました。`);
    console.log(`問題箇所を修正後、再度検証を実行してください。\n`);
  }
  
  console.log(`========================================\n`);
}).catch(error => {
  console.error(`❌ 検証エラー: ${error.message}`);
  process.exit(1);
});
