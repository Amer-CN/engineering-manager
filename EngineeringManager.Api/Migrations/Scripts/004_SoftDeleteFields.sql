-- Phase 2.1: 财务表添加软删除字段 deleted_at

-- invoices
ALTER TABLE invoices ADD COLUMN deleted_at TEXT;

-- payment_records
ALTER TABLE payment_records ADD COLUMN deleted_at TEXT;

-- wages
ALTER TABLE wages ADD COLUMN deleted_at TEXT;

-- settlements
ALTER TABLE settlements ADD COLUMN deleted_at TEXT;

-- cost_ledger
ALTER TABLE cost_ledger ADD COLUMN deleted_at TEXT;
