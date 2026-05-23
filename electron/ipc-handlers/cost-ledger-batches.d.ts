/**
 * 成本台账版本（批次）管理 IPC 处理器
 * 通道：batches:list / create / rename / copy / delete
 * 数据集合：db.costLedgerBatches, db.costLedger
 *
 * 🔀 双写策略（Phase 7.3）：
 *   读：SQLite 已就绪+已迁移 → 从 SQLite 读取；否则从 JSON 读取
 *   写：SQLite 已就绪 → 写入 JSON + SQLite 双写；否则仅 JSON
 */
export {};
