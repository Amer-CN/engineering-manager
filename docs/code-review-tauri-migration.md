# ⚠️ [已废弃] Tauri 迁移代码审查报告

> **状态：已废弃** — 迁移方案从 Tauri(Rust) 改为 C# + ASP.NET Core + WebView2，参见 [CLAUDE.md](../CLAUDE.md)
> 审查日期：2026-06-01
> 审查范围：src-tauri/src/ 全部 Rust 后端代码 + src/services/tauri-bridge.ts 前端桥接层
> 迁移方式：Mimo 2.5 Pro + Claude 一次性重写

---

## 总评

**代码量**：~42 个 .rs 文件，约 7000-8000 行 Rust 代码，覆盖 ~90+ IPC 命令
**编译状态**：⚠️ 通过但有潜在问题（`contracts.rs` 在 `--no-default-features` 下编译失败）
**功能完整度**：⚠️ 核心 CRUD 基本完成，但有 6 个快照命令缺失，多处前后端参数不匹配
**代码质量**：🟡 中上——结构清晰，错误处理统一，但存在大量复制粘贴、冗余类型定义、重复 SQL

## 严重问题（必须修复）

### 1. 快照系统命令全部缺失 🔴

**位置**：`src/services/tauri-bridge.ts:523-529` vs `src-tauri/src/lib.rs`
**问题**：前端调用了 6 个快照命令，但 Rust 后端 `invoke_handler` 中完全没有注册。`snapshots.rs` 模块存在但未注册为 Tauri 命令。

| 前端调用 | 后端状态 |
|---------|---------|
| `get_snapshots` | ❌ 未注册 |
| `get_max_snapshots` | ❌ 未注册 |
| `create_snapshot` | ❌ 未注册 |
| `restore_snapshot` | ❌ 未注册 |
| `delete_snapshot` | ❌ 未注册 |
| `set_max_snapshots` | ❌ 未注册 |

**修复**：在 `snapshots.rs` 中将以下函数标记为 `#[command]` 并在 `lib.rs` 中注册：
- `get_snapshots` → `get_snapshots`
- `get_max_snapshots` → `get_max_snapshots`
- `create_snapshot` → `create_snapshot`
- `restore_snapshot` → `restore_snapshot`
- `delete_snapshot` → `delete_snapshot`
- `set_max_snapshots` → `set_max_snapshots`

### 2. Session 命令缺失（登录态管理）🔴

**位置**：`tauri-bridge.ts:403-404`
**问题**：`setSession` 和 `clearSession` 命令前端调用但后端完全没有实现。
**修复**：前端不需要这些——Tauri 没有 Electron 的 session 概念，登录态在前端用 localStorage 维护。**从前端删除这两个调用**。

### 3. `createProjectWorker` 参数结构不匹配 🔴

**位置**：
- 前端：`tauri-bridge.ts:103` — `createProjectWorker: (pw: any) => callWithResponse('create_project_worker', { pw })`
- 后端：`workers.rs:277` — `pub fn create_project_worker(state, worker_id: i64, project_id: i64, team_id: Option<i64>, daily_wage: f64, worker_type: String, entry_date: String)`

**问题**：前端传 `{ pw: { worker_id, project_id, ... } }` 嵌套对象，但 Tauri 的 `#[command]` 只接受顶层的平铺参数。这个调用会直接报错 `missing field worker_id` 或类似错误。

**修复**：前端改为平铺参数：
```ts
createProjectWorker: (pw: any) => callWithResponse('create_project_worker', {
  workerId: pw.worker_id, projectId: pw.project_id, teamId: pw.team_id,
  dailyWage: pw.daily_wage, workerType: pw.worker_type, entryDate: pw.entry_date,
})
```

### 4. `batchCreateProjectWorkers` 参数结构不匹配 🔴

**位置**：
- 前端：`tauri-bridge.ts:104` — `batchCreateProjectWorkers: (pws: any[]) => callWithResponse('batch_create_project_workers', { pws })`
- 后端：`workers.rs:302` — `pub fn batch_create_project_workers(state, entries: Vec<(i64, i64, Option<i64>, f64, String, String)>)`

**问题**：Rust 的 `Vec<(tuple)>` 无法从 JS 对象数组反序列化。Serde 不会把 `[{worker_id:1,...}]` 自动变成 `[(1,2,None,100.0,"焊工","2024-01-01")]`。

**修复**：后端定义一个具体的 struct 而不是 tuple：
```rust
#[derive(Deserialize)]
struct BatchProjectWorkerEntry {
    worker_id: i64,
    project_id: i64,
    team_id: Option<i64>,
    daily_wage: f64,
    worker_type: String,
    entry_date: String,
}
```
然后接受 `Vec<BatchProjectWorkerEntry>`。

