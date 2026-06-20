-- ============================================================
-- v0.77.0 阶段 1: 27 业务表加 5 列 (cloud sync 准备)
-- 来源: docs/design/cloud-sync-design.md §阶段 1
-- 设计: 阶段 1 不实现 sync 推/拉逻辑, 只为表加列 + 写路径 version 自增
--        阶段 2 (v0.78.0) 推/拉时直接用, 不需 schema 改动
--
-- 列语义:
--   version: 乐观锁 (CAS), INSERT 默认 1, UPDATE 时
--            SET version = version + 1, 客户端传 @OldVersion
--            WHERE id=@Id AND version=@OldVersion (影响 0 行 → 冲突)
--   last_modified_by_device: 多设备追踪, 阶段 1 全 NULL
--            阶段 2 设备注册后由后端从 device_registrations 注入
--   last_modified_at: 冗余 updated_at, 但专为 sync 设计
--            (updated_at 是用户面时间戳, last_modified_at 是 sync 面)
--   sync_status: 已同步状态, 程序层约束 (避免 SQLite ALTER 加 CHECK 失败)
--            取值: synced (默认) / pending / conflict
--   conflict_marker: 阶段 2 冲突检测用, 默认 NULL
--
-- 兼容性: ALTER TABLE ADD COLUMN 幂等
--          (MigrationRunner 吞 "duplicate column name" 错)
-- 索引: 每个表加 idx_<table>_version 供乐观锁 CAS 高频查询
-- ============================================================

-- 项目 (3 表)
ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE projects ADD COLUMN last_modified_at TEXT;
ALTER TABLE projects ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE projects ADD COLUMN conflict_marker TEXT;
ALTER TABLE project_members ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE project_members ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE project_members ADD COLUMN last_modified_at TEXT;
ALTER TABLE project_members ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE project_members ADD COLUMN conflict_marker TEXT;
ALTER TABLE project_workers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE project_workers ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE project_workers ADD COLUMN last_modified_at TEXT;
ALTER TABLE project_workers ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE project_workers ADD COLUMN conflict_marker TEXT;

-- 合同 (3 表)
ALTER TABLE income_contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE income_contracts ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE income_contracts ADD COLUMN last_modified_at TEXT;
ALTER TABLE income_contracts ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE income_contracts ADD COLUMN conflict_marker TEXT;
ALTER TABLE expense_contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE expense_contracts ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE expense_contracts ADD COLUMN last_modified_at TEXT;
ALTER TABLE expense_contracts ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE expense_contracts ADD COLUMN conflict_marker TEXT;
ALTER TABLE agreement_contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE agreement_contracts ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE agreement_contracts ADD COLUMN last_modified_at TEXT;
ALTER TABLE agreement_contracts ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE agreement_contracts ADD COLUMN conflict_marker TEXT;

-- 工资考勤 (2 表)
ALTER TABLE wages ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE wages ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE wages ADD COLUMN last_modified_at TEXT;
ALTER TABLE wages ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE wages ADD COLUMN conflict_marker TEXT;
ALTER TABLE attendances ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE attendances ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE attendances ADD COLUMN last_modified_at TEXT;
ALTER TABLE attendances ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE attendances ADD COLUMN conflict_marker TEXT;

-- 人事工人 (2 表)
ALTER TABLE members ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE members ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE members ADD COLUMN last_modified_at TEXT;
ALTER TABLE members ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE members ADD COLUMN conflict_marker TEXT;
ALTER TABLE workers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workers ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE workers ADD COLUMN last_modified_at TEXT;
ALTER TABLE workers ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE workers ADD COLUMN conflict_marker TEXT;

-- 单位 (2 表)
ALTER TABLE partners ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE partners ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE partners ADD COLUMN last_modified_at TEXT;
ALTER TABLE partners ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE partners ADD COLUMN conflict_marker TEXT;
ALTER TABLE supervisors ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE supervisors ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE supervisors ADD COLUMN last_modified_at TEXT;
ALTER TABLE supervisors ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE supervisors ADD COLUMN conflict_marker TEXT;

-- 仓库物料 (3 表)
ALTER TABLE inventory_items ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory_items ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE inventory_items ADD COLUMN last_modified_at TEXT;
ALTER TABLE inventory_items ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE inventory_items ADD COLUMN conflict_marker TEXT;
ALTER TABLE inventory_transactions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory_transactions ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE inventory_transactions ADD COLUMN last_modified_at TEXT;
ALTER TABLE inventory_transactions ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE inventory_transactions ADD COLUMN conflict_marker TEXT;
ALTER TABLE materials ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE materials ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE materials ADD COLUMN last_modified_at TEXT;
ALTER TABLE materials ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE materials ADD COLUMN conflict_marker TEXT;

-- 费用图纸 (2 表)
ALTER TABLE expenses ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE expenses ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE expenses ADD COLUMN last_modified_at TEXT;
ALTER TABLE expenses ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE expenses ADD COLUMN conflict_marker TEXT;
ALTER TABLE drawings ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE drawings ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE drawings ADD COLUMN last_modified_at TEXT;
ALTER TABLE drawings ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE drawings ADD COLUMN conflict_marker TEXT;

