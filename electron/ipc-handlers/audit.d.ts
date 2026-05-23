/**
 * 审计日志 IPC 处理器
 *
 * 🔀 双写策略（Phase 7.3）：
 *   读：SQLite 已就绪+已迁移 → 从 SQLite 读取；否则从 JSON 读取
 *   写：SQLite 已就绪 → 写入 JSON + SQLite 双写；否则仅 JSON
 *
 * 字段映射注意事项（JSON ↔ SQLite）：
 *   timestamp     ↔ created_at
 *   username       ↔ user_name
 *   resource       ↔ resource_type
 *   description    ↔ details
 *   ip             ↔ ip_address
 */
export {};
