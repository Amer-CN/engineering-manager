-- ============================================================
-- 075: 期间锁定（T7c）
-- 锁定某期间后：禁止新增凭证、过账、反过账、删除草稿、保存期初余额。
-- 完整损益结转不做（明确边界）；解锁动作由 admin 执行并落审计。
-- ============================================================

CREATE TABLE IF NOT EXISTS [period_locks] (
  [period] TEXT PRIMARY KEY,              -- YYYYMM
  [locked_at] TEXT NOT NULL,
  [locked_by] TEXT,
  [reason] TEXT
);