#!/usr/bin/env node

/**
 * ハザードデータ検証スクリプト v3.153.128
 * 
 * データ品質改善のための検証ロジック:
 * 1. 地理的特性との整合性チェック
 * 2. リスクレベル分布の妥当性チェック
 * 3. データ完全性チェック
 * 4. confidence_level の更新（検証済み → 'high'）
 */

const fs = require('fs');
const path = require('path');

// 地理的特性データベース
const GEOGRAPHICAL_DATA = {
  coastal: {
    '東京都': ['港区', '品川区', '大田区', '江東区', '江戸川区'],
    '神奈川県': [
      '横浜市鶴見区', '横浜市神奈川区', '横浜市西区', '横浜市中区', 
      '横浜市南区', '横浜市港南区', '横浜市磯子区', '横浜市金沢区',
      '川崎市川崎区', '川崎市幸区', '横須賀市', '鎌倉市', '逗子市', 
      '三浦市', '葉山町'
    ],
    '千葉県': [
      '千葉市中央区', '千葉市稲毛区', '千葉市美浜区', '市川市', 
      '船橋市', '木更津市', '浦安市', '習志野市', '市原市', '館山市',
      '銚子市', '鴨川市', '南房総市', '富津市', 'いすみ市', '勝浦市'
    ],
    '埼玉県': [] // 内陸県
  },
  
  mountainous: {
    '東京都': ['青梅市', '奥多摩町', '檜原村', '八王子市', 'あきる野市'],
    '神奈川県': ['相模原市緑区', '秦野市', '伊勢原市', '厚木市', '南足柄市', '箱根町', '真鶴町', '湯河原町', '清川村'],
    '埼玉県': ['秩父市', '飯能市', '日高市', '毛呂山町', '越生町', '小鹿野町', '東秩父村', '長瀞町', '皆野町', '横瀬町'],
    '千葉県': ['君津市', '富津市', '鴨川市', '南房総市', '館山市']
  },
  
  riverside: {
    '東京都': ['墨田区', '江東区', '葛飾区', '江戸川区', '足立区', '荒川区', '北区', '板橋区'],
    '神奈川県': ['川崎市川崎区', '川崎市幸区', '川崎市中原区', '横浜市鶴見区', '横浜市港北区'],
    '埼玉県': [
      'さいたま市桜区', 'さいたま市南区', 'さいたま市緑区',
      '川口市', '戸田市', '蕨市', '草加市', '八潮市', '三郷市', 
      '吉川市', '越谷市', '春日部市', '久喜市'
    ],
    '千葉県': ['市川市', '松戸市', '野田市', '流山市', '我孫子市', '柏市']
  },
  
  urban: {
    '東京都': [
      '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', 
      '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区',
      '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区',
      '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区'
    ],
    '神奈川県': [
      '横浜市西区', '横浜市中区', '横浜市神奈川区', '横浜市鶴見区',
      '川崎市川崎区', '川崎市幸区', '川崎市中原区', '川崎市高津区'
    ],
    '埼玉県': [
      'さいたま市大宮区', 'さいたま市浦和区', 'さいたま市中央区',
      '川口市', '越谷市', '川越市', '所沢市'
    ],
    '千葉県': [
      '千葉市中央区', '千葉市美浜区', '船橋市', '市川市', '松戸市', '柏市'
    ]
  }
};

// 地理的特性チェック関数
function isCoastalCity(pref, city) {
  return GEOGRAPHICAL_DATA.coastal[pref]?.some(c => city.includes(c)) || false;
}

function isMountainousCity(pref, city) {
  return GEOGRAPHICAL_DATA.mountainous[pref]?.some(c => city.includes(c)) || false;
}

function isRiversideCity(pref, city) {
  return GEOGRAPHICAL_DATA.riverside[pref]?.some(c => city.includes(c)) || false;
}

function isUrbanCity(pref, city) {
  return GEOGRAPHICAL_DATA.urban[pref]?.some(c => city.includes(c)) || false;
}

