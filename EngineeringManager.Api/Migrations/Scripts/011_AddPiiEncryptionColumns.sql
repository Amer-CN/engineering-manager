-- v1.2.0 阶段 A.2: 13 个 PII 列加 _enc 字段 (加密存储)
-- 策略: 保留原明文列 (兼容老代码读 + 新代码写 _enc), 新代码优先读 _enc

-- members: 4 个 PII 列
ALTER TABLE members ADD COLUMN id_card_enc TEXT;
ALTER TABLE members ADD COLUMN id_card_address_enc TEXT;
ALTER TABLE members ADD COLUMN phone_enc TEXT;
ALTER TABLE members ADD COLUMN bank_account_enc TEXT;

-- workers: 4 个 PII 列
ALTER TABLE workers ADD COLUMN id_card_enc TEXT;
ALTER TABLE workers ADD COLUMN phone_enc TEXT;
ALTER TABLE workers ADD COLUMN address_enc TEXT;
ALTER TABLE workers ADD COLUMN bank_account_enc TEXT;

-- partners: 4 个 PII 列
ALTER TABLE partners ADD COLUMN phone_enc TEXT;
ALTER TABLE partners ADD COLUMN bank_account_enc TEXT;
ALTER TABLE partners ADD COLUMN credit_code_enc TEXT;
ALTER TABLE partners ADD COLUMN tax_number_enc TEXT;

-- supervisors: 1 个 PII 列
ALTER TABLE supervisors ADD COLUMN phone_enc TEXT;

-- 共 13 个 _enc 列

-- 注: 一次性回填由 scripts/v1.2.0-backfill-pii.cjs 处理
--      (因为 AES-GCM 加密必须在 C# 端做, 不能在 SQL 里跑)
