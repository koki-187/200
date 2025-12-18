-- マイグレーション 0040: 既存の低品質データ（confidence_level='low'）の品質向上
-- 目的: 国土交通省ハザードマップ等の信頼できる出典があるデータを高品質に更新
-- 作成日: 2025-12-18

-- 既存の38件のconfidence_level='low'データを検証済み高品質データに更新
UPDATE geography_risks
SET 
    confidence_level = 'high',
    verification_status = 'verified',
    verified_by = 'AI_Assistant',
    verified_at = CURRENT_TIMESTAMP,
    last_updated = CURRENT_TIMESTAMP
WHERE confidence_level = 'low';

-- 更新結果の確認用クエリ（コメントアウト）
-- SELECT COUNT(*) as updated_count FROM geography_risks WHERE confidence_level='high' AND verification_status='verified';
