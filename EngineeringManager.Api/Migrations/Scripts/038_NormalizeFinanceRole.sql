-- 038: finance → accountant 角色 id 归一（窗口 H P1）
--
-- 背景：001 种子角色 id 是 finance，而 GetDefaultPermissions / 037 / HasPermission
--      （CurrentUser）全部用 accountant。任何迁移都没建过 accountant 行——001 时代
--      的老库没有该行，G2 后财务用户对所有写端点 fail-closed 403。
--      B2 测试里的补建行只是测试临时方案，生产库要正式迁移（本迁移落地后顺手清掉
--      该临时方案，见 H-1 commit）。
--
-- 语义（顺序不可换；幂等、守卫，可在任意库态安全重跑）：
--   a. 无 accountant 行 → 建（id='accountant', name='财务',
--      permissions = GetDefaultPermissions("accountant") 的 JSON——从 Common.cs
--      原样提取，不做任何手改）；已有 accountant 行 → INSERT OR IGNORE 跳过。
--   b. UPDATE users SET role_id='accountant' WHERE role_id='finance'
--      （finance 用户重映射到 accountant；两角色权限内容不同，但这是 id 归一
--      不是角色重设计——finance 用户从此按 accountant 的权限集执行）
--   c. 两个 id 的行都存在 → finance 行的用户已被 b 重映射后，
--      DELETE FROM roles WHERE id='finance'。
--   d. 全程不动其他角色行、不动权限内容本身。
--
-- 影响的库态分类（各自行为）：
--   仅 finance        → a 建 accountant → b 重映射 finance 用户 → c 删 finance
--   仅 accountant     → a 跳过 → b 无行可改 → c 无 finance 行可删（无操作）
--   两者皆有          → a 跳过 → b 重映射 finance 用户 → c 删 finance
--   两者皆无（全新库）→ a 建 accountant → b/c 无操作 → 与全新库种子一致
--
-- 幂等论证：a 用 INSERT OR IGNORE（PK 冲突跳过）；b/c 的 UPDATE/DELETE 条件命中
--   行已不存在则自然无操作；连跑两次不报错不重复。

-- a. 确保 accountant 行存在（permissions 从 Common.GetDefaultPermissions("accountant") 原样提取）
INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at) VALUES
('accountant', '财务', '["dashboard:read","projects:read","contracts:read","contracts:export","members:read","wages:create","wages:read","wages:update","settlement:read","settlement:approve","invoices:create","invoices:read","invoices:update","costLedger:create","costLedger:read","costLedger:update","settings:read","audit_logs:read","audit_logs:export","reports:create","reports:read","labor:read"]', 1, datetime('now'));

-- b. finance 用户重映射到 accountant（先于 c，保证 c 删除 finance 行时无悬空引用）
UPDATE users SET role_id='accountant' WHERE role_id='finance';

-- c. finance 角色行退役（b 已把其用户全部重映射）
DELETE FROM roles WHERE id='finance';
