-- ============================================================
-- 054: stt_jobs.engine 默认值改为现役纯 CPU 引擎 MOSS
--
-- 背景：Qwen3-ASR（qwen3-asr-1.7b-gguf）已彻底退役，028 建的列默认值
-- 不再指向可用引擎。028 原文件不动（已应用的迁移不改写）。
-- SQLite 不支持 ALTER COLUMN DEFAULT，故按 003 式重建表换列默认值；
-- 已落库行的 engine 值原样搬运（历史任务不迁移数据，前端下拉框无该
-- 选项时按原文显示）。
--
-- 重建次序刻意选为「先 DROP 旧表、再 RENAME 影子表」：
-- 这样 INSERT 一旦失败（源表/列缺失导致 "no such table/column"），
-- 脚本会在 DROP 之前抛错并整体回滚，不会出现「INSERT 静默失败 →
-- 照常 DROP 旧表 → 全表数据无声清空」的旧式重建缺陷（D-01 审计教训）。
-- 结构 = 028_AddSpeechToText.sql + 048_AddSttSpeakerNames.sql 对齐。
-- ============================================================

CREATE TABLE IF NOT EXISTS stt_jobs_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT NOT NULL,
    source_path TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'audio',
    engine TEXT NOT NULL DEFAULT 'moss-transcribe-0.9b',
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0,
    is_multi_speaker INTEGER NOT NULL DEFAULT 0,
    num_speakers INTEGER,
    hotwords TEXT,
    result_text TEXT,
    result_json TEXT,
    duration_sec REAL,
    elapsed_sec REAL,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    speaker_names TEXT
);

INSERT INTO stt_jobs_new
    (id, source_file, source_path, source_type, engine, status, progress,
     is_multi_speaker, num_speakers, hotwords, result_text, result_json,
     duration_sec, elapsed_sec, error, created_at, updated_at, created_by,
     speaker_names)
SELECT id, source_file, source_path, source_type, engine, status, progress,
       is_multi_speaker, num_speakers, hotwords, result_text, result_json,
       duration_sec, elapsed_sec, error, created_at, updated_at, created_by,
       speaker_names
FROM stt_jobs;

DROP TABLE IF EXISTS stt_jobs;

ALTER TABLE stt_jobs_new RENAME TO stt_jobs;

CREATE INDEX IF NOT EXISTS idx_stt_jobs_user ON stt_jobs(created_by, status);
CREATE INDEX IF NOT EXISTS idx_stt_jobs_status ON stt_jobs(status, created_at);
