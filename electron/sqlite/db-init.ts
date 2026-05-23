/**
 * SQLite 数据库初始化模块
 *
 * 职责：
 * 1. 创建/打开 SQLite 数据库
 * 2. 启用 WAL 模式 + 外键约束
 * 3. 创建所有表（IF NOT EXISTS）和索引
 * 4. 版本管理（schema_version 表）
 */

import path from 'path'
import log from 'electron-log'

// 懒加载 better-sqlite3，避免顶层 import 破坏 require("electron") 的结果
let db: any | null = null
let DatabaseModule: typeof import('better-sqlite3') | null = null

function getDatabase() {
  if (!DatabaseModule) {
    DatabaseModule = require('better-sqlite3') as typeof import('better-sqlite3')
  }
  return DatabaseModule
}

// ═══════════════════════════════════════════════════════════════════════════════
// Schema 版本管理
// ═══════════════════════════════════════════════════════════════════════════════

const CURRENT_SCHEMA_VERSION = 1

function ensureSchemaVersionTable(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      key   TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );
  `)
  const row = db.prepare('SELECT value FROM schema_version WHERE key = ?').get('version') as { value: number } | undefined
  if (!row) {
    db.prepare('INSERT INTO schema_version (key, value) VALUES (?, ?)').run('version', CURRENT_SCHEMA_VERSION)
  }
  return row?.value ?? 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// 建表语句
// ═══════════════════════════════════════════════════════════════════════════════

const CREATE_TABLES_SQL = `
-- ============================================================
-- 核心业务表
-- ============================================================

