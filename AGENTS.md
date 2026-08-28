# AGENTS.md - 工程管家（导航入口）

> 项目状态：v0.92.0（以 package.json 为唯一真源） · 最后同步：2026-08-03
> 本文件是导航型入口：只保留定位、路由、命令指针与红线摘要。细则真源在 docs/ 与各子域嵌套 AGENTS.md。

## 📌 项目定位

**工程管家**：面向工程公司的本地桌面管理系统（人事/工人/发票/合同/项目/结算/成本台账等 11 个业务模块）。

- 架构：React 18 + TS 5 + Vite + Tailwind（前端）→ HTTP → ASP.NET Core Minimal API (.NET 8, localhost:5048) → Dapper → SQLite；WinForms + WebView2 桌面壳
- 输出语言：默认中文；代码/命令/路径/commit message 保持英文

## 🗺️ 目录路由（改哪里，先读哪份指引）

| 目录 | 职责 | 就近指引 |
|------|------|---------|
| `src/components/` | 前端页面与组件（ui/ 基础库 + features/ 业务） | [src/components/AGENTS.md](src/components/AGENTS.md) |
| `src/hooks/` | React hooks（data/ React Query 数据层 + 业务 hooks） | [src/hooks/AGENTS.md](src/hooks/AGENTS.md) |
| `EngineeringManager.Api/Endpoints/` | C# Minimal API 端点（鉴权/限流/SQL/审计） | [EngineeringManager.Api/Endpoints/AGENTS.md](EngineeringManager.Api/Endpoints/AGENTS.md) |
| `src/services/` | API 桥接层（tauri-bridge.ts → api-client.ts）、OCR、文件服务 | [src/services/AGENTS.md](src/services/AGENTS.md) |
| `src/utils/` | 前端纯函数工具（日期/金额/校验/脱敏/审计） | [src/utils/AGENTS.md](src/utils/AGENTS.md) |
| `src/constants/` | 常量（工种/考勤/省市区/权限标签） | [docs/STACK-AND-ARCHITECTURE.md](docs/STACK-AND-ARCHITECTURE.md)「工具函数与常量」 |
| `EngineeringManager.Api/Services/` | C# 服务层（AI/LLM/STT/知识库/更新） | [EngineeringManager.Api/Services/AGENTS.md](EngineeringManager.Api/Services/AGENTS.md) |
| `EngineeringManager.Api/Migrations/Scripts/` | SQL 迁移（NNN_Description.sql + MigrationRunner） | [docs/CONVENTIONS.md](docs/CONVENTIONS.md) + [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) |
| `EngineeringManager.Tests/` | 后端测试（Common/Endpoints/Migrations/Security） | [docs/VERSIONING.md](docs/VERSIONING.md)「红绿灯」 |
| `EngineeringManager.Installer/` `Uninstaller/` | 安装/卸载器（数据存储路径永不删） | [docs/STACK-AND-ARCHITECTURE.md](docs/STACK-AND-ARCHITECTURE.md)「打包与部署」 |

## ⚡ 命令指针

```bash
# 启动：双击 工程管家.bat，或
cd EngineeringManager.Api && dotnet run          # C# API + WebView2 窗口（localhost:5048）

# 前端改完代码后：
npx vite build                                   # dist/ 会被 dotnet build/run 自动同步

# 红绿灯（sprint 收尾 / release 前必跑，全绿才可 tag）：
# dotnet build + dotnet test + npm run check + npm run check:version + npx vite build + npx tsc --noEmit
# 完整命令与通过标准 → docs/VERSIONING.md「红绿灯」；冒烟流程 → docs/SMOKE-TEST.md

# 打包（仅用户通知时）：build-installer.bat / release.bat → release\EngineeringManager-Setup-<版本>.exe
```

## 🔌 MCP 路由（何时用哪个 MCP）

