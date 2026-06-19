-- Phase 2.3: 添加索引

-- 项目工人表
CREATE INDEX IF NOT EXISTS idx_pw_project ON project_workers(project_id);
CREATE INDEX IF NOT EXISTS idx_pw_worker ON project_workers(worker_id);

-- 发票表
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted ON invoices(deleted_at);

-- 成本台账表
CREATE INDEX IF NOT EXISTS idx_cost_ledger_project ON cost_ledger(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_direction ON cost_ledger(direction);

-- 工资表
CREATE INDEX IF NOT EXISTS idx_wages_project_month ON wages(project_id, year_month);

-- 考勤表
CREATE INDEX IF NOT EXISTS idx_attendances_project_month ON attendances(project_id, year_month);

-- 结算表
CREATE INDEX IF NOT EXISTS idx_settlements_project ON settlements(project_id);

-- 支付记录表
CREATE INDEX IF NOT EXISTS idx_payment_records_project ON payment_records(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_type ON payment_records(type);
