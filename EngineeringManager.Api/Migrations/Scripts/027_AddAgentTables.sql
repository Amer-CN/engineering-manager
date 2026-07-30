-- ============================================================
-- v1.3.0 Agent AI 助手: 对话与消息持久化表
-- 对应 C# Models/AgentMessage.cs, Services/AgentConversationService.cs
-- ============================================================

-- 1. 对话表
CREATE TABLE IF NOT EXISTS agent_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '新对话',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON agent_conversations(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_agent_conv_updated ON agent_conversations(updated_at);

-- 2. 消息表
CREATE TABLE IF NOT EXISTS agent_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    tool_calls TEXT,
    tool_call_id TEXT,
    name TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_msg_conv ON agent_messages(conversation_id, created_at);

-- 3. 用户 LLM 配置表（备选存储方式 — 当前主要用 DPAPI 文件存储）
CREATE TABLE IF NOT EXISTS agent_settings (
    user_id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL DEFAULT 'Agnes',
    base_url TEXT NOT NULL DEFAULT 'https://apihub.agnes-ai.com/v1',
    api_key_enc TEXT,
    model TEXT NOT NULL DEFAULT 'agnes-2.5-flash',
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    use_built_in INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 4. 用量统计表
CREATE TABLE IF NOT EXISTS agent_usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    conversation_id INTEGER,
    model TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_usage_user ON agent_usage_stats(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_usage_conv ON agent_usage_stats(conversation_id);