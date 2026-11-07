-- ============================================================
-- 074: 期初余额（T7b）
-- 建账期初：按期间 + 科目记录借方/贷方期初（INTEGER 分）。
-- 同一期间同一科目唯一；保存为「整期替换」，由端点在同一事务内完成并落审计。
-- 金额一律 INTEGER 分（项目红线）；表名 [] 包裹。
-- ============================================================

CREATE TABLE IF NOT EXISTS [opening_balances] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [period] TEXT NOT NULL,                 -- YYYYMM（建账启用期间）
  [account_code] TEXT NOT NULL,
  [account_name] TEXT NOT NULL DEFAULT '',
  [debit_fen] INTEGER NOT NULL DEFAULT 0,
  [credit_fen] INTEGER NOT NULL DEFAULT 0,
  [created_by] TEXT,
  [created_at] TEXT DEFAULT (datetime('now')),
  [updated_at] TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS [ux_opening_balances_period_account]
  ON [opening_balances]([period],[account_code]);
CREATE INDEX IF NOT EXISTS [idx_opening_balances_period]
  ON [opening_balances]([period]);