UPDATE users SET password_hash = 'bRp8YzyzUK+3XITsDmExSzxebLN6VYDseAIIHFP4b+WJs3rDjU6RyjC8m2lf31ui' WHERE email = 'navigator-187@docomo.ne.jp';
UPDATE users SET password_hash = 'DineAUHlSaiPlvjQyorwUyuXy8MjfLii6HPWUE5RjGMSCSeip4D7vBMcRpYW6QCJ' WHERE email = 'admin@test.com';
UPDATE users SET password_hash = 'aWk84u8++90vjEBPlTY5CI0prZtvR/+Q/UIYXXUrOoaBoge1SNSDo/joXfaP1SFG' WHERE email = 'prod-test-agent@example.com';
UPDATE users SET password_hash = 'NcJ6C8DWSQBtmCdRL79guQqxCnElNeofpuz2xLNRl6B2c2lwRwFnppUFj3C0/rC0' WHERE email = 'agent@200units.com';
UPDATE users SET password_hash = 'q0Msem1IIAbOSO4mXmcYzuQrccuhR2oSbASnqeJfZeg3HH5prJGGkbmIBRflZ5O+' WHERE email = 'admin@200units.com';
UPDATE users SET password_hash = 'r/eEwkWxd37v2Rw9LzrO5leUXfCA6bjg42UmG3KMJ/SkOoUSNOJ09MUKeNsG9uqZ' WHERE email = 'seller1@example.com';
UPDATE users SET password_hash = 'gMQJeh0EOIRmKxJ/8HbG2yUGQSVOCMJ60YPB/RdDupbN6ubF06qzddbuJ8HOWRD8' WHERE email = 'seller2@example.com';
SELECT COUNT(*) as updated_count FROM users WHERE email IN ('navigator-187@docomo.ne.jp', 'admin@test.com', 'prod-test-agent@example.com', 'agent@200units.com', 'admin@200units.com', 'seller1@example.com', 'seller2@example.com');