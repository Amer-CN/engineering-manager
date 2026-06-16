-- Phase 2.2: 拆解 TEXT 多值字段（1NF 修复）
-- 创建关联表并迁移数据

-- 1. partner_projects（合作伙伴↔项目）
CREATE TABLE IF NOT EXISTS partner_projects (
    partner_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    PRIMARY KEY (partner_id, project_id)
);

-- 2. supervisor_projects（监管单位↔项目）
CREATE TABLE IF NOT EXISTS supervisor_projects (
    supervisor_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    PRIMARY KEY (supervisor_id, project_id)
);

-- 3. contract_files（合同附件）
CREATE TABLE IF NOT EXISTS contract_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    contract_type TEXT NOT NULL,
    file_name TEXT,
    file_url TEXT
);

-- 4. settlement_files（结算附件）
CREATE TABLE IF NOT EXISTS settlement_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    settlement_id INTEGER NOT NULL,
    file_name TEXT,
    file_url TEXT
);

-- 5. payment_invoices（支付↔发票关联）
CREATE TABLE IF NOT EXISTS payment_invoices (
    payment_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    amount INTEGER DEFAULT 0,
    PRIMARY KEY (payment_id, invoice_id)
);

-- 6. settlement_invoices（结算↔发票关联）
CREATE TABLE IF NOT EXISTS settlement_invoices (
    settlement_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    amount INTEGER DEFAULT 0,
    PRIMARY KEY (settlement_id, invoice_id)
);

-- 7. department_positions（部门↔职位）
CREATE TABLE IF NOT EXISTS department_positions (
    dept_id INTEGER NOT NULL,
    position_name TEXT NOT NULL,
    PRIMARY KEY (dept_id, position_name)
);

-- 注意：原表 TEXT 字段保留，不删除（SQLite 不支持 DROP COLUMN）
-- WHERE 过滤在 Phase 4 Repository 层统一处理
