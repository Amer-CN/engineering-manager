-- v0.76.0 累计待办 #5: PII 列级 key rotation
-- 引入 pii_keys 表存多个 DPAPI 加密的 master key，支持轮换。
-- key_id: 自增主键，单调递增 = 创建顺序
-- is_active: 1 = 当前写入使用；0 = 历史 key (只读)
-- retired_at: 退役时间，NULL = 仍在使用
-- encrypted_key: DPAPI 加密的 32 字节 AES key (CurrentUser scope)
-- created_at: 创建时间
-- created_by: 操作人 user_id (admin)

CREATE TABLE IF NOT EXISTS pii_keys (
    key_id INTEGER PRIMARY KEY AUTOINCREMENT,
    encrypted_key BLOB NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    created_by TEXT,
    retired_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pii_keys_active ON pii_keys(is_active);

-- 注: 升级到 v0.76.0 后的首次启动, PiiProtector 构造函数会检查 pii_keys 是否空:
--   - 空: 把 %APPDATA%\工程管家\pp.key 导入, 写入 key_id=1, is_active=1
--   - 非空: 跳过导入, 加载所有 key 用于解密历史密文

-- 密文格式升级 (兼容 v1.2.0 旧密文):
--   旧 (v1.2.0, 无 version): base64(nonce[12] || tag[16] || ciphertext)
--   新 (v0.76.0, 带 version): base64(version[1] || nonce[12] || tag[16] || ciphertext)
--   解密时: 读首字节 = version, 找对应 key; 无 version 字节 → fallback 到 key_id=1 (legacy)