# 残タスクリスト - v3.11.0以降

**最終更新**: 2025-11-19  
**現在のバージョン**: v3.11.0  
**システム状態**: ✅ 全機能正常動作、エラーなし

---

## 📊 現在の実装状況

### ✅ 完了済み（v3.11.0時点）
- 認証システム（JWT、Remember Me）
- 案件管理（CRUD、検索、フィルター）
- ファイル管理（R2統合）
- メッセージング（チャット、@メンション）
- OCR機能（GPT-4 Vision、複数ファイル対応）
- OCR履歴管理
- OCR設定UI
- 地図表示（Geocoding + Leaflet）
- AI提案機能
- メール通知（Resend API）
- プッシュ通知
- バックアップ機能
- 分析・レポート機能
- APIドキュメント（OpenAPI + Scalar）

### 🗑️ 削除済み（v3.11.0）
- ❌ テンプレート機能（土地仕入れ業務に不要と判断）

---

## 🎯 高優先度タスク（次セッション推奨）

### 1. 並列ファイル処理の実装 ⭐⭐⭐
**目的**: 複数ファイルのOCR処理速度を向上

**現状の問題**:
```javascript
// 現在: 順次処理（遅い）
for (const file of files) {
  await processOCR(file);
}
```

**改善案**:
```javascript
// 並列処理（速い）
const results = await Promise.all(
  files.map(file => processOCR(file))
);
```

**注意事項**:
- OpenAI APIレート制限: 60リクエスト/分（無料プラン）
- レート制限超過時の対策: セマフォまたはキュー実装
- 推奨バッチサイズ: 最大10ファイル/バッチ

**推定工数**: 2時間

**実装ファイル**:
- `src/index.tsx`: OCR処理ロジック（3600行付近）
- `src/routes/ocr-jobs.ts`: バックエンド並列処理対応

---

### 2. 進捗状況の永続化UI ⭐⭐⭐
**目的**: ブラウザリロード後も進捗を継続表示

**現状の問題**:
- ブラウザをリロードすると進捗表示が消える
- 長時間OCR処理中にリロードすると状況が分からない

**改善案**:
```javascript
// OCRジョブ開始時
const jobId = response.data.jobId;
localStorage.setItem('currentJobId', jobId);

// ページロード時
const savedJobId = localStorage.getItem('currentJobId');
if (savedJobId) {
  // ジョブステータスをチェック
  const status = await checkJobStatus(savedJobId);
  if (status === 'processing') {
    resumeProgressDisplay(savedJobId);
  } else {
    localStorage.removeItem('currentJobId');
  }
}
```

**推定工数**: 1.5時間

**実装ファイル**:
- `src/index.tsx`: LocalStorage統合、ページロード時のジョブ復元

---

### 3. ジョブキャンセルUI ⭐⭐⭐
**目的**: 実行中のOCRジョブを停止可能にする

**現状**:
- バックエンドAPI: ✅ 実装済み（`DELETE /api/ocr-jobs/:jobId`）
- フロントエンドUI: ❌ 未実装

**改善案**:
```javascript
// 進捗表示セクションに追加
<button id="cancel-job-btn" data-job-id="${jobId}" 
  class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
  <i class="fas fa-times-circle mr-2"></i>キャンセル
</button>

// イベントハンドラー
async function cancelJob(jobId) {
  if (!confirm('OCR処理をキャンセルしますか？')) return;
  
  await axios.delete(`/api/ocr-jobs/${jobId}`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  stopPolling();
  showMessage('✓ ジョブをキャンセルしました');
}
```

**推定工数**: 1時間

**実装ファイル**:
- `src/index.tsx`: キャンセルボタンUI、イベントハンドラー

---

## 🔧 中優先度タスク

### 4. OCR履歴モーダルの改善 ⭐⭐
**目的**: 履歴管理UIの使いやすさ向上

**改善案**:
- 検索機能: 物件名、所在地で検索
- フィルター機能: 信頼度範囲、日付範囲
- ソート機能: 作成日、信頼度
- ページネーション: 大量履歴対応
- 削除機能: 不要な履歴を削除

**推定工数**: 2時間

---

### 5. OCR設定の拡張 ⭐⭐
**目的**: より柔軟なOCR動作設定

**追加設定項目案**:
- タイムアウト設定（デフォルト: 120秒）
- デフォルトファイル形式（PNG/PDF優先度）
- 自動リトライ設定（失敗時の再試行回数）
- OCR言語設定（日本語/英語/自動検出）

**推定工数**: 1.5時間

---

### 6. エラーハンドリングの強化 ⭐⭐
**目的**: ユーザーフレンドリーなエラーメッセージ

**改善案**:
- APIエラーの詳細表示
- リトライボタン追加
- エラーログのダウンロード機能
- エラー時の推奨アクション表示

**推定工数**: 2時間

---

## 🚀 低優先度タスク（将来的な実装）

### 7. WebSocket対応 ⭐
**目的**: ポーリングからプッシュ型通信への移行

