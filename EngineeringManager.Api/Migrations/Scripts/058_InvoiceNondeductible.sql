-- ============================================================
-- 058: invoices 进项不得抵扣原因列（FP08 / Wave 1B-4）
-- 背景：FP08 要求六类不得抵扣进项有原因分类（口径见
-- docs/finance-knowledge/invoice/数电票与增值税规则.md 六项）；
-- 落点为 invoices 单列，cost_ledger 不加列（经 linked_invoice_id
-- 联动显示，双写必不一致）。
-- 可空枚举六值：simple_taxation/exempt/abnormal_loss/
-- welfare_personal/catering_entertainment/other；NULL=可抵扣。
-- 幂等：ALTER ADD COLUMN 重复跑 → duplicate column name 被
-- MigrationRunner 良性吞掉；索引用 IF NOT EXISTS。
-- 表名 [] 包裹（项目红线）；非金额列，无分制影响。
-- ============================================================

ALTER TABLE [invoices] ADD COLUMN [non_deductible_reason] TEXT NULL;

CREATE INDEX IF NOT EXISTS [idx_invoices_nondeductible] ON [invoices]([non_deductible_reason]);
