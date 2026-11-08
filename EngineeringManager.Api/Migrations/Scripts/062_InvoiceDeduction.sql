-- ============================================================
-- 062: invoices 进项抵扣四字段（P0-b）
-- 背景：进项发票需要区分「已收票未抵扣」与「已抵扣」并支持跨期
-- 统计（金蝶 FISDEDUCT / FDEDUCTDATE / FDEDUCTTAXFOR 口径）。
--   is_deducted    0/1 是否已抵扣（仅 type='invoice_in' 可为 1）
--   deduct_date    抵扣日期 YYYY-MM-DD（可空）
--   deduct_period  税款所属期 YYYY-MM（已抵扣时必填）
--   deductible_tax 可抵扣税额，INTEGER 分（项目金额红线）
-- 幂等：ADD COLUMN 重复执行 → duplicate column name 由
-- MigrationRunner 良性吞掉；索引 IF NOT EXISTS。
-- 存量行：NOT NULL DEFAULT 0 → is_deducted=0、deductible_tax=0。
-- 表名 [] 包裹（项目红线）。
-- ============================================================

ALTER TABLE [invoices] ADD COLUMN [is_deducted] INTEGER NOT NULL DEFAULT 0;
ALTER TABLE [invoices] ADD COLUMN [deduct_date] TEXT;
ALTER TABLE [invoices] ADD COLUMN [deduct_period] TEXT;
ALTER TABLE [invoices] ADD COLUMN [deductible_tax] INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS [idx_invoices_deducted] ON [invoices]([is_deducted],[deduct_period]);
