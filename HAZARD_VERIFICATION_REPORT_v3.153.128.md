# ハザードデータ検証レポート v3.153.128

**生成日時**: 2025-12-18T18:33:34.075Z

---

## 📊 検証サマリー

- **総ハザードデータ数**: 12件
- **対象市区町村数**: 3市区町村
- **検証済みデータ数**: 12件 (100.0%)
- **問題発見数**: 0件
  - 🔴 HIGH: 0件
  - 🟡 MEDIUM: 0件
  - 🟢 LOW: 0件

## 🎯 品質評価

- **データ品質レベル**: 高品質 (high)
- **推奨 confidence_level**: high
- **検証済み割合**: 100.0%

✅ **データ品質は良好です。confidence_level を 'high' に更新することを推奨します。**

## 💡 推奨アクション

### 2. confidence_level を 'high' に更新

検証済みデータが100.0%に達しています。以下のSQLで更新できます:

```sql
UPDATE hazard_info SET confidence_level = 'high' WHERE verification_status = 'verified';
```

---

**生成ツール**: verify-hazard-data.cjs v3.153.128
**生成日時**: 2025-12-18T18:33:34.076Z
