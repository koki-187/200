/**
 * データベース品質ファクトチェックスクリプト（拡張版）
 * v3.153.126 - 実際のD1データベースに接続して品質検証
 * 
 * 使用方法:
 *   # ローカルDB
 *   node scripts/fact-check-database-quality.cjs --local
 *   
 *   # 本番DB
 *   node scripts/fact-check-database-quality.cjs --remote
 * 
 * 機能:
 *   1. D1データベースから実データを取得
 *   2. データ品質指標を計算
 *   3. 矛盾・異常データを検出
 *   4. 詳細ファクトチェックレポート生成
 *   5. データ品質ダッシュボード情報出力
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// コマンドライン引数の解析
const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const isLocal = args.includes('--local') || !isRemote;
const environment = isLocal ? 'local' : 'remote';
const envFlag = isLocal ? '--local' : '--remote';

console.log(`[Database Fact Check] ${environment}環境のデータベース品質検証を開始...\n`);

const DB_NAME = 'real-estate-200units-db';

/**
 * D1データベースにクエリを実行
 */
function queryD1(sql) {
  try {
    const command = `cd /home/user/webapp && npx wrangler d1 execute ${DB_NAME} ${envFlag} --command="${sql}"`;
    const output = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    
    // JSON部分を抽出
    const jsonMatch = output.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('⚠️  クエリ結果のJSON解析失敗');
      return null;
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return result[0]?.results || [];
  } catch (error) {
    console.error(`❌ クエリ実行エラー: ${error.message}`);
    return null;
  }
}

/**
 * データ品質サマリーを取得
 */
function getDataQualitySummary() {
  console.log('[Step 1] データ品質サマリー取得中...\n');
  
  const sql = 'SELECT * FROM v_data_quality_summary';
  const results = queryD1(sql);
  
  if (!results) {
    console.error('⚠️  データ品質サマリー取得失敗\n');
    return null;
  }
  
  console.log('✅ データ品質サマリー取得完了\n');
  return results;
}

/**
 * ハザードデータの詳細統計を取得
 */
function getHazardStatistics() {
  console.log('[Step 2] ハザードデータ統計取得中...\n');
  
  const queries = {
    total: 'SELECT COUNT(*) as count FROM hazard_info',
    byType: 'SELECT hazard_type, COUNT(*) as count FROM hazard_info GROUP BY hazard_type',
    byRiskLevel: 'SELECT risk_level, COUNT(*) as count FROM hazard_info GROUP BY risk_level',
    byConfidence: 'SELECT confidence_level, COUNT(*) as count FROM hazard_info GROUP BY confidence_level',
    byVerificationStatus: 'SELECT verification_status, COUNT(*) as count FROM hazard_info GROUP BY verification_status',
    byPrefecture: 'SELECT prefecture, COUNT(*) as count FROM hazard_info GROUP BY prefecture',
  };
  
  const stats = {};
  
  for (const [key, sql] of Object.entries(queries)) {
    const results = queryD1(sql);
    if (results) {
      stats[key] = results;
      console.log(`  ✅ ${key}: ${results.length}件`);
    }
  }
  
  console.log('\n✅ ハザードデータ統計取得完了\n');
  return stats;
}

/**
 * データ品質スコアを計算
 */
function calculateQualityScore(qualitySummary, stats) {
  console.log('[Step 3] データ品質スコア計算中...\n');
  
  const scores = {
    accuracy: 0,      // データ正確性 (30点満点)
    completeness: 0,  // データ完全性 (20点満点)
    verification: 0,  // データ検証 (20点満点)
    freshness: 0,     // データ鮮度 (15点満点)
    consistency: 0,   // データ整合性 (15点満点)
  };
  
  // 1. データ正確性（confidence_levelベース）
  const hazardInfo = qualitySummary.find(s => s.table_name === 'hazard_info');
  if (hazardInfo) {
    if (hazardInfo.confidence_level === 'high') {
      scores.accuracy = 30;
    } else if (hazardInfo.confidence_level === 'medium') {
      scores.accuracy = 15;
    } else if (hazardInfo.confidence_level === 'low') {
      scores.accuracy = 5;
    }
  }
  
  // 2. データ完全性（レコード数ベース）
  const totalHazards = stats.total[0]?.count || 0;
  const expectedMinimum = 184 * 2; // 最低2種類のハザード × 184市区町村
  if (totalHazards >= expectedMinimum) {
    scores.completeness = 20;
  } else {
    scores.completeness = Math.floor((totalHazards / expectedMinimum) * 20);
  }
  
  // 3. データ検証（verification_statusベース）
  if (hazardInfo) {
    if (hazardInfo.verification_status === 'verified') {
      scores.verification = 20;
    } else if (hazardInfo.verification_status === 'pending') {
      scores.verification = 5;
    }
  }
  
  // 4. データ鮮度（暫定: mediumの場合は5点）
  if (hazardInfo && hazardInfo.confidence_level !== 'pending') {
    scores.freshness = 5;
  }
  
  // 5. データ整合性（暫定: conflict がない場合は10点）
  if (hazardInfo && hazardInfo.verification_status !== 'conflict') {
    scores.consistency = 10;
  }
  
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  
  console.log('📊 品質スコア:');
  console.log(`  - データ正確性: ${scores.accuracy}/30`);
  console.log(`  - データ完全性: ${scores.completeness}/20`);
  console.log(`  - データ検証: ${scores.verification}/20`);
  console.log(`  - データ鮮度: ${scores.freshness}/15`);
  console.log(`  - データ整合性: ${scores.consistency}/15`);
  console.log(`  - 合計スコア: ${totalScore}/100\n`);
  
  return { scores, totalScore };
}

