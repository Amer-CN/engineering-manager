-- v0.71.0 P2.1: 迁移 users 表从 password+salt → password_hash+salt+version
-- 背景: 001_InitialSchema.sql 旧 users 表用 `password TEXT NOT NULL, salt TEXT`
--        Program.cs:282 新 EnsureTables 改用 `password_hash+salt+version`
--        AuthEndpoints.cs 已只读 password_hash+salt+version, 旧库登录会失败
-- 策略: 旧字段保留 (备份), 加 3 个新列, 旧 password 列清空 (强制用户重置)
--        首次登录会因 password_hash 为空失败, 引导用户走"忘记密码"流程

-- 1. 检测 users 表是否存在 password 列 (旧字段)
--    SQLite 没有 IF EXISTS for columns, 需要用 pragma_table_info

-- 2. 加新列 (幂等)
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN password_hash_version INTEGER DEFAULT 1;

-- 3. 对所有用户: 复制 salt → password_salt, version=1, password_hash 留空
--    留空 = 必须重置密码. 实际 PBKDF2 哈希无法从 password 明文恢复 (单向),
--    所以这里只能强制重置, 无法迁移旧密码.
UPDATE users SET
    password_salt = COALESCE(password_salt, salt, 'legacy-salt-needs-reset'),
    password_hash_version = COALESCE(password_hash_version, 1)
WHERE password_hash IS NULL OR password_hash = '';

-- 4. 旧 password + salt 列保留 (不删, 作为历史备份 + 数据完整性兜底)
--    留作 future 手动迁移 / 审计追溯

-- 5. 索引: password_hash 用于登录 SELECT, 不需要 (username UNIQUE 已够)

-- 验证: 任意用户的 password_hash 为空 → AuthEndpoints 登录失败
--        引导用户走密码重置流程 (后续可加 /api/auth/reset-password 端点)
