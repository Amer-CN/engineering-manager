/**
 * 成本台账核心 IPC 处理器
 *
 * 7 个通道：list / create / batchCreate / update / delete / summary / deleteByProject
 * 数据集合：db.costLedger
 *
 * 🔀 双写策略（Phase 7.3）：
 *   读：SQLite 已就绪+已迁移 → 从 SQLite 读取；否则从 JSON 读取
 *   写：SQLite 已就绪 → 写入 JSON + SQLite 双写；否则仅 JSON
 *   前端无需任何改动
 *
 * 其他分类/版本/匹配规则通道 → 独立文件：
 *   cost-ledger-categories.ts   — 分类管理（5个通道）
 *   cost-ledger-batches.ts     — 版本管理（5个通道）
 *   cost-ledger-match-rules.ts — 匹配规则（2个通道）
 *   cost-ledger-helpers.ts     — 共享工具函数
 */
export {};
