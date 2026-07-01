ALTER TABLE users ADD COLUMN currency_code TEXT;

UPDATE users SET locale = 'en-AU' WHERE locale = 'en';
UPDATE users SET locale = 'zh-CN' WHERE locale IN ('zh', 'zh-Hans', 'zh-Hans-CN', 'zh-SG');
