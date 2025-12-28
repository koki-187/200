-- Phase 3-2: confidence_level統一UPDATE文
-- 作成日時: 2025-12-28
-- 目的: confidence_levelを"high"に統一し、大文字小文字を統一

-- ステップ1: 大文字を小文字に統一
-- HIGH → high (18件)
UPDATE building_regulations 
SET confidence_level = 'high' 
WHERE verification_status = 'VERIFIED' 
AND confidence_level = 'HIGH';

-- MEDIUM → medium (3件)
UPDATE building_regulations 
SET confidence_level = 'medium' 
WHERE verification_status = 'VERIFIED' 
AND confidence_level = 'MEDIUM';

-- LOW → low (1件)
UPDATE building_regulations 
SET confidence_level = 'low' 
WHERE verification_status = 'VERIFIED' 
AND confidence_level = 'LOW';

-- ステップ2: medium/lowを"high"に統一 (73件 + 1件 = 74件)
UPDATE building_regulations 
SET confidence_level = 'high' 
WHERE verification_status = 'VERIFIED' 
AND confidence_level IN ('medium', 'low');

-- 検証用クエリ（コメントアウト）
-- SELECT confidence_level, COUNT(*) as count 
-- FROM building_regulations 
-- WHERE verification_status='VERIFIED' 
-- GROUP BY confidence_level 
-- ORDER BY confidence_level;

-- 期待される結果:
-- confidence_level='high': 180件（100%）
