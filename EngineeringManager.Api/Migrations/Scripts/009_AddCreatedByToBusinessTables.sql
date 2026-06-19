-- v1.1.0 P0-4 完整版: 19 个业务表加 created_by TEXT 列 + 索引
-- ALTER TABLE ADD COLUMN 是幂等的（MigrationRunner 自动吞"duplicate column name"）
-- 所有 created_by 为 NULL 的旧记录：admin 可见 + 项目成员可见，普通用户不可见（SELECT 端点处理）

-- 项目相关
ALTER TABLE projects ADD COLUMN created_by TEXT;
ALTER TABLE project_members ADD COLUMN created_by TEXT;
ALTER TABLE project_workers ADD COLUMN created_by TEXT;

-- 合同相关
ALTER TABLE income_contracts ADD COLUMN created_by TEXT;
ALTER TABLE expense_contracts ADD COLUMN created_by TEXT;
ALTER TABLE agreement_contracts ADD COLUMN created_by TEXT;

-- 工资相关
ALTER TABLE wages ADD COLUMN created_by TEXT;

-- 考勤相关
ALTER TABLE attendances ADD COLUMN created_by TEXT;

-- 工人/人事相关
ALTER TABLE members ADD COLUMN created_by TEXT;
ALTER TABLE workers ADD COLUMN created_by TEXT;

-- 单位相关
ALTER TABLE partners ADD COLUMN created_by TEXT;
ALTER TABLE supervisors ADD COLUMN created_by TEXT;

-- 库存相关
ALTER TABLE inventory_items ADD COLUMN created_by TEXT;
ALTER TABLE inventory_transactions ADD COLUMN created_by TEXT;
ALTER TABLE materials ADD COLUMN created_by TEXT;

-- 费用/图纸相关
ALTER TABLE expenses ADD COLUMN created_by TEXT;
ALTER TABLE drawings ADD COLUMN created_by TEXT;

-- 索引（高频查询：created_by 单列）
CREATE INDEX IF NOT EXISTS idx_income_contracts_created_by ON income_contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_expense_contracts_created_by ON expense_contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_agreement_contracts_created_by ON agreement_contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_wages_created_by ON wages(created_by);
CREATE INDEX IF NOT EXISTS idx_attendances_created_by ON attendances(created_by);
CREATE INDEX IF NOT EXISTS idx_members_created_by ON members(created_by);
CREATE INDEX IF NOT EXISTS idx_workers_created_by ON workers(created_by);
CREATE INDEX IF NOT EXISTS idx_partners_created_by ON partners(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by ON inventory_items(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_by ON inventory_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_drawings_created_by ON drawings(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_workers_created_by ON project_workers(created_by);
CREATE INDEX IF NOT EXISTS idx_supervisors_created_by ON supervisors(created_by);

