-- ============================================================
-- 056: invoices 红冲原票关联列（FP06 / Wave 1B-1）
-- 背景：红字发票无原票关联（invoices 表无关联列，状态可直切
-- red_flushed）；本脚本加 original_invoice_id 自引用列 + 索引。
-- 幂等：ALTER ADD COLUMN 重复跑 → duplicate column name 被
-- MigrationRunner 良性吞掉；索引用 IF NOT EXISTS。
-- 表名 [] 包裹（项目红线）；金额无关，无分制影响。
-- ============================================================

ALTER TABLE [invoices] ADD COLUMN [original_invoice_id] INTEGER REFERENCES [invoices]([id]);

CREATE INDEX IF NOT EXISTS [idx_invoices_original] ON [invoices]([original_invoice_id]);
