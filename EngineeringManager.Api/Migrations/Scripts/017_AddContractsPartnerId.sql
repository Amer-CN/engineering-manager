-- v1.1.0 P0-4 测试修复: 合同表加 partner_id 列
-- 背景: ContractEndpoints.cs POST /api/contracts/{income,expense,agreement} 写 partner_id 列
--        但 001_InitialSchema.sql 原始表没 partner_id (counterparty 字段替代)
-- 兼容性: ALTER TABLE ADD COLUMN 幂等 (MigrationRunner 吞 duplicate column name)
ALTER TABLE income_contracts ADD COLUMN partner_id INTEGER;
ALTER TABLE expense_contracts ADD COLUMN partner_id INTEGER;
ALTER TABLE agreement_contracts ADD COLUMN partner_id INTEGER;

-- 索引 (partner_id 是常用过滤字段)
CREATE INDEX IF NOT EXISTS idx_income_contracts_partner_id ON income_contracts(partner_id);
CREATE INDEX IF NOT EXISTS idx_expense_contracts_partner_id ON expense_contracts(partner_id);
CREATE INDEX IF NOT EXISTS idx_agreement_contracts_partner_id ON agreement_contracts(partner_id);
