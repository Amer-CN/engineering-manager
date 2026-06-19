-- v1.1.0 P0-4 完整版: 6 张"无 created_by"的表加 created_by 列
-- 原因: 这些表之前没加 created_by, 没法做 user-dim 越权过滤
-- 兼容性: ALTER TABLE ADD COLUMN 是幂等的 (MigrationRunner 吞"duplicate column name")
--
-- 包含:
--   cost_ledger (3 个端点用) - 财务流水, 加后能按创建人隔离
--   settlements (1 个端点) - 结算单
--   worker_teams (1 个端点) - 班组 (创建人通常是项目经理)
--   departments (1 个端点) - 部门 (创建人通常是 admin)
--   contract_templates (1 个端点) - 合同模板
--   salary_history (2 个端点) + wage_history (2 个端点) - 工资历史

-- 财务流水
ALTER TABLE cost_ledger ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_cost_ledger_created_by ON cost_ledger(created_by);

-- 结算
ALTER TABLE settlements ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_settlements_created_by ON settlements(created_by);

-- 班组
ALTER TABLE worker_teams ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_worker_teams_created_by ON worker_teams(created_by);

-- 部门
ALTER TABLE departments ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_departments_created_by ON departments(created_by);

-- 合同模板
ALTER TABLE contract_templates ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_contract_templates_created_by ON contract_templates(created_by);

-- 工资历史
ALTER TABLE salary_history ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_salary_history_created_by ON salary_history(created_by);

-- wage_history 表在 001_InitialSchema.sql 不存在, 需先创建 (含 created_by)
-- 设计: 跟 salary_history 类似, 按 project_worker_id 关联
CREATE TABLE IF NOT EXISTS wage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_worker_id INTEGER NOT NULL,
    effective_date TEXT,
    year_month TEXT,
    base_daily_wage REAL,
    actual_wage REAL,
    paid_amount REAL,
    note TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_wage_history_created_by ON wage_history(created_by);
CREATE INDEX IF NOT EXISTS idx_wage_history_project_worker_id ON wage_history(project_worker_id);
