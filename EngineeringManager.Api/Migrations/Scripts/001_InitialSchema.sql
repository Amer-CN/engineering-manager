-- 001_InitialSchema.sql
-- 初始数据库架构迁移
-- 从 EnsureTables 方法提取的表结构

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    budget REAL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

-- 人员表
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    member_type TEXT DEFAULT 'staff',
    role TEXT,
    id_card TEXT,
    gender TEXT,
    ethnicity TEXT,
    birth_date TEXT,
    id_card_address TEXT,
    base_salary REAL,
    daily_wage REAL,
    entry_date TEXT,
    status TEXT DEFAULT 'active',
    department_id INTEGER,
    position TEXT,
    bank_account TEXT,
    bank_name TEXT,
    bank_line_no TEXT,
    photo TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 工人表
CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    id_card TEXT,
    gender TEXT,
    phone TEXT,
    address TEXT,
    bank_account TEXT,
    bank_name TEXT,
    bank_line_no TEXT,
    worker_type TEXT,
    daily_wage REAL,
    created_at TEXT,
    updated_at TEXT
);

-- 项目工人关联表
CREATE TABLE IF NOT EXISTS project_workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER,
    project_id INTEGER,
    team_id INTEGER,
    daily_wage REAL,
    worker_type TEXT,
    entry_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    updated_at TEXT
);

-- 收入合同表
CREATE TABLE IF NOT EXISTS income_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount REAL,
    counterparty TEXT,
    sign_date TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 支出合同表
CREATE TABLE IF NOT EXISTS expense_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount REAL,
    counterparty TEXT,
    sign_date TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 协议合同表
CREATE TABLE IF NOT EXISTS agreement_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount REAL,
    counterparty TEXT,
    sign_date TEXT,
    agreement_type TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 发票表
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    contract_id INTEGER,
    type TEXT,
    invoice_kind TEXT,
    invoice_no TEXT,
    invoice_code TEXT,
    name TEXT,
    amount REAL DEFAULT 0,
    price_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    received_amount REAL DEFAULT 0,
    settlement_id INTEGER,
    issue_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 支付记录表
CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL DEFAULT 0,
    record_date TEXT DEFAULT '',
    project_id INTEGER,
    partner_id INTEGER,
    contract_id INTEGER,
    invoice_details TEXT DEFAULT '[]',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 合作伙伴表
CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    contact TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    bank_account TEXT,
    bank_name TEXT,
    credit_code TEXT,
    registered_address TEXT,
    business_scope TEXT,
    tax_type TEXT,
    license_file TEXT,
    license_file_type TEXT,
    other_files TEXT,
    other_files_type TEXT,
    project_ids TEXT,
    remarks TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 监管单位表
CREATE TABLE IF NOT EXISTS supervisors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_id INTEGER,
    name TEXT NOT NULL,
    category TEXT,
    contact TEXT,
    phone TEXT,
    address TEXT,
    project_ids TEXT,
    remarks TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 工资表
CREATE TABLE IF NOT EXISTS wages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    member_id INTEGER,
    project_worker_id INTEGER,
    year_month TEXT,
    daily_wage REAL,
    work_days REAL,
    bonus REAL DEFAULT 0,
    deduction REAL DEFAULT 0,
    actual_wage REAL,
    paid_amount REAL,
    paid_date TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT,
    updated_at TEXT
);

-- 考勤表
CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    project_id INTEGER,
    project_worker_id INTEGER,
    year_month TEXT,
    work_days REAL,
    days_off INTEGER,
    is_full_attendance INTEGER,
    daily_status TEXT,
    file_url TEXT,
    file_name TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 结算表
CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    partner_id INTEGER,
    name TEXT,
    category TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending',
    date TEXT,
    remark TEXT,
    files TEXT,
    invoice_details TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 成本台账表
CREATE TABLE IF NOT EXISTS cost_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    batch_id INTEGER,
    voucher_no TEXT,
    date TEXT,
    direction TEXT,
    category TEXT,
    amount REAL,
    counterparty TEXT,
    channel TEXT,
    summary TEXT,
    notes TEXT,
    attachments TEXT,
    linked_invoice_id INTEGER,
    created_at TEXT,
    updated_at TEXT
);

-- 成本台账分类表
CREATE TABLE IF NOT EXISTS cost_ledger_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    direction TEXT,
    level1 TEXT,
    color TEXT,
    created_at TEXT
);

-- 成本台账匹配规则表
CREATE TABLE IF NOT EXISTS cost_ledger_match_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT,
    category TEXT,
    direction TEXT,
    priority INTEGER,
    created_at TEXT
);

-- 库存项目表
CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    quantity REAL DEFAULT 0,
    min_quantity REAL,
    location TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 库存交易表
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    project_id INTEGER,
    type TEXT,
    quantity REAL,
    unit_price REAL,
    date TEXT,
    remark TEXT,
    created_at TEXT
);

-- 材料表
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    specifications TEXT,
    supplier TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 模板表
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    category TEXT,
    content TEXT,
    variables TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    level TEXT,
    user_id TEXT,
    user_name TEXT,
    resource TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    permissions TEXT,
    is_system INTEGER DEFAULT 0,
    created_at TEXT
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    password_hash_version INTEGER DEFAULT 1,
    salt TEXT,
    display_name TEXT,
    role_id TEXT,
    status TEXT DEFAULT 'active',
    avatar TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 快照表
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    size INTEGER,
    created_at TEXT
);

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    manager_id INTEGER,
    positions TEXT,
    created_at TEXT
);

-- 薪资历史表
CREATE TABLE IF NOT EXISTS salary_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    effective_date TEXT,
    base_salary REAL,
    subsidy REAL,
    subsidy_note TEXT,
    note TEXT,
    created_at TEXT
);

-- 工人班组表
CREATE TABLE IF NOT EXISTS worker_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    project_id INTEGER,
    leader_id INTEGER,
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 项目成员表
CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    member_id INTEGER,
    joined_at TEXT
);

-- 区域表
CREATE TABLE IF NOT EXISTS regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province TEXT,
    city TEXT,
    district TEXT
);

-- 图纸表
CREATE TABLE IF NOT EXISTS drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 费用表
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category TEXT,
    amount REAL,
    date TEXT,
    description TEXT,
    vendor TEXT,
    receipt_url TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 合同模板表
CREATE TABLE IF NOT EXISTS contract_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    content TEXT,
    variables TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 角色种子数据
INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at) VALUES
('admin', '管理员', 'all', 1, datetime('now')),
('manager', '项目经理', 'project:read,project:write,wage:read,wage:write,attendance:read,attendance:write', 1, datetime('now')),
('finance', '财务', 'invoice:read,invoice:write,settlement:read,settlement:write,cost_ledger:read,cost_ledger:write', 1, datetime('now')),
('worker', '工人', 'attendance:read,wage:read', 1, datetime('now'));
