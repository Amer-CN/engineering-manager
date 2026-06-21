-- ============================================================
-- v0.78.0 PII 后台 re-encrypt worker: 进度持久化表
-- 来源: v0.76.0 PII 列级 key rotation 续作 (累计待办 #5 续)
--   - 单行表 (id=1), 记录最近一次 re-encrypt 状态
--   - 支持重启继续: target_key_id 锁住, processed_rows 计数, last_processed_id 标记
--   - 失败行存 last_error, 不中断 worker
-- ============================================================

CREATE TABLE IF NOT EXISTS pii_reencrypt_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    target_key_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    current_table TEXT,
    current_column TEXT,
    last_processed_id INTEGER,
    started_at TEXT,
    updated_at TEXT,
    completed_at TEXT,
    last_error TEXT,
    triggered_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_pii_reencrypt_status_updated ON pii_reencrypt_status(updated_at);

INSERT OR IGNORE INTO pii_reencrypt_status (id, target_key_id, status) VALUES (1, 0, 'idle');