| MCP | 何时用 | 约束 / 真源指向 |
|-----|--------|----------------|
| `codegraph` | 跨文件代码结构查询（符号定义/引用/调用链、模块依赖梳理） | 只读分析；不替代就近 AGENTS.md 的目录路由 |
| `shadcn` | 接入/查询 shadcn/ui 组件（搜组件、拉示例代码） | 必须遵守 [DESIGN.md](DESIGN.md)「shadcn ↔ Bedrock Token 映射」的桥接规则，禁止重定义 CSS 变量 |
| `stitch` | Stitch 设计稿导出与屏还原（拉取设计稿、导出资产） | 屏清单与还原规范 → [design-prototype/STITCH-SCREEN-MAP.md](design-prototype/STITCH-SCREEN-MAP.md) + [design-prototype/STITCH-SCREENS.md](design-prototype/STITCH-SCREENS.md)；注意额度约束 |

## ⚠️ 高风险区（红线摘要，完整细则见 docs/CONVENTIONS.md）

1. **数据存储路径（如 `F:\Company Database`）任何形式都不允许被删除**；所有数据操作必须走 `ApiConfig.ResolveDataPath()`，禁止硬编码 AppData
2. 不得绕过权限检查：前端敏感操作必须用 `usePermission` hook；后端 `/api/*` 默认经 `GlobalAuthMiddleware` 强制鉴权
3. 不得在组件中直接操作 localStorage，使用 `AuthContext`
4. SQL 必须参数化（Dapper @Param），表名 `[]` 包裹，严禁字符串拼接
5. 金额字段一律 `INTEGER`（分），禁止浮点
6. 组件硬性约束（违反 build 检查失败）：`<PageContainer>` / `<Button>` / `<Card>`、slate-* 不用 gray-*、text-caption/micro 不用任意值字号
7. 新页面开发 Checklist（8 条）与新增表/字段 Checklist（5 条）→ [docs/CONVENTIONS.md](docs/CONVENTIONS.md)，写页面/建表前逐条确认

## 🔗 深链索引（细则真源）

| 主题 | 文档 |
|------|------|
| 技术栈 / 架构 / 关键文件 / 打包 / 数据铁律 / 权限 / 模块地图 / 文件存储 / UI 规范 / 审计日志 | [docs/STACK-AND-ARCHITECTURE.md](docs/STACK-AND-ARCHITECTURE.md) |
| 红线 + 组件规则 + 后端质量规则 + 双 Checklist + Repository/React Query/迁移规范 | [docs/CONVENTIONS.md](docs/CONVENTIONS.md) |
| SemVer bump / 版本引用 6 处 / tag 策略 / changelog 规范 / 红绿灯 | [docs/VERSIONING.md](docs/VERSIONING.md) |
| 历史安全审计（存档）+ 当前 P0/P1 安全状态 | [docs/SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md) |
| 数据备份 / 架构决策记录 | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| 各业务模块详细说明（OCR / 人事 / 发票 / PII Mask…） | [docs/MODULES.md](docs/MODULES.md) |
| 数据库表清单 / ER 图 / 字段规范 | [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) |
| 冒烟测试完整流程 | [docs/SMOKE-TEST.md](docs/SMOKE-TEST.md) |
| P0 安全修复计划（历史） | [docs/P0-FIX-PLAN.md](docs/P0-FIX-PLAN.md) |
| 设计系统契约 | [DESIGN.md](DESIGN.md) |
| 版本分线（个人版/企业版冻结契约） | [docs/enterprise/FREEZE-CONTRACT.md](docs/enterprise/FREEZE-CONTRACT.md) |
| 里程碑交接记录 | [docs/handoff/](docs/handoff/) |

## 🧭 通用约定（最小集）

- 新组件放 `src/components/features/<模块>/`，禁止在 `src/features/` 下建文件；新建前确认无同名组件
- commit 遵循 conventional commits；feat→minor、fix/perf→patch、refactor/docs/chore→不 bump → [docs/VERSIONING.md](docs/VERSIONING.md)