/**
 * 問題点を特定
 */
function identifyIssues(qualitySummary, stats) {
  console.log('[Step 4] 問題点の特定中...\n');
  
  const issues = [];
  
  // confidence_level が low の場合
  const lowConfidenceData = qualitySummary.filter(s => s.confidence_level === 'low');
  if (lowConfidenceData.length > 0) {
    lowConfidenceData.forEach(data => {
      issues.push({
        severity: 'CRITICAL',
        type: 'LOW_CONFIDENCE',
        title: `${data.table_name}テーブルに低品質データ存在`,
        description: `${data.record_count}件のデータが confidence_level='low' です`,
        impact: '実際のリスク評価と異なる可能性',
        affectedRecords: data.record_count,
      });
    });
  }
  
  // verification_status が pending の場合
  const pendingVerification = qualitySummary.filter(s => s.verification_status === 'pending');
  if (pendingVerification.length > 0) {
    pendingVerification.forEach(data => {
      issues.push({
        severity: 'HIGH',
        type: 'PENDING_VERIFICATION',
        title: `${data.table_name}テーブルの検証待ち`,
        description: `${data.record_count}件のデータが検証待ちです`,
        impact: 'データの正確性が未確認',
        affectedRecords: data.record_count,
      });
    });
  }
  
  // ハザードタイプ別の偏りをチェック
  const hazardTypes = stats.byType || [];
  const avgCount = hazardTypes.reduce((sum, h) => sum + h.count, 0) / hazardTypes.length;
  hazardTypes.forEach(h => {
    if (h.count < avgCount * 0.5) {
      issues.push({
        severity: 'MEDIUM',
        type: 'IMBALANCED_DISTRIBUTION',
        title: `${h.hazard_type}のデータ不足`,
        description: `${h.hazard_type}タイプのデータが平均の50%以下です`,
        impact: '特定ハザードの評価が不正確',
        affectedRecords: h.count,
      });
    }
  });
  
  console.log(`✅ ${issues.length}件の問題を検出\n`);
  return issues;
}

/**
 * 推奨事項を生成
 */
function generateRecommendations(issues, qualityScore) {
  console.log('[Step 5] 推奨事項の生成中...\n');
  
  const recommendations = [];
  
  // スコアが50未満の場合
  if (qualityScore.totalScore < 50) {
    recommendations.push({
      priority: 'CRITICAL',
      title: '国交省APIからの正確なデータ取得',
      description: '現在のデータを国交省ハザードマップAPIから取得した正確なデータに置き換える',
      estimatedEffort: '8-12時間',
      steps: [
        '1. MLIT API Key設定（.dev.vars）',
        '2. comprehensive-check APIの活用',
        '3. データ収集スクリプト実行',
        '4. マイグレーション適用',
        '5. E2Eテスト実施',
      ],
    });
  }
  
  // pending データが多い場合
  const hasPendingIssues = issues.some(i => i.type === 'PENDING_VERIFICATION');
  if (hasPendingIssues) {
    recommendations.push({
      priority: 'HIGH',
      title: 'データ検証プロセスの実装',
      description: 'pending データに対してファクトチェックを実施',
      estimatedEffort: '4-6時間',
      steps: [
        '1. 複数データソース比較ロジック実装',
        '2. データ矛盾検出アルゴリズム',
        '3. 自動検証スクリプト作成',
        '4. 手動確認フローの構築',
      ],
    });
  }
  
  // データ不足がある場合
  const hasImbalancedData = issues.some(i => i.type === 'IMBALANCED_DISTRIBUTION');
  if (hasImbalancedData) {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'データカバレッジの拡充',
      description: '不足しているハザードタイプのデータを補充',
      estimatedEffort: '2-3時間',
      steps: [
        '1. 不足ハザードタイプの特定',
        '2. 追加データ収集スクリプト実行',
        '3. データ品質確認',
      ],
    });
  }
  
  console.log(`✅ ${recommendations.length}件の推奨事項を生成\n`);
  return recommendations;
}

