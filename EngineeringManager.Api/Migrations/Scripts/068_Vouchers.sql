-- ============================================================
-- 068: 凭证草稿（T6a）
-- 本轮只落草稿：不提供过账/反过账/凭证编辑，vouchers.status 恒为 'draft'。
-- 凭证号 记-YYYYMM-#### 由 [voucher_sequences] 按期间在同一事务内分配。
-- 金额一律 INTEGER 分（项目红线）；表名 [] 包裹。
-- 幂等：CREATE IF NOT EXISTS。
-- ============================================================

CREATE TABLE IF NOT EXISTS [vouchers] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [voucher_no] TEXT NOT NULL UNIQUE,
  [voucher_date] TEXT NOT NULL,
  [period] TEXT NOT NULL,                 -- YYYYMM
  [source_type] TEXT NOT NULL,            -- 'invoice'
  [source_id] INTEGER NOT NULL,
  [project_id] INTEGER,
  [status] TEXT NOT NULL DEFAULT 'draft', -- 本轮只有 draft
  [template_code] TEXT NOT NULL,
  [total_debit_fen] INTEGER NOT NULL,
  [total_credit_fen] INTEGER NOT NULL,
  [created_by] TEXT,
  [created_at] TEXT DEFAULT (datetime('now'))
);
-- 同一来源（本轮=发票）只能有一张凭证草稿；重复生成由端点转 400。
CREATE UNIQUE INDEX IF NOT EXISTS [ux_vouchers_source] ON [vouchers]([source_type],[source_id]);
CREATE INDEX IF NOT EXISTS [idx_vouchers_period] ON [vouchers]([period]);

CREATE TABLE IF NOT EXISTS [voucher_entries] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [voucher_id] INTEGER NOT NULL,
  [line_no] INTEGER NOT NULL,
  [dc] INTEGER NOT NULL,                  -- 1=借, -1=贷
  [account_code] TEXT NOT NULL,
  [account_name] TEXT NOT NULL,
  [summary] TEXT,
  [amount_fen] INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS [idx_voucher_entries_voucher] ON [voucher_entries]([voucher_id]);

CREATE TABLE IF NOT EXISTS [voucher_sequences] (
  [period] TEXT PRIMARY KEY,
  [next_no] INTEGER NOT NULL DEFAULT 1
);
