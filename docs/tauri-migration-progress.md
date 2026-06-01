# ⚠️ [已废弃] Tauri 迁移进度

> **状态：已废弃** — 迁移方案从 Tauri(Rust) 改为 C# + ASP.NET Core + WebView2，参见 [CLAUDE.md](../CLAUDE.md)
> 最后更新：2026-06-01 11:00
> 设计文档：`TAURI_MIGRATION_DESIGN.md`（项目根目录）
> **Rust 总代码量：10119 行**（33 个命令模块）
> **已迁移 IPC 命令：200 个**（覆盖 Electron 全部 195 个通道）
> **前端 Bridge 方法：~120 个**
> **前端适配：87 个文件，481 处调用已替换**（window.electronAPI → getAPI()）
> **Phase 0 POC：✅ 通过**（Vite + Rust + WebView2 窗口启动）

## Phase 0：POC 验证 ✅ 完成
- [x] WebView2 渲染：窗口成功启动
- [x] SQLite 兼容性：rusqlite 读取现有 .db 无报错
- [x] 百度 OCR：reqwest 编译通过（运行时验证待用户实际测试）

## Phase 1：Tauri 骨架搭建 ✅ 完成

### 已完成
- [x] Tauri 项目结构（`src-tauri/`）
- [x] Rust 后端骨架（main.rs, lib.rs, error.rs）
- [x] SQLite 表结构（30+ 表，`src/db/init.rs`）
- [x] 基础 IPC 命令（projects CRUD, files, system/window）
- [x] Vite 配置更新（移除 electron 插件）
- [x] package.json 更新（Tauri 依赖）
- [x] 前端 API 桥接层（`src/services/tauri-bridge.ts`）
- [x] Rust 编译通过
- [x] 应用启动成功

### 新增文件
```
src-tauri/
├── Cargo.toml
├── build.rs
├── tauri.conf.json
├── capabilities/default.json
├── icons/icon.ico
└── src/
    ├── main.rs
    ├── lib.rs
    ├── error.rs
    ├── config.rs          # 配置管理
    ├── file_service.rs    # 文件服务（FOLDER_MAP + 回退链）
    ├── db/
    │   ├── mod.rs
    │   └── init.rs        # 30+ 表结构定义
    └── commands/
        ├── mod.rs
        ├── system.rs      # 窗口控制 + 系统命令
        ├── database.rs    # 项目 CRUD + 仪表盘统计
        └── files.rs       # 文件读写命令

src/services/
├── tauri-bridge.ts        # Tauri API 封装
└── api-adapter.ts         # Electron/Tauri 环境适配
```

### 验证步骤（新电脑执行）
```bash
cd E:/测试
cargo check --manifest-path src-tauri/Cargo.toml   # Rust 编译检查
npx tauri dev                                        # 启动开发服务器
```

## Phase 2：分层迁移 ✅ 完成（200 个命令，10119 行 Rust）

### Layer 1：基础设施 ✅ 完成
- [x] 文件服务完善（FOLDER_MAP, 回退链）→ `file_service.rs`（280行）
- [x] 配置管理（config.ts）→ `config.rs`（120行）
- [x] 快照系统（创建/列表/还原/删除）→ `snapshots.rs`（220行）
- [x] 数据健康检查（sqlite-status.ts）→ `health_check.rs`（220行）
- [x] SQLite 表结构（30+ 表）→ `db/init.rs`（450行）

**Layer 1 Rust 代码量：~1100 行**

### Layer 2：核心业务 ✅ 完成
- [x] members.ts（8 个 IPC）→ `commands/members.rs`（362行）
- [x] workers.ts + project-workers.ts（10 个 IPC）→ `commands/workers.rs`（423行）
- [x] projects.ts（8 个 IPC）→ `commands/projects.rs`（327行）
- [x] contracts.ts（9 个 IPC）→ `commands/contracts.rs`（505行）
- [x] invoices.ts（9 个 IPC）→ `commands/invoices.rs`（431行）
- [x] settlements.ts（6 个 IPC）→ `commands/settlements.rs`（325行）
- [x] cost-ledger.ts + categories.ts（16 个 IPC）→ `commands/cost_ledger.rs`（763行）
- [x] templates.ts（5 个 IPC）→ `commands/templates.rs`（179行）
- [x] departments.ts（4 个 IPC）→ `commands/departments.rs`（154行）
- [x] salary-history.ts（8 个 IPC）→ `commands/salary_history.rs`（279行）

