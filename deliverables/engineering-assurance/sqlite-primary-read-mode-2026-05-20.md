# Phase 7.6：SQLite 主读模式切换验证

**日期**：2026-05-20
**工作流**：系统设计 + 代码实施
**参与成员**：Zhen（主理人，编排 + 实施）

---

## 📌 TL;DR（执行摘要）

- 实现了 SQLite 读取模式切换机制，支持 3 种模式：`dual`（默认）、`sqlite-primary`（严格模式）、`json-only`（回退模式）
- 在 23 个 IPC handler 中部署了 45 个 JSON 回退守卫点
- 新增 2 个 IPC 通道（`sqlite:getReadMode`、`sqlite:setReadMode`）
- TypeScript 编译 0 错误，679 测试全部通过
- 默认模式为 `dual`（保持现有行为），用户可按需切换到 `sqlite-primary` 验证 SQLite 数据完整性

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| 整体评级 | 🟢 通过 |
| 新增 IPC 通道 | 2 个（sqlite:getReadMode, sqlite:setReadMode） |
| 修改 Handler 文件 | 23 个（+45 个回退守卫） |
| 编译状态 | TypeScript 0 错误 ✅ |
| 测试状态 | 679/679 通过 ✅ |

---

## 📋 三种读取模式

| 模式 | 读取策略 | 写入策略 | 适用场景 |
|------|---------|---------|---------|
| `dual`（默认） | SQLite 优先，失败回退 JSON | JSON + SQLite 双写 | 日常使用，安全兜底 |
| `sqlite-primary` | 仅 SQLite，失败返回错误 | JSON + SQLite 双写 | 验证 SQLite 数据完整性 |
| `json-only` | 仅 JSON，跳过 SQLite | JSON + SQLite 双写 | SQLite 出问题时临时回退 |

---

## 🔧 修改文件清单

### 核心基础设施（3 个文件）

| 文件 | 修改内容 |
|------|---------|
| `electron/sqlite/queries/helpers.ts` | 新增 `ReadMode` 类型、`getReadMode()`、`setReadMode()`、`shouldFallbackToJson()`；`useSqliteRead()` 增加 json-only 模式检查 |
| `electron/sqlite/index.ts` | 导出 `getReadMode`、`setReadMode`、`shouldFallbackToJson`、`ReadMode` |
| `electron/ipc-handlers/sqlite-status.ts` | 新增 `sqlite:getReadMode`、`sqlite:setReadMode` 两个通道；`sqlite:status` 返回增加 `readMode` 字段 |

### IPC 权限 & 类型（3 个文件）

| 文件 | 修改内容 |
|------|---------|
| `electron/ipc-guard.ts` | 新增 2 个通道权限映射：`sqlite:getReadMode` → settings:read，`sqlite:setReadMode` → settings:update |
| `electron/preload.ts` | 新增 2 个 IPC 通道：`getSqliteReadMode`、`setSqliteReadMode` |
| `src/types/electron.d.ts` | 新增类型声明：`getSqliteReadMode`、`setSqliteReadMode`；`getSqliteStatus` 返回增加 `readMode` |

### Handler 回退守卫（23 个文件）

每个文件添加了 `shouldFallbackToJson` 导入，并在每个 JSON 回退点前添加守卫：