### 5. `convert_docx_to_html` 和 `fill_docx` 命令缺失 🟡

**位置**：`tauri-bridge.ts:567-571`
**问题**：这些命令在后端 `invoke_handler` 中不存在。mammoth.js（docx→HTML）和 docx 模板填充是前端逻辑，原设计文档也明确说"保持前端处理"。
**修复**：从前端桥接层删除这两个调用，让前端直接 import mammoth。

### 6. `getWorkerStats` 端点错误 🔴

**位置**：`tauri-bridge.ts:96`
**问题**：`getWorkerStats: () => callWithResponse<any>('get_workers')` — 调用了 `get_workers` 命令，但该命令返回的是工人列表，不是统计数据。
**修复**：要么后端实现 `get_worker_stats` 命令，要么前端改用已有的 `getMemberStats`。

---

## 中等问题（影响功能但不会崩溃）

### 7. 合同管理大量别名混淆 🟡

**位置**：`tauri-bridge.ts:124-147`
**问题**：6 个函数全部指向同样的后端命令：
```ts
getAgreementContracts → get_income_contracts  // 应该是 agreement_contracts
getContracts          → get_income_contracts  // 不明确
createContract        → create_income_contract // 不通用
deleteContract        → delete_income_contract
```

**修复**：实现 `get_agreement_contracts` 命令，或至少用正确的映射。

### 8. `Option<i64>` 用于 Display 格式化 🟡

**位置**：`contracts.rs:206`, `contracts.rs:399`
**问题**：在 `format!("收入合同 {} 不存在", contract.id)` 中 `contract.id: Option<i64>` 未实现 `Display`。编译在 `--no-default-features` 下会失败。
**修复**：`contract.id.unwrap_or(0)` 或使用 `{:?}`。

### 9. 前端 `createExpense` 传参结构不一致 🟡

**位置**：
- 前端：`createExpense: (expense: any) => callWithResponse('create_expense', { expense })` — 传嵌套对象
- 后端：`create_expense(state, expense: NewExpense)` — 期望平铺

**与问题3不同**：这里前端传 `{ expense: {...} }` 而 `NewExpense` 是一个 struct。Tauri 的 `#[command]` 会自动将 `expense` 键对应的值反序列化为 `NewExpense`。所以这个其实是**正确的**。

**但是**：`updateExpense` 和 `updateMaterial` 等用了 `(id, updates)` 模式，而 `createXxx` 用了 `(xxx)` 模式。前后端一致性问题需要逐一验证。

### 10. `updateMaterial` / `updateExpense` / 等更新接口统一性 🟡

**位置**：多处
**问题**：部分更新接口使用 COALESCE 模式（如 `expenses.rs:119`），只更新传入的非 None 字段，这本身是好的设计。但部分接口（如 `members.rs` 的 `update_member`）是全量更新，不传字段会被覆盖为 NULL。需要统一。

### 11. duplicate 桥接函数 🟡

**位置**：`tauri-bridge.ts`
**问题**：大量冗余别名，增加维护负担：
- `login` **和** `authLogin` → 同一个命令
- `getAllUsers` **和** `authGetAllUsers` → 同一个命令  
- `getSqliteStatus` **和** `sqliteStatus` → 同一个命令
- `consistencyCheck` **和** `dataConsistencyCheck` → 同一个命令

**修复**：保留一组，删除其余别名，或标记为 `@deprecated`。

---

---

## 运行时兼容性问题

### 19. `sqliteGetReadMode` 返回类型不匹配 🟡

**位置**：
- 前端：`sqliteGetReadMode: () => callWithResponse<string>('sqlite_get_read_mode')` 
- 后端：返回 `AppResult<serde_json::Value>` = `{ success: true, readMode: "sqlite" }`
**问题**：前端期望 `data` 是 `string`，但 Rust 返回一个 JSON 对象。如果消费者做 `result.data === "sqlite"` 会失败。
**修复**：后端改为返回 `AppResult<String>` 或前端改为 `callWithResponse<{readMode: string}>`。

### 20. `updateSupervisor` 前端参数格式不匹配 🟡

**位置**：
- 前端：`updateSupervisor: (id: number, updates: any) => callWithResponse('update_supervisor', { id, updates })` — 传 `{ id, updates: {...} }`
- 后端：`update_supervisor(state, id: i64, updates: SupervisorUpdate)` — `SupervisorUpdate` 里有 `id: i64` 字段
**问题**：前端传的 `updates` 对象里**不应该包含** `id`，但 Rust `SupervisorUpdate` 里却有 `pub id: i64`。如果前端传的 `updates` 包含 `id` 字段，后端多余的 `id` 字段不会造成问题（只是被忽略）。但如果前端传的 `updates` 不包含 `id` 而结构体要求它有值，就会失败。需验证前端实际调用。
**修复**：从 `SupervisorUpdate` 中移除 `id` 字段（更新用的是命令参数里的 `id`）。

