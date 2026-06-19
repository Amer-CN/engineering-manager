-- Phase 1.3: 金额 REAL → INTEGER（以"分为单位"）
-- 注意：每个表单独执行，MigrationRunner 会自动包裹事务

-- 1. projects.budget
CREATE TABLE IF NOT EXISTS projects_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    budget INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO projects_new
SELECT id, name, description, address, start_date, end_date, status,
       CAST(COALESCE(budget, 0) * 100 AS INTEGER), created_at, updated_at
FROM projects;

DROP TABLE projects;

ALTER TABLE projects_new RENAME TO projects;

-- 2. members.base_salary, daily_wage
CREATE TABLE IF NOT EXISTS members_new (
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
    base_salary INTEGER DEFAULT 0,
    daily_wage INTEGER DEFAULT 0,
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

INSERT INTO members_new
SELECT id, name, phone, email, member_type, role, id_card, gender, ethnicity,
       birth_date, id_card_address,
       CAST(COALESCE(base_salary, 0) * 100 AS INTEGER),
       CAST(COALESCE(daily_wage, 0) * 100 AS INTEGER),
       entry_date, status, department_id, position, bank_account, bank_name,
       bank_line_no, photo, created_at, updated_at
FROM members;

DROP TABLE members;

ALTER TABLE members_new RENAME TO members;

-- 3. workers.daily_wage
CREATE TABLE IF NOT EXISTS workers_new (
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
    daily_wage INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO workers_new
SELECT id, name, id_card, gender, phone, address, bank_account, bank_name,
       bank_line_no, worker_type,
       CAST(COALESCE(daily_wage, 0) * 100 AS INTEGER),
       created_at, updated_at
FROM workers;

DROP TABLE workers;

ALTER TABLE workers_new RENAME TO workers;

-- 4. project_workers.daily_wage
CREATE TABLE IF NOT EXISTS project_workers_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER,
    project_id INTEGER,
    team_id INTEGER,
    daily_wage INTEGER DEFAULT 0,
    worker_type TEXT,
    entry_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO project_workers_new
SELECT id, worker_id, project_id, team_id,
       CAST(COALESCE(daily_wage, 0) * 100 AS INTEGER),
       worker_type, entry_date, status, created_at, updated_at
FROM project_workers;

DROP TABLE project_workers;

ALTER TABLE project_workers_new RENAME TO project_workers;

-- 5. income_contracts.amount
CREATE TABLE IF NOT EXISTS income_contracts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    counterparty TEXT,
    sign_date TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO income_contracts_new
SELECT id, project_id, name,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       counterparty, sign_date, status, remark, files, created_at, updated_at
FROM income_contracts;

DROP TABLE income_contracts;

ALTER TABLE income_contracts_new RENAME TO income_contracts;

-- 6. expense_contracts.amount
CREATE TABLE IF NOT EXISTS expense_contracts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    counterparty TEXT,
    sign_date TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO expense_contracts_new
SELECT id, project_id, name,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       counterparty, sign_date, status, remark, files, created_at, updated_at
FROM expense_contracts;

DROP TABLE expense_contracts;

ALTER TABLE expense_contracts_new RENAME TO expense_contracts;

-- 7. agreement_contracts.amount
CREATE TABLE IF NOT EXISTS agreement_contracts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    counterparty TEXT,
    sign_date TEXT,
    agreement_type TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO agreement_contracts_new
SELECT id, project_id, name,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       counterparty, sign_date, agreement_type, status, remark, files, created_at, updated_at
FROM agreement_contracts;

DROP TABLE agreement_contracts;

ALTER TABLE agreement_contracts_new RENAME TO agreement_contracts;

-- 8. invoices (多个金额字段)
CREATE TABLE IF NOT EXISTS invoices_new (
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
    amount INTEGER DEFAULT 0,
    price_amount INTEGER DEFAULT 0,
    tax_amount INTEGER DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    received_amount INTEGER DEFAULT 0,
    settlement_id INTEGER,
    issue_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO invoices_new
SELECT id, project_id, seller_id, buyer_id, contract_id, type, invoice_kind,
       invoice_no, invoice_code, name,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       CAST(COALESCE(price_amount, 0) * 100 AS INTEGER),
       CAST(COALESCE(tax_amount, 0) * 100 AS INTEGER),
       tax_rate,
       CAST(COALESCE(received_amount, 0) * 100 AS INTEGER),
       settlement_id, issue_date, status, remarks, file_url, file_type,
       created_at, updated_at
FROM invoices;

DROP TABLE invoices;

ALTER TABLE invoices_new RENAME TO invoices;

-- 9. payment_records.amount
CREATE TABLE IF NOT EXISTS payment_records_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    record_date TEXT DEFAULT '',
    project_id INTEGER,
    partner_id INTEGER,
    contract_id INTEGER,
    invoice_details TEXT DEFAULT '[]',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT
);

INSERT INTO payment_records_new
SELECT id, type,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       record_date, project_id, partner_id, contract_id, invoice_details,
       remarks, file_url, file_type, created_at
FROM payment_records;

DROP TABLE payment_records;

ALTER TABLE payment_records_new RENAME TO payment_records;

-- 10. wages (多个金额字段)
CREATE TABLE IF NOT EXISTS wages_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    member_id INTEGER,
    project_worker_id INTEGER,
    year_month TEXT,
    daily_wage INTEGER DEFAULT 0,
    work_days REAL DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    deduction INTEGER DEFAULT 0,
    actual_wage INTEGER DEFAULT 0,
    paid_amount INTEGER DEFAULT 0,
    paid_date TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO wages_new
SELECT id, project_id, member_id, project_worker_id, year_month,
       CAST(COALESCE(daily_wage, 0) * 100 AS INTEGER),
       work_days,
       CAST(COALESCE(bonus, 0) * 100 AS INTEGER),
       CAST(COALESCE(deduction, 0) * 100 AS INTEGER),
       CAST(COALESCE(actual_wage, 0) * 100 AS INTEGER),
       CAST(COALESCE(paid_amount, 0) * 100 AS INTEGER),
       paid_date, status, created_at, updated_at
FROM wages;

DROP TABLE wages;

ALTER TABLE wages_new RENAME TO wages;

-- 11. settlements.amount
CREATE TABLE IF NOT EXISTS settlements_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    partner_id INTEGER,
    name TEXT,
    category TEXT,
    amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    date TEXT,
    remark TEXT,
    files TEXT,
    invoice_details TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO settlements_new
SELECT id, project_id, partner_id, name, category,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       status, date, remark, files, invoice_details, created_at, updated_at
FROM settlements;

DROP TABLE settlements;

ALTER TABLE settlements_new RENAME TO settlements;

-- 12. cost_ledger.amount
CREATE TABLE IF NOT EXISTS cost_ledger_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    batch_id INTEGER,
    voucher_no TEXT,
    date TEXT,
    direction TEXT,
    category TEXT,
    amount INTEGER DEFAULT 0,
    counterparty TEXT,
    channel TEXT,
    summary TEXT,
    notes TEXT,
    attachments TEXT,
    linked_invoice_id INTEGER,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO cost_ledger_new
SELECT id, project_id, batch_id, voucher_no, date, direction, category,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       counterparty, channel, summary, notes, attachments, linked_invoice_id,
       created_at, updated_at
FROM cost_ledger;

DROP TABLE cost_ledger;

ALTER TABLE cost_ledger_new RENAME TO cost_ledger;

-- 13. inventory_transactions.unit_price
CREATE TABLE IF NOT EXISTS inventory_transactions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    project_id INTEGER,
    type TEXT,
    quantity REAL DEFAULT 0,
    unit_price INTEGER DEFAULT 0,
    date TEXT,
    remark TEXT,
    created_at TEXT
);

INSERT INTO inventory_transactions_new
SELECT id, item_id, project_id, type, quantity,
       CAST(COALESCE(unit_price, 0) * 100 AS INTEGER),
       date, remark, created_at
FROM inventory_transactions;

DROP TABLE inventory_transactions;

ALTER TABLE inventory_transactions_new RENAME TO inventory_transactions;

-- 14. expenses.amount
CREATE TABLE IF NOT EXISTS expenses_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category TEXT,
    amount INTEGER DEFAULT 0,
    date TEXT,
    description TEXT,
    vendor TEXT,
    receipt_url TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO expenses_new
SELECT id, project_id, category,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       date, description, vendor, receipt_url, created_at, updated_at
FROM expenses;

DROP TABLE expenses;

ALTER TABLE expenses_new RENAME TO expenses;

-- 15. salary_history (base_salary, subsidy)
CREATE TABLE IF NOT EXISTS salary_history_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    effective_date TEXT,
    base_salary INTEGER DEFAULT 0,
    subsidy INTEGER DEFAULT 0,
    subsidy_note TEXT,
    note TEXT,
    created_at TEXT
);

INSERT INTO salary_history_new
SELECT id, member_id, effective_date,
       CAST(COALESCE(base_salary, 0) * 100 AS INTEGER),
       CAST(COALESCE(subsidy, 0) * 100 AS INTEGER),
       subsidy_note, note, created_at
FROM salary_history;

DROP TABLE salary_history;

ALTER TABLE salary_history_new RENAME TO salary_history;
