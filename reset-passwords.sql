-- 本番環境パスワードリセット用SQL (v2 - 正しいアルゴリズム)
-- 全ユーザーのパスワードを "Test1234!" にリセット
-- ハッシュ形式: PBKDF2 (ランダムソルト + SHA-256)

UPDATE users SET password_hash = '4EwNhYL3eGqK0+bNUPQ1rjfthDRNfFVkhFA3YURFHS+xUI8jPGHXMloShjWnlfaS' WHERE id = 'seller-001'; -- seller1@example.com
UPDATE users SET password_hash = 'IOTAvFOSptecrJrQhZj8piZvi+Sn3ujebl1cNauMuYtSKyLeulfFKi0OZyzHU0Bv' WHERE id = 'seller-002'; -- seller2@example.com
UPDATE users SET password_hash = 'Kb9f0/3KFWUraNtpolTFGesbLj9/iIxGRU5CgWD2BU3LgB9Pmw2dlCYOZyj6bni8' WHERE id = 'e3e7b2cb-3e3e-4b99-840f-7287a4c45b86'; -- admin@200units.com
UPDATE users SET password_hash = 'o6sePRy7PFZbbvi83ENtd7DBHS68Sa+uccMbZ8QlCD4VjBOqrGaXiXeWhxNIVwqd' WHERE id = '1805f040-561f-4fae-8f22-792cc852d941'; -- agent@200units.com
UPDATE users SET password_hash = 'LSN0M6VJkYOc+AsYENPXALVHooF1ThPknRVd0KOsWh9vElCG4KSrxdUob3kmds68' WHERE id = 'user-aN7DwjL7fR'; -- prod-test-agent@example.com
UPDATE users SET password_hash = 'xBw6Z05eV0uJR4OyctLAM1Erg716EfUnVwEWcWVc/BptCBmgtGLwwP4vsBKEwPH+' WHERE id = 'test-buyer-001'; -- buyer1@example.com
UPDATE users SET password_hash = 'nGDSgOk7LBx4ZuvTuoW0j38I4cLmhKZVXpj21fE7JCrZ5qFMbpX2p3Vk2b2MZJEH' WHERE id = 'user-cHJvZHVjdGlv'; -- prod-test-buyer@example.com

-- 影響を受けるユーザー数を確認:
SELECT COUNT(*) as total_users FROM users;
