-- 033_AddUserProfileFields.sql
-- M-EDITION1 步骤 4.1 (原编号 034, 因 origin/master 032 冲突重编): 个人版个人资料新增字段
-- 幂等: ALTER TABLE ADD COLUMN 在列已存在时抛异常, 由 MigrationRunner try-catch 跳过

ALTER TABLE users ADD COLUMN company_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN position TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN specialty TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN business_description TEXT DEFAULT '';
