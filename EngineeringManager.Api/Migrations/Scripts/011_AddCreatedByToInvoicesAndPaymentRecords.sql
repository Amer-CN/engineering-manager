-- v1.1.0 Sprint B Step 2 第六批: invoices + payment_records 加 created_by TEXT 列 + 索引
-- 用于 InvoiceEndpoints INSERT/UPDATE/DELETE 端点加 created_by 过滤
-- ALTER TABLE ADD COLUMN 是幂等的

ALTER TABLE invoices ADD COLUMN created_by TEXT;
ALTER TABLE payment_records ADD COLUMN created_by TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_by ON payment_records(created_by);
