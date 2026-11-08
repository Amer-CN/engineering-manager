-- ============================================================
-- 057: settlements 质保金三列（JS03 / Wave 1B-2，业务口径）
-- 背景：结算模块现为纯业务口径（无会计科目列，与 JS02 解耦相符）；
-- 质保金状态机缺失。本脚本在 settlements 表加三列：
-- retention_amount INTEGER（分，MoneyUnit 口径）、
-- retention_due_date TEXT（YYYY-MM-DD）、
-- retention_status TEXT（in_warranty/质保期内、due_to_collect/已到期待收、
-- released/已释放；NULL=无质保）。
-- 到期派生放前端 util（due_date<今天→due_to_collect），released 显式写；
-- 不得复用 status 列（它被 process/unarchive 当归档位用）。
-- 幂等：ALTER ADD COLUMN 重复跑 → duplicate column name 被
-- MigrationRunner 良性吞掉；索引用 IF NOT EXISTS。
-- 表名 [] 包裹（项目红线）；金额列 INTEGER（分，红线 1）。
-- ============================================================

ALTER TABLE [settlements] ADD COLUMN [retention_amount] INTEGER;
ALTER TABLE [settlements] ADD COLUMN [retention_due_date] TEXT;
ALTER TABLE [settlements] ADD COLUMN [retention_status] TEXT;

CREATE INDEX IF NOT EXISTS [idx_settlements_retention_status] ON [settlements]([retention_status]);
CREATE INDEX IF NOT EXISTS [idx_settlements_retention_due] ON [settlements]([retention_due_date]);
