-- 050_AddMissingIndexes.sql
-- 对应审计编号：D-08 / D-09 / D-10（2026-09-04 深度审计——高频查询列缺索引）
-- 全部 CREATE INDEX IF NOT EXISTS，可重复执行；表名 [] 包裹（项目红线）

-- D-08: 关系表外键列
CREATE INDEX IF NOT EXISTS idx_project_members_project ON [project_members](project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON [invoices](contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_seller ON [invoices](seller_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer ON [invoices](buyer_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_partner ON [payment_records](partner_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_contract ON [payment_records](contract_id);
CREATE INDEX IF NOT EXISTS idx_settlements_partner ON [settlements](partner_id);
CREATE INDEX IF NOT EXISTS idx_settlements_contract ON [settlements](contract_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_batch ON [cost_ledger](batch_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_linked_invoice ON [cost_ledger](linked_invoice_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON [inventory_transactions](item_id);
CREATE INDEX IF NOT EXISTS idx_attendances_member ON [attendances](member_id);
CREATE INDEX IF NOT EXISTS idx_attendances_project_worker ON [attendances](project_worker_id);

-- D-09/D-10: audit_logs 时间范围与按用户检索
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON [audit_logs](created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON [audit_logs](user_id, created_at);