/**
 * レポート生成
 */
function generateReport(qualitySummary, stats, qualityScore, issues, recommendations) {
  console.log('[Step 6] レポート生成中...\n');
  
  const totalHazards = stats.total[0]?.count || 0;
  
  let ratingEmoji = '⚠️';
  let ratingText = '要改善';
  if (qualityScore.totalScore >= 80) {
    ratingEmoji = '✅';
    ratingText = '優良';
  } else if (qualityScore.totalScore >= 60) {
    ratingEmoji = '🟡';
    ratingText = '良好';
  }
  
  const report = `# データベース品質ファクトチェックレポート

**生成日時**: ${new Date().toISOString()}
**バージョン**: v3.153.126
**対象環境**: ${environment.toUpperCase()}
**データベース**: ${DB_NAME}

---

## 📊 エグゼクティブサマリー

### 総合評価: ${ratingEmoji} **${ratingText}（${qualityScore.totalScore}/100点）**

| 評価項目 | スコア | 詳細 |
|---------|-------|------|
| データ正確性 | ${qualityScore.scores.accuracy}/30 | ${qualityScore.scores.accuracy >= 20 ? '高精度' : qualityScore.scores.accuracy >= 10 ? '中精度' : '低精度'} |
| データ完全性 | ${qualityScore.scores.completeness}/20 | ${qualityScore.scores.completeness >= 15 ? '完全' : qualityScore.scores.completeness >= 10 ? 'ほぼ完全' : '不完全'} |
| データ検証 | ${qualityScore.scores.verification}/20 | ${qualityScore.scores.verification >= 15 ? '検証済み' : qualityScore.scores.verification >= 5 ? '一部検証' : '未検証'} |
| データ鮮度 | ${qualityScore.scores.freshness}/15 | ${qualityScore.scores.freshness >= 10 ? '最新' : qualityScore.scores.freshness >= 5 ? '普通' : '古い'} |
| データ整合性 | ${qualityScore.scores.consistency}/15 | ${qualityScore.scores.consistency >= 10 ? '整合性あり' : '要確認'} |

---

## 📈 データ統計

### 全体統計
- **ハザードレコード総数**: ${totalHazards}件
- **データ品質テーブル数**: ${qualitySummary.length}

### データ品質内訳
${qualitySummary.map(s => `
#### ${s.table_name}
- **信頼度**: ${s.confidence_level}
- **検証ステータス**: ${s.verification_status}
- **レコード数**: ${s.record_count}
- **割合**: ${s.percentage}%
`).join('\n')}

### ハザードタイプ別分布
${stats.byType ? stats.byType.map(h => `- **${h.hazard_type}**: ${h.count}件`).join('\n') : 'データなし'}

### リスクレベル別分布
${stats.byRiskLevel ? stats.byRiskLevel.map(r => `- **${r.risk_level}**: ${r.count}件`).join('\n') : 'データなし'}

### 都道府県別分布
${stats.byPrefecture ? stats.byPrefecture.map(p => `- **${p.prefecture}**: ${p.count}件`).join('\n') : 'データなし'}

---

## 🚨 検出された問題

${issues.length > 0 ? issues.map((issue, i) => `
### ${i + 1}. ${issue.title} [${issue.severity}]

**種類**: ${issue.type}
**説明**: ${issue.description}
**影響**: ${issue.impact}
**影響レコード数**: ${issue.affectedRecords}
`).join('\n') : '✅ 重大な問題は検出されませんでした'}

---

## 💡 推奨事項

${recommendations.length > 0 ? recommendations.map((rec, i) => `
### ${i + 1}. ${rec.title} [優先度: ${rec.priority}]

**説明**: ${rec.description}
**推定工数**: ${rec.estimatedEffort}

**実装ステップ**:
${rec.steps.map(step => `- ${step}`).join('\n')}
`).join('\n') : '✅ 現時点で改善推奨事項はありません'}

---

## 🎯 次のアクション

### 最優先タスク
${qualityScore.totalScore < 50 ? `
1. ⏳ 国交省APIからの正確なデータ取得実装
2. ⏳ データベース更新（サンプル → 正確なデータ）
3. ⏳ E2Eテスト再実施
` : `
1. ✅ データ品質は許容範囲内
2. ⏳ 定期的なデータ更新プロセス構築
3. ⏳ 継続的なモニタリング実装
`}

### 推奨タスク
1. ⏳ データ品質ダッシュボード構築
2. ⏳ 自動ファクトチェックシステム実装
3. ⏳ データ異常検知アラート機能

---

## ⚠️ 重要な注意事項

${qualityScore.totalScore < 50 ? `
**本番運用リスク**:
- データ品質スコアが50点未満です
- 正確なデータへの置換が推奨されます
- 融資判定の精度に影響する可能性があります

**本番運用前に必須**:
- 国交省APIからの正確なデータ取得
- ファクトチェック実施
- E2Eテスト合格
` : `
**運用ガイドライン**:
- データ品質は許容範囲内です
- 定期的なデータ更新を推奨します
- 継続的なモニタリングが重要です
`}

---

**レポート生成者**: AI Assistant (Database Fact Check System v3.153.126)
**生成スクリプト**: /home/user/webapp/scripts/fact-check-database-quality.cjs
**次回実行推奨**: ${qualityScore.totalScore < 50 ? 'データ更新後' : '月次'}
`;

  const filename = `DATABASE_FACT_CHECK_REPORT_${environment}_v3.153.126.md`;
  const reportPath = path.join(__dirname, '..', filename);
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  console.log(`✅ レポート生成完了: ${reportPath}\n`);
  
  return reportPath;
}