### Layer 3：高级功能 ✅ 完成
- [x] attendance.ts + utils + batch-import → `commands/attendance.rs`（746行，10 个命令）
- [x] wages.ts + wage-calc.ts + wage-utils + bank-receipt-batch → `commands/wages.rs`（887行，11 个命令）
- [x] OCR handlers（9 种 + 3 工具）→ `commands/ocr.rs`（697行，12 个命令，reqwest 调百度 API）
- [x] audit.ts → `commands/audit.rs`（330行，4 个命令）
- [x] roles.ts → `commands/roles.rs`（217行，3 个命令）

## Phase 3：前端适配 ✅ 完成
- [x] 核心 hooks（12 个）：useDataPath/useMembers/useProjects/usePartners 等
- [x] 业务 hooks（14 个）：useInvoicePage/useWageManagement/usePayrollData 等
- [x] 主组件（20 个）：Dashboard/Login/Settings/Projects/WageManagement 等
- [x] Feature 子组件（36 个）：HR/成本台账/合同/结算/模板/工人管理等
- [x] 服务层（3 个）：ocr.ts/fileService.ts/AuthContext.tsx
- [x] 测试文件中的 mock 更新待后续处理

## Phase 4：配置补全 ✅ 完成
- [x] capabilities/default.json：fs scope（$APPDATA/**）+ window 权限
- [x] tauri.conf.json：CSP 含百度 OCR API 域名
- [x] config.rs：默认数据路径 %APPDATA%/工程管家/
- [x] 审计日志上限 10000 条
- [x] contract-file:/// 自定义协议（合同附件预览，回退链：项目名→未分类→_common→平铺）

## Rust 命令模块清单（33 个文件，200 个命令）

| 文件 | 命令数 | 对应 Electron |
|------|--------|--------------|
| `commands/system.rs` | 18 | window.ts + system + config |
| `commands/database.rs` | 3 | database.ts |
| `commands/files.rs` | 4 | files.ts |
| `commands/auth.rs` | 6 | auth.ts |
| `commands/data.rs` | 4 | sqlite-status.ts |
| `commands/sqlite_status.rs` | 5 | sqlite-status.ts |
| `commands/members.rs` | 4 | members.ts |
| `commands/workers.rs` | 9 | workers.ts + project-workers.ts |
| `commands/projects.rs` | 5 | projects.ts |
| `commands/contracts.rs` | 9 | contracts.ts |
| `commands/invoices.rs` | 5 | invoices.ts |
| `commands/settlements.rs` | 6 | settlements.ts |
| `commands/cost_ledger.rs` | 17 | cost-ledger.ts + categories.ts |
| `commands/templates.rs` | 5 | templates.ts |
| `commands/departments.rs` | 4 | departments.ts |
| `commands/salary_history.rs` | 8 | salary-history.ts |
| `commands/attendance.rs` | 10 | attendance.ts + utils + batch-import |
| `commands/wages.rs` | 11 | wages.ts + wage-calc.ts |
| `commands/wages_extra.rs` | 5 | wages.ts (batch/overdue) |
| `commands/audit.rs` | 4 | audit.ts |
| `commands/roles.rs` | 3 | roles.ts |
| `commands/ocr.rs` | 12 | ocr.ts |
| `commands/drawings.rs` | 4 | drawings.ts |
| `commands/expenses.rs` | 4 | expenses.ts |
| `commands/inventory.rs` | 6 | inventory.ts |
| `commands/materials.rs` | 4 | materials.ts |
| `commands/regions.rs` | 7 | regions.ts + supervisors.ts |
| `commands/project_members.rs` | 4 | project-members.ts |
| `commands/worker_teams.rs` | 4 | worker-teams.ts |
| `commands/payment_records.rs` | 4 | invoices.ts (payment section) |
| `commands/contract_templates.rs` | 4 | contracts.ts (template section) |
| `commands/cost_ledger_match_rules.rs` | 2 | cost-ledger-match-rules.ts |
| **合计** | **200** | **覆盖 195 个 Electron IPC** |

## 注意事项
- `electron/` 目录保留作为参考，不删除
- 前端代码 100% 复用，只改 IPC 调用层
- 数据目录对齐：Tauri 需配置指向 Electron 的 `%APPDATA%/工程管家/`
- rusqlite 兼容 better-sqlite3 的 .db 文件（WAL 模式需验证）
- OCR 使用 reqwest（rustls-tls）直接调百度 API，不再依赖 Python