---

## 轻微问题（代码质量/可维护性）

每个查询函数内部硬编码 SQL 字符串，大量重复。例如 `settlements.rs` 中有两段完全相同的 SQL（带/不带 `project_id` 过滤）。
**建议**：提取为模块级常量或 builder 模式。

### 13. 错误信息丢失 🔵

**位置**：`auth.rs:103` — `map_err(|_| AppError::Validation("用户名或密码错误"))`
**问题**：SQL 错误和"用户不存在"被合并成同一个错误信息，调试困难。
**建议**：区分 `QueryReturnedNoRows` 和其他 SQL 错误。

### 14. `useEffect` 重复执行导致的双重报错 🔵

**位置**：原始控制台日志中 `get_roles` 报了 **两次** 错误
**问题**：React 18 的 Strict Mode 在开发模式下会故意双重调用 `useEffect`。`RolePermissionsTab.tsx` 的 `useEffect` 中调用了 `getRoles`，没有清理逻辑。
**建议**：添加 `useEffect` 清理函数（abort controller）或使用 `useRef` 防止重复调用。

### 15. `wages_extra.rs` 与 `wages.rs` 重复的类型定义 🔵

**位置**：`wages_extra.rs:18-39` vs `wages.rs:20-56`
**问题**：`WagePaymentRecord` 是 `Wage` 的几乎完全拷贝。
**建议**：共享类型定义，或使用组合（`WagePaymentRecord` 包含 `Wage` 字段）。

### 16. `inventory.rs` 的 `map_row` 闭包用 `clone` 解决借用问题不够优雅 🔵

**位置**：`inventory.rs:253`
**影响**：性能轻微，但可读性不好。
**建议**：使用辅助宏或提取为普通函数。

---

## 前端适配问题

### 17. Recharts 图表渲染警告 🟡

**位置**：控制台
**问题**：`The width(-1) and height(-1) of chart should be greater than 0`
**原因**：图表容器在渲染时尺寸为 0（可能是 Tauri WebView2 下的布局时序问题）。
**建议**：给图表容器添加 `minWidth` 或使用 `ResizeObserver` 延迟渲染。

### 18. `pdfjs-dist` Node.js Buffer 依赖 🟡

**位置**：设计文档中提到的 POC 验证项
**状态**：⚠️ 未验证——如果 pdfjs-dist 使用了 Node.js `Buffer` API，在纯 WebView2 环境下会报错。
**建议**：验证 pdfjs-dist ESM 版本能否正常运行。

---

## 设计文档 vs 实际实现差异

| 设计 | 实际 | 影响 |
|------|------|------|
| 渐进式迁移（分3层） | 一次性全量迁移 | 无法逐步验证 |
| Phase 0 POC 验证 | **未执行** | 关键假设未验证 |
| SQLite WAL 兼容性测试 | **未执行** | 可能数据损坏 |
| WebView2 渲染验证 | **未执行** | framer-motion/recharts 可能有问题 |
| Excel 前端处理 | ✅ 正确 | — |
| mammoth 前端处理 | ⚠️ 桥接层残留调用 | 需清理 |
| 快照系统 | ❌ 模块存在但未注册 | 功能不可用 |
| 双轨运行（Electron+Tauri 公用数据） | 未验证 | 数据目录是否对齐未知 |

---

## 修复优先级

| 优先级 | 问题 | 影响模块 | 修复难度 |
|--------|------|----------|----------|
| P0 | 快照命令缺失（6个） | 数据安全 | 中 |
| P0 | createProjectWorker 参数不匹配 | 工人管理 | 低 |
| P0 | batchCreateProjectWorkers tuple参数 | 工人导入 | 中 |
| P0 | 前端残留无效命令（session/docx） | 多个 | 低 |
| P0 | getWorkerStats 错误端点 | 工人看板 | 低 |
| P1 | contracts.rs compile error | 合同管理 | 低 |
| P1 | 合同别名映射错误 | 合同管理 | 中 |
| P1 | sqliteGetReadMode 返回类型不匹配 | SQLite设置 | 低 |
| P1 | SupervisorUpdate 含多余 id 字段 | 监管单位 | 低 |
| P1 | health_check.rs 未注册为命令 | 数据健康 | 低 |
| P2 | SQL 重复/类型重复 | 全局 | 低 |
| P2 | recharts 渲染警告 | 图表 | 低 |
| P2 | 前端重复别名清理 | 桥接层 | 低 |
| P2 | sqlite_status 用 serde_json::Value 而非具体类型 | SQLite设置 | 低 |