-- 发票 (2 表)
ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE invoices ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE invoices ADD COLUMN last_modified_at TEXT;
ALTER TABLE invoices ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE invoices ADD COLUMN conflict_marker TEXT;
ALTER TABLE payment_records ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payment_records ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE payment_records ADD COLUMN last_modified_at TEXT;
ALTER TABLE payment_records ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE payment_records ADD COLUMN conflict_marker TEXT;

-- 财务 (3 表)
ALTER TABLE cost_ledger ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cost_ledger ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE cost_ledger ADD COLUMN last_modified_at TEXT;
ALTER TABLE cost_ledger ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE cost_ledger ADD COLUMN conflict_marker TEXT;
ALTER TABLE settlements ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settlements ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE settlements ADD COLUMN last_modified_at TEXT;
ALTER TABLE settlements ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE settlements ADD COLUMN conflict_marker TEXT;
ALTER TABLE cost_ledger_batches ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cost_ledger_batches ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE cost_ledger_batches ADD COLUMN last_modified_at TEXT;
ALTER TABLE cost_ledger_batches ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE cost_ledger_batches ADD COLUMN conflict_marker TEXT;

-- 组织模板 (3 表)
ALTER TABLE worker_teams ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE worker_teams ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE worker_teams ADD COLUMN last_modified_at TEXT;
ALTER TABLE worker_teams ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE worker_teams ADD COLUMN conflict_marker TEXT;
ALTER TABLE departments ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE departments ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE departments ADD COLUMN last_modified_at TEXT;
ALTER TABLE departments ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE departments ADD COLUMN conflict_marker TEXT;
ALTER TABLE contract_templates ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE contract_templates ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE contract_templates ADD COLUMN last_modified_at TEXT;
ALTER TABLE contract_templates ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE contract_templates ADD COLUMN conflict_marker TEXT;

-- 历史 (2 表)
ALTER TABLE salary_history ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE salary_history ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE salary_history ADD COLUMN last_modified_at TEXT;
ALTER TABLE salary_history ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE salary_history ADD COLUMN conflict_marker TEXT;
ALTER TABLE wage_history ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE wage_history ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE wage_history ADD COLUMN last_modified_at TEXT;
ALTER TABLE wage_history ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE wage_history ADD COLUMN conflict_marker TEXT;

-- ============================================================
-- 索引: 每个表 idx_<table>_version 供乐观锁 CAS 高频查询
-- ============================================================

-- 项目 (3 表)
CREATE INDEX IF NOT EXISTS idx_projects_version ON projects(version);
CREATE INDEX IF NOT EXISTS idx_project_members_version ON project_members(version);
CREATE INDEX IF NOT EXISTS idx_project_workers_version ON project_workers(version);

-- 合同 (3 表)
CREATE INDEX IF NOT EXISTS idx_income_contracts_version ON income_contracts(version);
CREATE INDEX IF NOT EXISTS idx_expense_contracts_version ON expense_contracts(version);
CREATE INDEX IF NOT EXISTS idx_agreement_contracts_version ON agreement_contracts(version);

-- 工资考勤 (2 表)
CREATE INDEX IF NOT EXISTS idx_wages_version ON wages(version);
CREATE INDEX IF NOT EXISTS idx_attendances_version ON attendances(version);

-- 人事工人 (2 表)
CREATE INDEX IF NOT EXISTS idx_members_version ON members(version);
CREATE INDEX IF NOT EXISTS idx_workers_version ON workers(version);

-- 单位 (2 表)
CREATE INDEX IF NOT EXISTS idx_partners_version ON partners(version);
CREATE INDEX IF NOT EXISTS idx_supervisors_version ON supervisors(version);

-- 仓库物料 (3 表)
CREATE INDEX IF NOT EXISTS idx_inventory_items_version ON inventory_items(version);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_version ON inventory_transactions(version);
CREATE INDEX IF NOT EXISTS idx_materials_version ON materials(version);

-- 费用图纸 (2 表)
CREATE INDEX IF NOT EXISTS idx_expenses_version ON expenses(version);
CREATE INDEX IF NOT EXISTS idx_drawings_version ON drawings(version);

-- 发票 (2 表)
CREATE INDEX IF NOT EXISTS idx_invoices_version ON invoices(version);
CREATE INDEX IF NOT EXISTS idx_payment_records_version ON payment_records(version);

-- 财务 (3 表)
CREATE INDEX IF NOT EXISTS idx_cost_ledger_version ON cost_ledger(version);
CREATE INDEX IF NOT EXISTS idx_settlements_version ON settlements(version);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_batches_version ON cost_ledger_batches(version);

-- 组织模板 (3 表)
CREATE INDEX IF NOT EXISTS idx_worker_teams_version ON worker_teams(version);
CREATE INDEX IF NOT EXISTS idx_departments_version ON departments(version);
CREATE INDEX IF NOT EXISTS idx_contract_templates_version ON contract_templates(version);

-- 历史 (2 表)
CREATE INDEX IF NOT EXISTS idx_salary_history_version ON salary_history(version);
CREATE INDEX IF NOT EXISTS idx_wage_history_version ON wage_history(version);