// 1. 地理的特性との整合性チェック
function verifyGeographicalConsistency(hazard) {
  const { prefecture, city, hazard_type, risk_level } = hazard;
  const issues = [];
  
  const isCoastal = isCoastalCity(prefecture, city);
  const isMountainous = isMountainousCity(prefecture, city);
  const isRiverside = isRiversideCity(prefecture, city);
  
  // 津波リスク: 沿岸部のみ妥当
  if (hazard_type === 'tsunami') {
    if (risk_level !== 'none' && !isCoastal) {
      issues.push({
        severity: 'high',
        message: `内陸部（${prefecture}${city}）で津波リスク${risk_level}は不整合`,
        recommendation: 'risk_level を none に変更'
      });
    }
    if (risk_level === 'none' && isCoastal) {
      // 沿岸部でnoneは許容（低地でない場合）
    }
  }
  
  // 土砂災害リスク: 山間部で高リスクが妥当
  if (hazard_type === 'landslide') {
    if (risk_level === 'high' && !isMountainous) {
      issues.push({
        severity: 'medium',
        message: `平地（${prefecture}${city}）で土砂災害高リスクは不整合`,
        recommendation: 'risk_level を low または medium に変更'
      });
    }
  }
  
  // 洪水リスク: 河川沿いで高リスクが妥当
  if (hazard_type === 'flood') {
    if (risk_level === 'high' && !isRiverside && !isCoastal) {
      issues.push({
        severity: 'low',
        message: `河川や沿岸から離れた地域（${prefecture}${city}）で洪水高リスクはやや不整合`,
        recommendation: 'データ再確認推奨'
      });
    }
  }
  
  // 液状化リスク: 沿岸部・埋立地で高リスクが妥当
  if (hazard_type === 'liquefaction') {
    if (risk_level === 'high' && !isCoastal && !isRiverside) {
      issues.push({
        severity: 'medium',
        message: `沿岸部や河川沿いでない地域（${prefecture}${city}）で液状化高リスクは不整合`,
        recommendation: 'risk_level を low または medium に変更'
      });
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

// 2. リスクレベル分布の妥当性チェック
function verifyCityRiskDistribution(cityHazards) {
  const distribution = {
    none: 0,
    low: 0,
    medium: 0,
    high: 0
  };
  
  cityHazards.forEach(h => {
    distribution[h.risk_level]++;
  });
  
  const total = cityHazards.length;
  const ratios = {
    none: distribution.none / total,
    low: distribution.low / total,
    medium: distribution.medium / total,
    high: distribution.high / total
  };
  
  const issues = [];
  
  // 全てが高リスクは不自然
  if (ratios.high > 0.75) {
    issues.push({
      severity: 'high',
      message: `高リスクの割合が異常に高い（${(ratios.high * 100).toFixed(1)}%）`,
      recommendation: 'リスク評価を再検討'
    });
  }
  
  // 全てがリスクなしも不自然（データ不足の可能性）
  if (ratios.none > 0.9) {
    issues.push({
      severity: 'medium',
      message: `リスクなしの割合が異常に高い（${(ratios.none * 100).toFixed(1)}%）`,
      recommendation: 'データ不足の可能性、追加調査推奨'
    });
  }
  
  return {
    valid: issues.length === 0,
    distribution,
    ratios,
    issues
  };
}

// 3. データ完全性チェック
function verifyDataCompleteness(cityHazards) {
  const requiredTypes = ['flood', 'landslide', 'tsunami', 'liquefaction'];
  const existingTypes = new Set(cityHazards.map(h => h.hazard_type));
  const issues = [];
  
  for (const type of requiredTypes) {
    if (!existingTypes.has(type)) {
      issues.push({
        severity: 'high',
        message: `${type}データが不足`,
        recommendation: `${type}のハザードデータを追加`
      });
    }
  }
  
  return {
    valid: issues.length === 0,
    existingTypes: Array.from(existingTypes),
    missingTypes: requiredTypes.filter(t => !existingTypes.has(t)),
    issues
  };
}

// メイン検証関数
async function verifyHazardData(hazardsData) {
  console.log('🔍 ハザードデータ検証開始...\n');
  
  // 市区町村ごとにグループ化
  const citiesData = {};
  hazardsData.forEach(hazard => {
    const key = `${hazard.prefecture}${hazard.city}`;
    if (!citiesData[key]) {
      citiesData[key] = [];
    }
    citiesData[key].push(hazard);
  });
  
  const verificationResults = {
    totalHazards: hazardsData.length,
    totalCities: Object.keys(citiesData).length,
    verifiedHazards: 0,
    issuesFound: 0,
    highSeverityIssues: 0,
    mediumSeverityIssues: 0,
    lowSeverityIssues: 0,
    cities: {}
  };
  
  // 各市区町村のデータを検証
  for (const [cityKey, cityHazards] of Object.entries(citiesData)) {
    const cityResult = {
      hazards: cityHazards.length,
      allIssues: [],
      consistencyCheck: [],
      distributionCheck: null,
      completenessCheck: null
    };
    
    // 1. 各ハザードの地理的整合性チェック
    cityHazards.forEach(hazard => {
      const consistency = verifyGeographicalConsistency(hazard);
      if (!consistency.valid) {
        cityResult.consistencyCheck.push({
          hazard: `${hazard.hazard_type} (${hazard.risk_level})`,
          issues: consistency.issues
        });
        cityResult.allIssues.push(...consistency.issues);
      }
    });
    
    // 2. リスクレベル分布チェック
    const distribution = verifyCityRiskDistribution(cityHazards);
    cityResult.distributionCheck = distribution;
    if (!distribution.valid) {
      cityResult.allIssues.push(...distribution.issues);
    }
    
    // 3. データ完全性チェック
    const completeness = verifyDataCompleteness(cityHazards);
    cityResult.completenessCheck = completeness;
    if (!completeness.valid) {
      cityResult.allIssues.push(...completeness.issues);
    }
    
    // 問題カウント
    cityResult.allIssues.forEach(issue => {
      verificationResults.issuesFound++;
      if (issue.severity === 'high') verificationResults.highSeverityIssues++;
      if (issue.severity === 'medium') verificationResults.mediumSeverityIssues++;
      if (issue.severity === 'low') verificationResults.lowSeverityIssues++;
    });
    
    // 検証済みカウント（問題なしまたは低重要度のみ）
    if (cityResult.allIssues.filter(i => i.severity === 'high' || i.severity === 'medium').length === 0) {
      verificationResults.verifiedHazards += cityHazards.length;
    }
    
    verificationResults.cities[cityKey] = cityResult;
  }
  
  return verificationResults;
}

// レポート生成
function generateVerificationReport(results) {
  let report = `# ハザードデータ検証レポート v3.153.128\n\n`;
  report += `**生成日時**: ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;
  
  // サマリー
  report += `## 📊 検証サマリー\n\n`;
  report += `- **総ハザードデータ数**: ${results.totalHazards}件\n`;
  report += `- **対象市区町村数**: ${results.totalCities}市区町村\n`;
  report += `- **検証済みデータ数**: ${results.verifiedHazards}件 (${(results.verifiedHazards / results.totalHazards * 100).toFixed(1)}%)\n`;
  report += `- **問題発見数**: ${results.issuesFound}件\n`;
  report += `  - 🔴 HIGH: ${results.highSeverityIssues}件\n`;
  report += `  - 🟡 MEDIUM: ${results.mediumSeverityIssues}件\n`;
  report += `  - 🟢 LOW: ${results.lowSeverityIssues}件\n\n`;
  
  // 品質評価
  const verifiedRatio = results.verifiedHazards / results.totalHazards;
  let qualityLevel = 'low';
  let qualityText = '要改善';
  let confidenceLevel = 'low';
  
  if (verifiedRatio >= 0.9) {
    qualityLevel = 'high';
    qualityText = '高品質';
    confidenceLevel = 'high';
  } else if (verifiedRatio >= 0.7) {
    qualityLevel = 'medium';
    qualityText = '中品質';
    confidenceLevel = 'high';
  } else if (verifiedRatio >= 0.5) {
    qualityLevel = 'medium';
    qualityText = '中品質';
    confidenceLevel = 'medium';
  }
  
  report += `## 🎯 品質評価\n\n`;
  report += `- **データ品質レベル**: ${qualityText} (${qualityLevel})\n`;
  report += `- **推奨 confidence_level**: ${confidenceLevel}\n`;
  report += `- **検証済み割合**: ${(verifiedRatio * 100).toFixed(1)}%\n\n`;
  
  if (verifiedRatio >= 0.7) {
    report += `✅ **データ品質は良好です。confidence_level を 'high' に更新することを推奨します。**\n\n`;
  } else if (verifiedRatio >= 0.5) {
    report += `⚠️ **データ品質は許容範囲内ですが、改善の余地があります。confidence_level を 'medium' に維持し、問題箇所の修正を推奨します。**\n\n`;
  } else {
    report += `❌ **データ品質が低いです。問題箇所の修正が必須です。confidence_level は 'low' に設定してください。**\n\n`;
  }
  
  // 問題がある市区町村の詳細
  if (results.issuesFound > 0) {
    report += `## 🚨 問題が発見された市区町村\n\n`;
    
    const citiesWithIssues = Object.entries(results.cities)
      .filter(([_, cityResult]) => cityResult.allIssues.length > 0)
      .sort((a, b) => {
        const aHighIssues = a[1].allIssues.filter(i => i.severity === 'high').length;
        const bHighIssues = b[1].allIssues.filter(i => i.severity === 'high').length;
        return bHighIssues - aHighIssues;
      })
      .slice(0, 20); // 上位20件
    
    citiesWithIssues.forEach(([cityKey, cityResult]) => {
      const highIssues = cityResult.allIssues.filter(i => i.severity === 'high');
      const mediumIssues = cityResult.allIssues.filter(i => i.severity === 'medium');
      const lowIssues = cityResult.allIssues.filter(i => i.severity === 'low');
      
      report += `### ${cityKey}\n\n`;
      report += `- ハザードデータ数: ${cityResult.hazards}件\n`;
      report += `- 問題数: ${cityResult.allIssues.length}件 (🔴${highIssues.length} 🟡${mediumIssues.length} 🟢${lowIssues.length})\n\n`;
      
      if (highIssues.length > 0) {
        report += `**🔴 HIGH 重要度の問題:**\n\n`;
        highIssues.forEach(issue => {
          report += `- ${issue.message}\n`;
          report += `  - 推奨対応: ${issue.recommendation}\n`;
        });
        report += `\n`;
      }
      
      if (mediumIssues.length > 0 && highIssues.length < 3) {
        report += `**🟡 MEDIUM 重要度の問題:**\n\n`;
        mediumIssues.slice(0, 3).forEach(issue => {
          report += `- ${issue.message}\n`;
          report += `  - 推奨対応: ${issue.recommendation}\n`;
        });
        report += `\n`;
      }
    });
  }
  
  // 推奨アクション
  report += `## 💡 推奨アクション\n\n`;
  
  if (results.highSeverityIssues > 0) {
    report += `### 1. HIGH重要度の問題を修正（必須）\n\n`;
    report += `${results.highSeverityIssues}件の重要な問題が検出されました。これらはデータの信頼性に大きく影響するため、優先的に修正してください。\n\n`;
  }
  
  if (verifiedRatio >= 0.7) {
    report += `### 2. confidence_level を 'high' に更新\n\n`;
    report += `検証済みデータが${(verifiedRatio * 100).toFixed(1)}%に達しています。以下のSQLで更新できます:\n\n`;
    report += '```sql\n';
    report += `UPDATE hazard_info SET confidence_level = 'high' WHERE verification_status = 'verified';\n`;
    report += '```\n\n';
  }
  
  if (results.mediumSeverityIssues > 0) {
    report += `### 3. MEDIUM重要度の問題を確認\n\n`;
    report += `${results.mediumSeverityIssues}件の中程度の問題が検出されました。時間があれば修正を検討してください。\n\n`;
  }
  
  report += `---\n\n`;
  report += `**生成ツール**: verify-hazard-data.cjs v3.153.128\n`;
  report += `**生成日時**: ${new Date().toISOString()}\n`;
  
  return report;
}

// スクリプト実行
if (require.main === module) {
  console.log('ハザードデータ検証スクリプト v3.153.128\n');
  
  // サンプルデータでテスト（実際にはDBから取得）
  const sampleData = [
    // 東京都渋谷区（都市部、内陸）
    { prefecture: '東京都', city: '渋谷区', hazard_type: 'flood', risk_level: 'medium' },
    { prefecture: '東京都', city: '渋谷区', hazard_type: 'landslide', risk_level: 'low' },
    { prefecture: '東京都', city: '渋谷区', hazard_type: 'tsunami', risk_level: 'none' },
    { prefecture: '東京都', city: '渋谷区', hazard_type: 'liquefaction', risk_level: 'low' },
    
    // 神奈川県横浜市西区（都市部、沿岸）
    { prefecture: '神奈川県', city: '横浜市西区', hazard_type: 'flood', risk_level: 'medium' },
    { prefecture: '神奈川県', city: '横浜市西区', hazard_type: 'landslide', risk_level: 'low' },
    { prefecture: '神奈川県', city: '横浜市西区', hazard_type: 'tsunami', risk_level: 'low' },
    { prefecture: '神奈川県', city: '横浜市西区', hazard_type: 'liquefaction', risk_level: 'medium' },
    
    // 埼玉県秩父市（山間部）
    { prefecture: '埼玉県', city: '秩父市', hazard_type: 'flood', risk_level: 'low' },
    { prefecture: '埼玉県', city: '秩父市', hazard_type: 'landslide', risk_level: 'high' },
    { prefecture: '埼玉県', city: '秩父市', hazard_type: 'tsunami', risk_level: 'none' },
    { prefecture: '埼玉県', city: '秩父市', hazard_type: 'liquefaction', risk_level: 'none' },
  ];
  
  verifyHazardData(sampleData).then(results => {
    const report = generateVerificationReport(results);
    
    // レポート保存
    const reportPath = path.join(__dirname, '..', 'HAZARD_VERIFICATION_REPORT_v3.153.128.md');
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log(`\n✅ 検証完了！`);
    console.log(`📄 レポート: ${reportPath}\n`);
    console.log(report);
  });
}

module.exports = {
  verifyHazardData,
  generateVerificationReport,
  verifyGeographicalConsistency,
  verifyCityRiskDistribution,
  verifyDataCompleteness
};
