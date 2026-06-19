-- v0.75.0: User preferences 持久化表
-- 替代 localStorage: 多设备同步 + admin 可控
-- 当前支持的偏好:
--   pii_mask_enabled: PII 字段默认是否 mask (true=mask 默认, false=显示明文)
-- 主键: (user_id, key) 复合主键
-- value: TEXT (偏好值, 通常 "true"/"false")

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