-- 项目
CREATE TABLE IF NOT EXISTS projects (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  address           TEXT DEFAULT '',
  start_date        TEXT DEFAULT '',
  end_date          TEXT DEFAULT '',
  status            TEXT DEFAULT 'planning' CHECK(status IN ('planning','in_progress','completed','archived')),
  budget            REAL DEFAULT 0,
  project_manager_id INTEGER DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- 部门
CREATE TABLE IF NOT EXISTS departments (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  manager_id        INTEGER DEFAULT NULL,
  positions         TEXT DEFAULT '[]',         -- JSON 数组
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 人员（管理人员 staff）
CREATE TABLE IF NOT EXISTS members (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  phone             TEXT DEFAULT '',
  email             TEXT DEFAULT '',
  member_type       TEXT NOT NULL DEFAULT 'staff' CHECK(member_type IN ('staff','worker')),
  role              TEXT DEFAULT '',
  worker_type       TEXT DEFAULT NULL,

  -- 身份证
  id_card           TEXT DEFAULT '',
  id_card_front     TEXT DEFAULT '',           -- 文件名
  id_card_back      TEXT DEFAULT '',            -- 文件名
  gender            TEXT DEFAULT NULL,
  ethnicity         TEXT DEFAULT NULL,
  birth_date        TEXT DEFAULT NULL,
  id_card_address   TEXT DEFAULT NULL,

  -- 劳动合同
  contract_file     TEXT DEFAULT '',
  contract_file_type TEXT DEFAULT '',

  -- 管理人员薪酬
  base_salary              REAL DEFAULT NULL,
  social_security_personal REAL DEFAULT NULL,
  social_security_company  REAL DEFAULT NULL,
  housing_fund             REAL DEFAULT NULL,
  housing_fund_personal    REAL DEFAULT NULL,
  other_allowances         REAL DEFAULT NULL,
  company_covers_social    INTEGER DEFAULT 0,  -- boolean

  -- 农民工专属（已迁移到 workers/project_workers，保留兼容）
  team_id                   INTEGER DEFAULT NULL,
  daily_wage                REAL DEFAULT NULL,
  entry_date                TEXT DEFAULT NULL,
  expected_leave_date       TEXT DEFAULT NULL,
  actual_leave_date         TEXT DEFAULT NULL,
  wage_bank_account         TEXT DEFAULT NULL,
  wage_bank_name            TEXT DEFAULT NULL,
  three_level_education     INTEGER DEFAULT 0,
  safety_training_file      TEXT DEFAULT '',
  health_report_file        TEXT DEFAULT '',
  special_certificate_file  TEXT DEFAULT '',
  status                    TEXT DEFAULT 'active' CHECK(status IN ('active','left')),
  leave_date                TEXT DEFAULT NULL,
  reentry_date              TEXT DEFAULT NULL,
  remarks                   TEXT DEFAULT '',

  -- 关联
  department_id   INTEGER DEFAULT NULL,
  position        TEXT DEFAULT NULL,
  project_id      INTEGER DEFAULT NULL,
  is_team_leader  INTEGER DEFAULT 0,

  created_at      TEXT DEFAULT (datetime('now'))
);

-- 全局工人信息库
CREATE TABLE IF NOT EXISTS workers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  id_card           TEXT NOT NULL UNIQUE,
  gender            TEXT DEFAULT NULL,
  birth_date        TEXT DEFAULT NULL,
  ethnicity         TEXT DEFAULT NULL,
  phone             TEXT DEFAULT NULL,
  address           TEXT DEFAULT NULL,
  bank_account      TEXT DEFAULT NULL,
  bank_name         TEXT DEFAULT NULL,
  bank_line_no      TEXT DEFAULT NULL,
  worker_type       TEXT DEFAULT NULL,
  daily_wage        REAL DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 班组
CREATE TABLE IF NOT EXISTS worker_teams (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  project_id        INTEGER NOT NULL,
  leader_id         INTEGER DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- 项目用工关系（Worker ↔ Project many-to-many）
CREATE TABLE IF NOT EXISTS project_workers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id         INTEGER NOT NULL,
  project_id        INTEGER NOT NULL,
  team_id           INTEGER DEFAULT NULL,
  daily_wage        REAL DEFAULT 0,
  worker_type       TEXT DEFAULT 'other',
  entry_date        TEXT DEFAULT '',
  status            TEXT DEFAULT 'active' CHECK(status IN ('active','left')),
  remarks           TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 工人调动记录
CREATE TABLE IF NOT EXISTS worker_transfer_records (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id         INTEGER NOT NULL,
  from_team_id      INTEGER NOT NULL,
  to_team_id        INTEGER NOT NULL,
  from_project_id   INTEGER NOT NULL,
  to_project_id     INTEGER NOT NULL,
  transfer_date     TEXT NOT NULL,
  reason            TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 项目成员关联
CREATE TABLE IF NOT EXISTS project_members (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  member_id         INTEGER NOT NULL,
  joined_at         TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 材料与费用
-- ============================================================

-- 材料
CREATE TABLE IF NOT EXISTS materials (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  name              TEXT NOT NULL,
  category          TEXT DEFAULT '',
  unit              TEXT DEFAULT '',
  quantity          REAL DEFAULT 0,
  price             REAL DEFAULT 0,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 费用
CREATE TABLE IF NOT EXISTS expenses (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  amount            REAL DEFAULT 0,
  category          TEXT DEFAULT '',
  description       TEXT DEFAULT '',
  date              TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 成本台账
-- ============================================================

-- 成本台账批次
CREATE TABLE IF NOT EXISTS cost_ledger_batches (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  name              TEXT NOT NULL,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 成本台账条目
CREATE TABLE IF NOT EXISTS cost_ledger (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  batch_id          INTEGER DEFAULT NULL,
  voucher_no        TEXT DEFAULT '',
  date              TEXT DEFAULT '',
  direction         TEXT NOT NULL CHECK(direction IN ('expense','income')),
  amount            REAL DEFAULT 0,
  category          TEXT DEFAULT '',
  summary           TEXT DEFAULT '',
  counterparty      TEXT DEFAULT '',
  channel           TEXT DEFAULT '',
  linked_invoice_id   INTEGER DEFAULT NULL,
  linked_invoice_status TEXT DEFAULT NULL,
  notes             TEXT DEFAULT NULL,
  attachments       TEXT DEFAULT '[]',        -- JSON 数组
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- 成本台账分类
CREATE TABLE IF NOT EXISTS cost_ledger_categories (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT DEFAULT '',
  label             TEXT NOT NULL,
  direction         TEXT NOT NULL CHECK(direction IN ('expense','income')),
  color             TEXT DEFAULT '',
  is_builtin        INTEGER DEFAULT 0,
  is_enabled        INTEGER DEFAULT 1,
  sort_order        INTEGER DEFAULT 0,
  level1            TEXT DEFAULT NULL
);

-- 成本台账匹配规则
CREATE TABLE IF NOT EXISTS cost_ledger_match_rules (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword           TEXT NOT NULL,
  category          TEXT NOT NULL,
  direction         TEXT NOT NULL CHECK(direction IN ('expense','income')),
  hit_count         INTEGER DEFAULT 0,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 图纸
-- ============================================================

CREATE TABLE IF NOT EXISTS drawings (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  name              TEXT NOT NULL,
  category          TEXT DEFAULT '',
  file_path         TEXT DEFAULT '',
  remarks           TEXT DEFAULT '',
  position          TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 合作单位 & 监管单位
-- ============================================================

-- 合作单位
CREATE TABLE IF NOT EXISTS partners (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  category          TEXT DEFAULT 'other',
  contact           TEXT DEFAULT '',
  phone             TEXT DEFAULT '',
  email             TEXT DEFAULT '',
  address           TEXT DEFAULT '',
  bank_account      TEXT DEFAULT '',
  bank_name         TEXT DEFAULT '',
  tax_number        TEXT DEFAULT '',
  credit_code       TEXT DEFAULT '',
  registered_address TEXT DEFAULT '',
  business_scope    TEXT DEFAULT '',
  tax_type          TEXT DEFAULT '',
  license_file      TEXT DEFAULT '',
  license_file_type TEXT DEFAULT '',
  other_files       TEXT DEFAULT '',
  other_files_type  TEXT DEFAULT '',
  project_ids       TEXT DEFAULT '[]',          -- JSON 数组
  remarks           TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- 地区
CREATE TABLE IF NOT EXISTS regions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  province          TEXT DEFAULT '',
  city              TEXT DEFAULT '',
  district          TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 监管单位
CREATE TABLE IF NOT EXISTS supervisors (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id         INTEGER DEFAULT NULL,
  name              TEXT NOT NULL,
  category          TEXT DEFAULT 'other',
  contact           TEXT DEFAULT '',
  phone             TEXT DEFAULT '',
  address           TEXT DEFAULT '',
  project_ids       TEXT DEFAULT '[]',          -- JSON 数组
  remarks           TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 合同管理
-- ============================================================

-- 收入合同
CREATE TABLE IF NOT EXISTS income_contracts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  partner_id        INTEGER NOT NULL,
  contract_no       TEXT DEFAULT '',
  name              TEXT NOT NULL,
  amount            REAL DEFAULT 0,
  signed_date       TEXT DEFAULT '',
  start_date        TEXT DEFAULT '',
  end_date          TEXT DEFAULT '',
  status            TEXT DEFAULT 'draft',
  payment_method     TEXT DEFAULT 'one_time',
  remarks           TEXT DEFAULT '',
  final_amount      REAL DEFAULT NULL,
  settlement_id     INTEGER DEFAULT NULL,
  file_url          TEXT DEFAULT NULL,
  file_type         TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- 收入记录
CREATE TABLE IF NOT EXISTS income_records (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id       INTEGER NOT NULL,
  amount            REAL DEFAULT 0,
  record_date       TEXT DEFAULT '',
  payer             TEXT DEFAULT '',
  remarks           TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 支出合同
CREATE TABLE IF NOT EXISTS expense_contracts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  partner_id        INTEGER NOT NULL,
  contract_no       TEXT DEFAULT '',
  name              TEXT NOT NULL,
  amount            REAL DEFAULT 0,
  signed_date       TEXT DEFAULT '',
  start_date        TEXT DEFAULT '',
  end_date          TEXT DEFAULT '',
  status            TEXT DEFAULT 'draft',
  payment_method     TEXT DEFAULT 'one_time',
  remarks           TEXT DEFAULT '',
  final_amount      REAL DEFAULT NULL,
  settlement_id     INTEGER DEFAULT NULL,
  file_url          TEXT DEFAULT NULL,
  file_type         TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- 支出记录
CREATE TABLE IF NOT EXISTS expense_records (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id       INTEGER NOT NULL,
  amount            REAL DEFAULT 0,
  record_date       TEXT DEFAULT '',
  payee             TEXT DEFAULT '',
  remarks           TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 其他协议
CREATE TABLE IF NOT EXISTS agreement_contracts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  partner_id        INTEGER NOT NULL,
  contract_no       TEXT DEFAULT '',
  name              TEXT NOT NULL,
  agreement_type    TEXT DEFAULT 'other',
  amount            REAL DEFAULT NULL,
  signed_date       TEXT DEFAULT '',
  start_date        TEXT DEFAULT '',
  end_date          TEXT DEFAULT '',
  status            TEXT DEFAULT 'draft',
  remarks           TEXT DEFAULT '',
  final_amount      REAL DEFAULT NULL,
  settlement_id     INTEGER DEFAULT NULL,
  file_url          TEXT DEFAULT NULL,
  file_type         TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 结算办理
-- ============================================================

CREATE TABLE IF NOT EXISTS settlements (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER DEFAULT NULL,
  contract_id       INTEGER DEFAULT NULL,
  partner_id        INTEGER DEFAULT NULL,
  type              TEXT NOT NULL CHECK(type IN ('income','expense')),
  sub_type          TEXT DEFAULT NULL,
  status            TEXT DEFAULT 'draft',
  settlement_no     TEXT DEFAULT '',
  name              TEXT NOT NULL,
  amount            REAL DEFAULT 0,
  settlement_date   TEXT DEFAULT NULL,
  period_start      TEXT DEFAULT NULL,
  period_end        TEXT DEFAULT NULL,
  submitted_by      TEXT DEFAULT '',
  submitted_at      TEXT DEFAULT '',
  approved_by       TEXT DEFAULT '',
  approved_at       TEXT DEFAULT '',
  paid_at           TEXT DEFAULT '',
  remarks           TEXT DEFAULT '',
  items             TEXT DEFAULT '[]',          -- JSON 数组
  files             TEXT DEFAULT '[]',          -- JSON 数组
  file_url          TEXT DEFAULT NULL,
  file_name         TEXT DEFAULT NULL,
  file_type         TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 发票管理
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  type              TEXT NOT NULL CHECK(type IN ('invoice_in','invoice_out')),
  status            TEXT DEFAULT 'issued',
  invoice_kind      TEXT DEFAULT 'paper_special',
  invoice_no        TEXT DEFAULT '',
  invoice_code      TEXT DEFAULT '',
  name              TEXT DEFAULT '',
  amount            REAL DEFAULT 0,
  tax_amount        REAL DEFAULT 0,
  price_amount      REAL DEFAULT 0,
  tax_rate          REAL DEFAULT 0,
  issue_date        TEXT DEFAULT '',
  seller_id         INTEGER DEFAULT NULL,
  buyer_id          INTEGER DEFAULT NULL,
  settlement_id     INTEGER DEFAULT NULL,
  project_id        INTEGER DEFAULT NULL,
  contract_id       INTEGER DEFAULT NULL,
  received_amount   REAL DEFAULT 0,
  file_url          TEXT DEFAULT NULL,
  file_type         TEXT DEFAULT NULL,
  remarks           TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- 发票明细
CREATE TABLE IF NOT EXISTS invoice_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id        INTEGER NOT NULL,
  description       TEXT DEFAULT '',
  specifications    TEXT DEFAULT '',
  unit              TEXT DEFAULT '',
  quantity          REAL DEFAULT 0,
  unit_price        REAL DEFAULT 0,
  amount            REAL DEFAULT 0,
  tax_rate          REAL DEFAULT 0,
  tax_amount        REAL DEFAULT 0
);

-- ============================================================
-- 收款记录
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_records (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  type              TEXT NOT NULL CHECK(type IN ('invoice_in','invoice_out')),
  amount            REAL DEFAULT 0,
  record_date       TEXT DEFAULT '',
  project_id        INTEGER DEFAULT NULL,
  partner_id        INTEGER DEFAULT NULL,
  contract_id       INTEGER DEFAULT NULL,
  invoice_details   TEXT DEFAULT '[]',          -- JSON 数组
  remarks           TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now')),
  file_url          TEXT DEFAULT NULL,
  file_type         TEXT DEFAULT NULL
);

-- ============================================================
-- 进销存
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT DEFAULT '',
  name              TEXT NOT NULL,
  category          TEXT DEFAULT '',
  unit              TEXT DEFAULT '',
  specifications    TEXT DEFAULT '',
  purchase_price    REAL DEFAULT 0,
  sale_price        REAL DEFAULT 0,
  current_stock     REAL DEFAULT 0,
  min_stock         REAL DEFAULT 0,
  max_stock         REAL DEFAULT 0,
  supplier_id       INTEGER DEFAULT NULL,
  remarks           TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id           INTEGER NOT NULL,
  type              TEXT NOT NULL CHECK(type IN ('purchase','sale','adjustment','return_in','return_out')),
  quantity          REAL DEFAULT 0,
  unit_price        REAL DEFAULT 0,
  total_amount      REAL DEFAULT 0,
  project_id        INTEGER DEFAULT NULL,
  contract_id       INTEGER DEFAULT NULL,
  counterparty_id   INTEGER DEFAULT NULL,
  transaction_date  TEXT DEFAULT '',
  document_no       TEXT DEFAULT '',
  remarks           TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 模板
-- ============================================================

-- 旧版合同模板
CREATE TABLE IF NOT EXISTS contract_templates (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  type              TEXT DEFAULT 'other',
  description       TEXT DEFAULT '',
  file_path         TEXT DEFAULT '',
  file_name         TEXT DEFAULT '',
  variables         TEXT DEFAULT '[]',          -- JSON 数组
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- 新版通用模板
CREATE TABLE IF NOT EXISTS templates (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  category          TEXT DEFAULT 'other',
  description       TEXT DEFAULT '',
  file_name         TEXT DEFAULT '',
  stored_file_name  TEXT DEFAULT '',
  file_type         TEXT DEFAULT 'docx',
  variables         TEXT DEFAULT '[]',          -- JSON 数组
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 考勤管理
-- ============================================================

CREATE TABLE IF NOT EXISTS attendances (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id         INTEGER DEFAULT NULL,
  project_worker_id INTEGER DEFAULT NULL,
  project_id        INTEGER NOT NULL,
  member_name       TEXT DEFAULT NULL,
  year_month        TEXT NOT NULL,               -- "YYYY-MM"
  work_days         INTEGER DEFAULT 0,
  days_off          INTEGER DEFAULT 0,
  is_full_attendance INTEGER DEFAULT 0,
  daily_status      TEXT DEFAULT '{}',          -- JSON: Record<number, DayStatus>
  file_url          TEXT DEFAULT NULL,
  file_name         TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 工资管理
-- ============================================================

CREATE TABLE IF NOT EXISTS wages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  member_id         INTEGER DEFAULT NULL,
  project_worker_id INTEGER DEFAULT NULL,
  year_month        TEXT NOT NULL,               -- "YYYY-MM"
  daily_wage        REAL DEFAULT 0,
  work_days         INTEGER DEFAULT 0,
  bonus             REAL DEFAULT 0,
  deduction         REAL DEFAULT 0,
  actual_wage       REAL DEFAULT 0,
  paid_amount       REAL DEFAULT NULL,
  paid_date         TEXT DEFAULT NULL,
  bank_receipt_path TEXT DEFAULT NULL,
  payment_locked    INTEGER DEFAULT 0,
  member_name       TEXT DEFAULT NULL,
  member_type       TEXT DEFAULT NULL,
  bank_account      TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- 薪资历史
CREATE TABLE IF NOT EXISTS salary_history (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id         INTEGER NOT NULL,
  effective_date    TEXT NOT NULL,
  base_salary       REAL DEFAULT 0,
  subsidy           REAL DEFAULT 0,
  subsidy_note      TEXT DEFAULT '',
  note              TEXT DEFAULT '',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- 工人日工资历史
CREATE TABLE IF NOT EXISTS wage_history (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_worker_id INTEGER NOT NULL,
  year_month        TEXT NOT NULL,
  daily_wage        REAL DEFAULT 0,
  note              TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 用户 & 权限
-- ============================================================

-- 用户
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,             -- string ID (e.g., 'admin-1234')
  username          TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  password_salt     TEXT NOT NULL,
  password_hash_version INTEGER DEFAULT 1,
  role_id           TEXT NOT NULL DEFAULT 'worker',
  status            TEXT DEFAULT 'active' CHECK(status IN ('active','disabled')),
  display_name      TEXT NOT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  last_login_at     TEXT DEFAULT NULL,
  must_change_password INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until      TEXT DEFAULT NULL
);

-- 角色
CREATE TABLE IF NOT EXISTS roles (
  id                TEXT PRIMARY KEY,             -- 'admin','manager','accountant','worker'
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  is_system         INTEGER DEFAULT 0,
  permissions       TEXT DEFAULT '[]'             -- JSON 数组
);

-- ============================================================
-- 审计日志
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  action            TEXT NOT NULL,
  level             TEXT DEFAULT 'info',
  user_id           TEXT DEFAULT NULL,
  user_name         TEXT DEFAULT NULL,
  resource_type     TEXT DEFAULT NULL,
  resource_id       TEXT DEFAULT NULL,
  details           TEXT DEFAULT NULL,            -- JSON 或文本
  ip_address        TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 任务（保留兼容，实际未使用）
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT DEFAULT '',
  status            TEXT DEFAULT 'pending',
  assigned_to       TEXT DEFAULT NULL,
  due_date          TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 配置表
-- ============================================================

-- SQLite 引擎配置（读取模式、功能开关等）
CREATE TABLE IF NOT EXISTS app_config (
  key               TEXT PRIMARY KEY,
  value             TEXT NOT NULL,
  updated_at        TEXT DEFAULT (datetime('now'))
);
`

// ═══════════════════════════════════════════════════════════════════════════════
// 索引定义
// ═══════════════════════════════════════════════════════════════════════════════

const CREATE_INDEXES_SQL = `
-- 项目
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 人员
CREATE INDEX IF NOT EXISTS idx_members_type ON members(member_type);
CREATE INDEX IF NOT EXISTS idx_members_department ON members(department_id);
CREATE INDEX IF NOT EXISTS idx_members_project ON members(project_id);
CREATE INDEX IF NOT EXISTS idx_members_team ON members(team_id);
CREATE INDEX IF NOT EXISTS idx_members_id_card ON members(id_card);

-- 工人
CREATE INDEX IF NOT EXISTS idx_workers_id_card ON workers(id_card);

-- 班组
CREATE INDEX IF NOT EXISTS idx_worker_teams_project ON worker_teams(project_id);

-- 项目用工
CREATE INDEX IF NOT EXISTS idx_project_workers_worker ON project_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_project_workers_project ON project_workers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_workers_team ON project_workers(team_id);
CREATE INDEX IF NOT EXISTS idx_project_workers_status ON project_workers(status);

-- 调动记录
CREATE INDEX IF NOT EXISTS idx_transfer_records_worker ON worker_transfer_records(worker_id);

-- 项目成员
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_member ON project_members(member_id);

-- 成本台账
CREATE INDEX IF NOT EXISTS idx_cost_ledger_project ON cost_ledger(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_batch ON cost_ledger(batch_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_date ON cost_ledger(date);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_direction ON cost_ledger(direction);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_category ON cost_ledger(category);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_batches_project ON cost_ledger_batches(project_id);

-- 合同
CREATE INDEX IF NOT EXISTS idx_income_contracts_project ON income_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_income_contracts_partner ON income_contracts(partner_id);
CREATE INDEX IF NOT EXISTS idx_income_records_contract ON income_records(contract_id);
CREATE INDEX IF NOT EXISTS idx_expense_contracts_project ON expense_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_contracts_partner ON expense_contracts(partner_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_contract ON expense_records(contract_id);
CREATE INDEX IF NOT EXISTS idx_agreement_contracts_project ON agreement_contracts(project_id);

-- 发票
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_seller ON invoices(seller_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer ON invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- 收款
CREATE INDEX IF NOT EXISTS idx_payment_records_type ON payment_records(type);
CREATE INDEX IF NOT EXISTS idx_payment_records_project ON payment_records(project_id);

-- 结算
CREATE INDEX IF NOT EXISTS idx_settlements_project ON settlements(project_id);
CREATE INDEX IF NOT EXISTS idx_settlements_type ON settlements(type);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);

-- 工资
CREATE INDEX IF NOT EXISTS idx_wages_project ON wages(project_id);
CREATE INDEX IF NOT EXISTS idx_wages_year_month ON wages(year_month);
CREATE INDEX IF NOT EXISTS idx_wages_member ON wages(member_id);
CREATE INDEX IF NOT EXISTS idx_wages_project_worker ON wages(project_worker_id);
CREATE INDEX IF NOT EXISTS idx_wages_paid_date ON wages(paid_date);

-- 考勤
CREATE INDEX IF NOT EXISTS idx_attendances_member ON attendances(member_id);
CREATE INDEX IF NOT EXISTS idx_attendances_project ON attendances(project_id);
CREATE INDEX IF NOT EXISTS idx_attendances_year_month ON attendances(year_month);

-- 薪资历史
CREATE INDEX IF NOT EXISTS idx_salary_history_member ON salary_history(member_id);
CREATE INDEX IF NOT EXISTS idx_wage_history_project_worker ON wage_history(project_worker_id);

-- 审计日志
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- 进销存
CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project ON inventory_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date);

-- 图纸
CREATE INDEX IF NOT EXISTS idx_drawings_project ON drawings(project_id);

-- 合作/监管单位
CREATE INDEX IF NOT EXISTS idx_partners_category ON partners(category);
CREATE INDEX IF NOT EXISTS idx_supervisors_region ON supervisors(region_id);
`

// ═══════════════════════════════════════════════════════════════════════════════
// 初始化函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 初始化 SQLite 数据库
 * @param dataPath 数据目录路径（与 JSON 数据库相同的目录）
 * @returns Database 实例
 */
export function initSqliteDb(dataPath: string): any {
  const dbPath = path.join(dataPath, 'engineering.db')
  log.info('[SQLite] Initializing database:', dbPath)

  const Database = getDatabase()
  db = new Database(dbPath)

  // 启用 WAL 模式：支持并发读取，写入不阻塞读
  db.pragma('journal_mode = WAL')
  // 启用外键约束
  db.pragma('foreign_keys = ON')
  // 写入性能优化
  db.pragma('synchronous = NORMAL')
  // 内存映射读取（256MB）
  db.pragma('mmap_size = 268435456')
  // 缓存大小（10MB）
  db.pragma('cache_size = -10000')

  // 创建所有表
  db.exec(CREATE_TABLES_SQL)
  log.info('[SQLite] Tables created/verified')

  // 创建所有索引
  db.exec(CREATE_INDEXES_SQL)
  log.info('[SQLite] Indexes created/verified')

  // Schema 版本管理
  const version = ensureSchemaVersionTable(db)
  log.info('[SQLite] Schema version:', version)

  return db
}

/**
 * 获取 SQLite 数据库实例
 * @throws 如果数据库未初始化
 */
export function getSqliteDb(): any {
  if (!db) {
    throw new Error('[SQLite] Database not initialized. Call initSqliteDb() first.')
  }
  return db
}

/**
 * 关闭 SQLite 数据库
 */
export function closeSqliteDb(): void {
  if (db) {
    // WAL 模式下需要 checkpoint 确保数据写入
    db.pragma('wal_checkpoint(TRUNCATE)')
    db.close()
    db = null
    log.info('[SQLite] Database closed')
  }
}

/**
 * 检查 SQLite 数据库是否已初始化
 */
export function isSqliteReady(): boolean {
  return db !== null
}

/**
 * 获取数据库文件路径
 */
export function getSqliteDbPath(): string | null {
  if (!db) return null
  return (db as any).name ?? null
}

/**
 * 获取各表行数统计
 */
export function getSqliteSummary(): Record<string, number> {
  if (!db) return {}
  const tables = [
    'projects', 'members', 'materials', 'expenses',
    'cost_ledger', 'cost_ledger_batches', 'cost_ledger_categories',
    'drawings', 'partners', 'regions', 'supervisors',
    'income_contracts', 'income_records',
    'expense_contracts', 'expense_records',
    'agreement_contracts',
    'worker_teams', 'worker_transfer_records',
    'settlements', 'invoices', 'invoice_items',
    'payment_records',
    'inventory_items', 'inventory_transactions',
    'wages', 'attendances',
    'project_members', 'project_workers',
    'workers', 'departments',
    'salary_history', 'wage_history',
    'audit_logs', 'users', 'roles',
    'templates', 'contract_templates',
    'tasks',
  ]
  const summary: Record<string, number> = {}
  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get() as { count: number }
      summary[table] = row.count
    } catch {
      summary[table] = -1  // 表不存在
    }
  }
  return summary
}