| 文件 | 守卫数量 | 涉及通道 |
|------|---------|---------|
| `cost-ledger.ts` | 2 | list, summary |
| `cost-ledger-batches.ts` | 1 | list |
| `cost-ledger-categories.ts` | 1 | list |
| `cost-ledger-match-rules.ts` | 1 | list |
| `projects.ts` | 1 | getAll |
| `members.ts` | 4 | getAll, workerTeams:getAll, workerTransferRecords:getAll, projectMembers:getAll |
| `partners.ts` | 4 | getAll, getByProject, regions:getAll, supervisors:getAll |
| `contracts.ts` | 3 | incomeContracts:getAll, expenseContracts:getAll, contractStats:get |
| `invoices.ts` | 2 | invoices:getAll, paymentRecords:getAll |
| `departments.ts` | 1 | getAll |
| `materials.ts` | 2 | materials:getAll, expenses:getAll |
| `inventory.ts` | 2 | inventoryItems:getAll, inventoryTransactions:getAll |
| `settlements.ts` | 2 | settlements:getAll, contractTemplates:getAll |
| `workers.ts` | 4 | workers:getAll, workers:getStats, workers:getTeamWages, projectWorkers:getAll |
| `attendance.ts` | 2 | attendances:getAll, attendances:getByMember |
| `wages.ts` | 2 | getAll, getStats |
| `salary-history.ts` | 2 | list, getEffective |
| `wage-history.ts` | 2 | list, getEffective |
| `roles.ts` | 1 | getAll |
| `templates.ts` | 2 | getAll, getStats |
| `drawings.ts` | 1 | getAll |
| `audit.ts` | 2 | query, stats |
| `stats.ts` | 1 | getDashboard |
| **合计** | **45** | |

---

## 🔀 回退守卫模式

在 `sqlite-primary` 模式下，SQLite 读取失败时不再静默回退到 JSON，而是返回错误：

```typescript
// Before（dual 模式行为）:
if (useSqliteRead()) {
  const data = queries.someRead(...)
  if (data !== null) return { success: true, data }
  log.warn('[DualWrite] ... SQLite read failed, falling back to JSON')
}
// JSON 回退
return { success: true, data: db.someCollection }

// After（增加 sqlite-primary 守卫）:
if (useSqliteRead()) {
  const data = queries.someRead(...)
  if (data !== null) return { success: true, data }
  log.warn('[DualWrite] ... SQLite read failed, falling back to JSON')
}
if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
// JSON 回退
return { success: true, data: db.someCollection }
```

---

## ✅ 行动清单

| # | 行动 | 负责角色 | 紧急度 | 预期完成 |
|---|------|---------|--------|---------|
| 1 | 在应用中添加 SQLite 设置 UI，允许切换读取模式 | 开发者 | P1 | Phase 7.7 |
| 2 | 使用 `sqlite-primary` 模式运行应用，验证所有模块的 SQLite 数据完整性 | 开发者 | P0 | 即时 |
| 3 | 验证通过后，考虑默认切换到 `sqlite-primary` 模式 | 开发者 | P2 | Phase 7.8 |
| 4 | 未来考虑 `sqlite-only` 模式（停止 JSON 双写，纯 SQLite 读写） | 开发者 | P3 | 远期 |

---

## ⚠️ 待完善 / 已知局限

- 读取模式为内存变量，应用重启后重置为 `dual`。未来可持久化到 SQLite 配置表
- `sqlite-primary` 模式下，部分统计接口（stats.ts）在 SQLite 读取成功后仍需从 JSON 补充字段（如 recentProjects 的完整数据），这不是回退而是富化
- `attendance-batch-import.ts` 使用 `useSqliteRead` 做去重检查，没有 JSON 回退路径，不需要守卫
- 部分早期 handler（cost-ledger.ts, audit.ts 等）的 SQLite 写入没有 `useSqliteWrite()` 守卫，这是 Phase 7.3 的遗留问题

---

## 📚 数据来源 & 成员产出索引

- Zhen（主理人）：架构设计 + helpers.ts 模式管理 + sqlite-status.ts IPC 通道 + ipc-guard/preload/electron.d.ts 类型更新 + stats.ts 回退守卫
- Agent（并行执行）：cost-ledger 系列(4文件)、projects/members/partners(3文件)、contracts/invoices/departments(3文件)、materials/inventory/settlements(3文件)、workers/attendance/wages(3文件)、salary/wage-history/roles/templates/drawings/audit(6文件) 的回退守卫部署

---

> 本报告由工程保障团队 AI 协作生成，关键决策请由人类工程负责人复核。
