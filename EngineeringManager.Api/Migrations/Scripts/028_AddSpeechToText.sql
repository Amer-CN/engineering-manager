-- ============================================================
-- M1: 语音转文字 (STT) 后台任务表
-- 对应 C# Services/Stt/SttWorker.cs, Endpoints/SttEndpoints.cs
-- ============================================================

CREATE TABLE IF NOT EXISTS stt_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT NOT NULL,          -- 原始音频文件名
    source_path TEXT NOT NULL,          -- 预处理后 wav 的完整路径
    source_type TEXT NOT NULL DEFAULT 'audio',  -- audio (未来可能 video)
    engine TEXT NOT NULL DEFAULT 'qwen3-asr-1.7b-gguf',
    status TEXT NOT NULL DEFAULT 'pending',     -- pending/processing/completed/failed/cancelled
    progress INTEGER NOT NULL DEFAULT 0,        -- 0-100
    is_multi_speaker INTEGER NOT NULL DEFAULT 0,-- 是否多人录音（1=走说话人分离）
    num_speakers INTEGER,                       -- 预期说话人数（null=自动）
    hotwords TEXT,                              -- 可选热词/上下文 (JSON 数组)
    result_text TEXT,                           -- 全文（纯文本）
    result_json TEXT,                           -- 分段 JSON: [{speaker,start,end,text},...]
    duration_sec REAL,                          -- 音频时长（秒）
    elapsed_sec REAL,                           -- 转写耗时（秒）
    error TEXT,                                 -- 错误信息
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL                    -- 创建用户 ID
);

CREATE INDEX IF NOT EXISTS idx_stt_jobs_user ON stt_jobs(created_by, status);
CREATE INDEX IF NOT EXISTS idx_stt_jobs_status ON stt_jobs(status, created_at);