/**
 * コンソールサマリー出力
 */
function printSummary(qualityScore, issues, recommendations, reportPath) {
  console.log('========================================');
  console.log(`データベース品質ファクトチェック結果 (${environment})`);
  console.log('========================================\n');
  
  let ratingEmoji = '⚠️';
  let ratingText = '要改善';
  if (qualityScore.totalScore >= 80) {
    ratingEmoji = '✅';
    ratingText = '優良';
  } else if (qualityScore.totalScore >= 60) {
    ratingEmoji = '🟡';
    ratingText = '良好';
  }
  
  console.log(`${ratingEmoji} 総合評価: ${ratingText}（${qualityScore.totalScore}/100点）\n`);
  
  console.log('📊 品質スコア内訳:');
  console.log(`  - データ正確性: ${qualityScore.scores.accuracy}/30`);
  console.log(`  - データ完全性: ${qualityScore.scores.completeness}/20`);
  console.log(`  - データ検証: ${qualityScore.scores.verification}/20`);
  console.log(`  - データ鮮度: ${qualityScore.scores.freshness}/15`);
  console.log(`  - データ整合性: ${qualityScore.scores.consistency}/15\n`);
  
  console.log(`🚨 検出された問題: ${issues.length}件`);
  if (issues.length > 0) {
    issues.slice(0, 3).forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.severity}] ${issue.title}`);
    });
    if (issues.length > 3) {
      console.log(`  ... 他${issues.length - 3}件`);
    }
  }
  console.log();
  
  console.log(`💡 推奨事項: ${recommendations.length}件`);
  if (recommendations.length > 0) {
    recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. [${rec.priority}] ${rec.title}`);
    });
  }
  console.log();
  
  console.log(`📄 詳細レポート: ${reportPath}\n`);
  
  console.log('========================================');
  console.log('✅ データベース品質ファクトチェック完了');
  console.log('========================================\n');
}

/**
 * メイン実行
 */
function main() {
  try {
    // Step 1: データ品質サマリー取得
    const qualitySummary = getDataQualitySummary();
    if (!qualitySummary) {
      throw new Error('データ品質サマリー取得失敗');
    }
    
    // Step 2: ハザードデータ統計取得
    const stats = getHazardStatistics();
    
    // Step 3: 品質スコア計算
    const qualityScore = calculateQualityScore(qualitySummary, stats);
    
    // Step 4: 問題点特定
    const issues = identifyIssues(qualitySummary, stats);
    
    // Step 5: 推奨事項生成
    const recommendations = generateRecommendations(issues, qualityScore);
    
    // Step 6: レポート生成
    const reportPath = generateReport(qualitySummary, stats, qualityScore, issues, recommendations);
    
    // Step 7: サマリー出力
    printSummary(qualityScore, issues, recommendations, reportPath);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// メイン実行
main();
