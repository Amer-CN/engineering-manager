-- ============================================================
-- v0.77.0 阶段 1: 新增 2 张 cloud sync 基础设施表
-- 来源: docs/design/cloud-sync-design.md §阶段 1
-- 设计: 阶段 1 只建表 + 加 CRUD helper, 不实际写 sync_queue 行
--        阶段 2 推/拉同步时 INSERT sync_queue (INSERT/UPDATE/DELETE 后)
--
-- sync_queue:
--   本地待同步写操作队列, 每条记录一次写操作
--   阶段 2 sync worker 定时: SELECT pending -> POST 云端 -> DELETE 成功行
--   payload: JSON 序列化的行快照 (避免云端拉历史重建)
--   attempt_count: 失败重试计数 (阶段 2 限流用)
--   last_error: 最近一次失败原因 (UI 调试用)
--
-- device_registrations:
--   多设备注册表, 一行 = 一台设备
--   device_id: 32 位随机 hex (客户端首次启动生成, 存 %APPDATA%\工程管家\device.id)
--   user_id: 设备绑定的用户 (一个用户可多设备, 一设备不可多用户)
--   refresh_token_hash: refresh token 的 SHA-256 哈希 (明文 token 不存)
--   last_seen_at: 设备最近活跃时间 (每次登录/写操作更新)
-- ============================================================

-- sync_queue 表
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    row_id INTEGER NOT NULL,
    operation TEXT NOT NULL,        -- 'insert' / 'update' / 'delete'
    payload TEXT,                    -- JSON 序列化的行快照
    device_id TEXT,                  -- 操作发生的设备 ID
    user_id TEXT,                    -- 操作者 (来自 JWT, 防伪造)
    version INTEGER NOT NULL,        -- 写入时的乐观锁版本 (阶段 2 冲突检测用)
    enqueued_at TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    last_attempt_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_table_row ON sync_queue(table_name, row_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_enqueued ON sync_queue(enqueued_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_device ON sync_queue(device_id);

-- device_registrations 表
CREATE TABLE IF NOT EXISTS device_registrations (
    device_id TEXT PRIMARY KEY,         -- 32 位随机 hex (客户端生成)
    user_id INTEGER NOT NULL,           -- 绑定用户 (一个用户可多设备)
    device_name TEXT,                   -- 用户起的名字 (e.g. "工地板房电脑")
    device_type TEXT,                   -- 'desktop' / 'mobile' / 'web'
    os_info TEXT,                       -- OS 版本 (e.g. "Windows 11 23H2")
    app_version TEXT,                   -- 注册时的 app 版本 (升级追踪用)
    registered_at TEXT NOT NULL,
    last_seen_at TEXT,                  -- 最近活跃时间 (每次登录/写更新)
    refresh_token_hash TEXT,            -- refresh token 的 SHA-256 (阶段 2 用)
    refresh_token_expires_at TEXT,      -- refresh token 过期时间
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_device_registrations_user ON device_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_device_registrations_active ON device_registrations(is_active);