**技術要件**:
- Cloudflare Durable Objects（有料機能）
- WebSocket接続管理
- 再接続ロジック
- フォールバック機構（ポーリングへ）

**推定工数**: 8時間

**費用**: Durable Objects使用料が発生

---

### 8. テンプレート機能の再検討 ⭐
**現状**: v3.11.0で削除済み

**再実装の条件**:
- ユーザーから明示的な要望があった場合
- 土地仕入れ業務での利用価値が確認された場合

**推定工数**: 4時間（過去実装を復元）

---

### 9. OCR精度の向上 ⭐
**目的**: OpenAI APIのプロンプト最適化

**改善案**:
- Few-shot learningの活用
- 専門用語辞書の追加
- 手書き文字認識の強化
- 複数ページPDFの文脈理解

**推定工数**: 4時間

---

### 10. モバイルアプリ化 ⭐
**目的**: スマートフォンでの利用体験向上

**技術選択肢**:
- PWA（Progressive Web App）
- React Native
- Capacitor

**推定工数**: 40時間以上

---

## 📈 実装優先度マトリックス

| タスク | 重要度 | 緊急度 | 工数 | 推奨順位 |
|--------|--------|--------|------|---------|
| 並列ファイル処理 | 高 | 高 | 2h | 1 |
| 進捗永続化UI | 高 | 高 | 1.5h | 2 |
| ジョブキャンセルUI | 高 | 高 | 1h | 3 |
| OCR履歴改善 | 中 | 中 | 2h | 4 |
| OCR設定拡張 | 中 | 中 | 1.5h | 5 |
| エラーハンドリング | 中 | 中 | 2h | 6 |
| WebSocket対応 | 低 | 低 | 8h | 7 |
| テンプレート再検討 | 低 | 低 | 4h | 8 |
| OCR精度向上 | 低 | 中 | 4h | 9 |
| モバイルアプリ化 | 低 | 低 | 40h+ | 10 |

---

## 🎯 次セッションの推奨アクション

### 即座に着手可能（高優先度）
1. **ジョブキャンセルUI**（1時間）
   - 最も簡単で即効性が高い
   - バックエンドAPIは実装済み
   
2. **進捗永続化UI**（1.5時間）
   - LocalStorageのみで実装可能
   - UX向上効果が大きい

3. **並列ファイル処理**（2時間）
   - パフォーマンス向上効果が大きい
   - OpenAI APIレート制限に注意

### 合計推定工数: 4.5時間（1セッション）

---

## 📋 実装チェックリスト（次セッション用）

### ジョブキャンセルUI
- [ ] 進捗表示セクションにキャンセルボタンを追加
- [ ] `cancelJob(jobId)` 関数を実装
- [ ] DELETE APIエンドポイントを呼び出し
- [ ] ポーリングを停止
- [ ] 成功メッセージを表示
- [ ] テスト実施（ローカル、本番）

### 進捗永続化UI
- [ ] OCRジョブ開始時に `localStorage.setItem('currentJobId', jobId)` 実装
- [ ] ページロード時に `localStorage.getItem('currentJobId')` チェック
- [ ] ジョブステータスAPIを呼び出し
- [ ] ジョブが進行中なら進捗表示を再開
- [ ] ジョブが完了/失敗ならLocalStorageをクリア
- [ ] テスト実施（リロード後の動作確認）

### 並列ファイル処理
- [ ] `Promise.all()` を使用した並列処理ロジック実装
- [ ] OpenAI APIレート制限チェック機能追加
- [ ] エラーハンドリング強化（部分失敗対応）
- [ ] 進捗表示を複数ジョブ対応に修正
- [ ] テスト実施（複数ファイル、10ファイル）

---

## 💡 技術的考慮事項

### OpenAI APIレート制限対策
```javascript
// セマフォパターン（同時リクエスト数制限）
class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }
  
  async acquire() {
    if (this.count < this.max) {
      this.count++;
      return;
    }
    await new Promise(resolve => this.queue.push(resolve));
  }
  
  release() {
    this.count--;
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      this.count++;
      resolve();
    }
  }
}

// 使用例
const semaphore = new Semaphore(5); // 最大5並列

const results = await Promise.all(
  files.map(async (file) => {
    await semaphore.acquire();
    try {
      return await processOCR(file);
    } finally {
      semaphore.release();
    }
  })
);
```

---

## 🔗 関連ドキュメント

- `/home/user/webapp/HANDOVER_V3.10.0.md` - v3.10.0引き継ぎドキュメント
- `/home/user/webapp/README.md` - プロジェクト概要
- `/home/user/webapp/CHANGELOG.md` - 変更履歴
- `src/routes/ocr-jobs.ts` - OCRジョブ管理API（行203-231: DELETE実装）

---

**作成日**: 2025-11-19  
**作成者**: AI Assistant  
**対象バージョン**: v3.11.0+  
**ステータス**: ✅ 最新
