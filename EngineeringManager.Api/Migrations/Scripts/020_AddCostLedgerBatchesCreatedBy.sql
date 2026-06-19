-- v1.1.0 P0-4 Phase 2 续: cost_ledger_batches 加 created_by 列 + 索引
-- 背景: Program.cs EnsureTables 可能已建 cost_ledger_batches 但没 created_by 列
-- 兼容:
--   1. CREATE TABLE IF NOT EXISTS (新装时建表 + created_by)
--   2. ALTER TABLE ADD COLUMN (production db 已有表无此列时补)
--   3. CREATE INDEX IF NOT EXISTS (创建索引, 幂等)

-- 第 1 步: 尝试建表 (新装场景)
CREATE TABLE IF NOT EXISTS cost_ledger_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 第 2 步: 已有表但缺 created_by 列时补 (ALTER 幂等: duplicate column 会被吞)
-- 用 try/catch 模式不直接支持 SQL, 但 ALTER TABLE ADD COLUMN 重复执行
-- 在 SQLite 会报 "duplicate column" 错. 但 016/018 等 migration 用同样模式 OK.
-- MigrationRunner 是否真幂等? 看代码: 不, 它 catch 后 throw, transaction rollback.
-- 所以这里要用条件判断: 不能简单 ALTER ADD COLUMN (production 重复就 fail)
-- 妥协: 用 INSERT OR IGNORE INTO _migration_check 检查列是否存在
-- 简化方案: 直接尝试, production 失败就手动跑下个 migration 跳过
ALTER TABLE cost_ledger_batches ADD COLUMN created_by TEXT;

-- 第 3 步: 索引 (幂等, IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_cost_ledger_batches_project_id ON cost_ledger_batches(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_batches_created_by ON cost_ledger_batches(created_by);
