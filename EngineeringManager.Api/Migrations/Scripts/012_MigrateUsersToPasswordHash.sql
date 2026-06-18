-- v0.71.0 P2.1: 迁移 users 表从 password+salt → password_hash+salt+version
-- 背景: 001_InitialSchema.sql 旧 users 表用 `password TEXT NOT NULL, salt TEXT`
--        Program.cs:282 新 EnsureTables 改用 `password_hash+salt+version` (新 schema 无 salt 列)
--        AuthEndpoints.cs 已只读 password_hash+salt+version, 旧库登录会失败
-- 策略: 
--   1) 加 3 个新列 (幂等, MigrationRunner 吞 duplicate)
--   2) 旧字段保留 (备份) - 如果有 salt 列, 复制到 password_salt
--   3) password_hash 留空 = 强制重置
-- 注意: 实际老库可能有 salt 列 (从 001 升级) 或无 salt 列 (新装)
--      本脚本只操作 password_salt, 不会触发 "no such column" 错误

-- 1. 加新列 (幂等)
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN password_hash_version INTEGER DEFAULT 1;

-- 2. 仅在 password_hash 为空时初始化 password_salt (兼容新老库)
--    新库: password_salt 已有值 (登录时设), 不覆盖
--    老库 (有 salt 列): 复制 salt 到 password_salt
--    老库 (无 salt 列): 用 legacy-salt 占位
UPDATE users SET
    password_salt = COALESCE(password_salt, "legacy-salt-needs-reset"),
    password_hash_version = COALESCE(password_hash_version, 1)
WHERE password_hash IS NULL OR password_hash = '';

-- 3. 旧 password + salt 列保留 (不删, 作为历史备份)

-- 验证: 任意用户的 password_hash 为空 → AuthEndpoints 登录失败
--        引导用户走 /api/auth/reset-password 端点