-- v1.1.0 P0-4 测试修复: 合同表补全 ContractEndpoints.cs POST 写的所有字段
-- 背景: ContractEndpoints POST /api/contracts/income/expense/agreement 写 contract_no, partner_id,
--        signed_date, start_date, end_date, payment_method 等列, 但 001 schema 没这些列
--        测试时直接 INSERT 写入了, 现在 production 表 schema 缺这些列
-- 兼容性: ALTER TABLE ADD COLUMN 幂等
ALTER TABLE income_contracts ADD COLUMN contract_no TEXT;
ALTER TABLE income_contracts ADD COLUMN signed_date TEXT;
ALTER TABLE income_contracts ADD COLUMN start_date TEXT;
ALTER TABLE income_contracts ADD COLUMN end_date TEXT;
ALTER TABLE income_contracts ADD COLUMN payment_method TEXT;

ALTER TABLE expense_contracts ADD COLUMN contract_no TEXT;
ALTER TABLE expense_contracts ADD COLUMN signed_date TEXT;
ALTER TABLE expense_contracts ADD COLUMN start_date TEXT;
ALTER TABLE expense_contracts ADD COLUMN end_date TEXT;
ALTER TABLE expense_contracts ADD COLUMN payment_method TEXT;

ALTER TABLE agreement_contracts ADD COLUMN contract_no TEXT;
-- v1.1.0 P0-4 修: 合同表加 remarks 列 (API 用复数, 001 schema 用 remark 单数)
-- ALTER ADD COLUMN 幂等, 不存在则加, 存在则报 duplicate (MigrationRunner 失败)
-- 解决: 先 RENAME remark -> remarks (001 schema), 若已改则忽略失败用 try/catch
-- 注: SQLite ALTER RENAME COLUMN 是新功能 (3.25+), 工程用 10.0 应该支持
ALTER TABLE income_contracts RENAME COLUMN remark TO remarks;
ALTER TABLE expense_contracts RENAME COLUMN remark TO remarks;
ALTER TABLE agreement_contracts RENAME COLUMN remark TO remarks;
ALTER TABLE settlements RENAME COLUMN remark TO remarks;
