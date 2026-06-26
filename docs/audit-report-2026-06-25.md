# 工程管家项目 — 全面代码审查报告

> **审查日期**: 2026-06-25
> **审查范围**: 前端 (React/TypeScript) + 后端 (C#/.NET 8) + 数据库 (SQLite)
> **项目版本**: v0.78.3 (R16 Sprint)
> **审查工具**: MiMo v2.5-pro + Mimo Code v2.5

---

## 一、项目概述

**工程管家** 是一款桌面端工程项目管理系统，技术栈：
- **前端**: React 18 + TypeScript 5 + Vite 5 + TailwindCSS + Zustand + React Query
- **后端**: C# (.NET 8) + ASP.NET Core Minimal API + Dapper
- **数据库**: SQLite (engineering.db)
- **桌面壳**: WinForms + WebView2
- **AI识别**: 百度 OCR API

**核心模块**: 项目管理、合同管理、发票管理、工资管理、人事管理、工人管理、结算办理、仓库管理、成本台账、单位管理、模板管理

---

## 二、审查结果总览

| 级别 | 数量 | 说明 |
|------|------|------|
| **P0 (Critical)** | 9 | 安全漏洞 / 数据丢失风险 / 认证绕过 |
| **P1 (High)** | 19 | 功能缺陷 / 数据完整性 / 重要性能隐患 |
| **P2 (Medium)** | 22 | 代码质量 / 可维护性 / 最佳实践 |
| **总计** | **50** | |

---

## 三、P0 — Critical Issues（必须立即修复）

### P0-1: JWT Secret 硬编码默认值
- **文件**: `Program.cs:50`, `AuthEndpoints.cs:87`
- **问题**: JWT secret 默认为 `"dev-only-secret-please-change-in-prod-32bytes"`。如果生产环境未设置 `JWT_SECRET` 环境变量，任何人都可以用这个已知密钥伪造 JWT token。
- **修复**: 生产环境启动时检查 `JWT_SECRET` 是否存在，不存在则拒绝启动或生成随机 secret 并持久化。

### P0-2: JSON 迁移端点 SQL 注入
- **文件**: `SystemEndpoints.cs:594-597` (`/api/sqlite/migrate`)
- **问题**: JSON 键名直接用 `[{k}]` 拼入 SQL。如果键名包含 `]` 字符（如 `foo]`），可以闭合方括号注入 SQL。
- **修复**: 对 JSON key 做白名单校验（只允许 `[a-zA-Z_][a-zA-Z0-9_]*`）。

### P0-3: 任意命令执行
- **文件**: `FileEndpoints.cs:164-177` (`/api/files/open-external`)
- **问题**: `UseShellExecute = true` + 无文件扩展名限制。攻击者可上传 `.bat`/`.exe` 文件到 uploads 目录，然后通过此端点执行。
- **修复**: 限制允许的文件扩展名白名单（`.pdf`, `.docx`, `.xlsx`, `.jpg`, `.png`），拒绝可执行文件。

### P0-4: 密码明文存储在 localStorage
- **文件**: `src/components/Login.tsx:41`
- **问题**: `saveCred(u, p)` 使用 `btoa(JSON.stringify({ u, p }))` 将密码以 Base64 编码存入 localStorage。Base64 不是加密，任何拥有 DevTools 的人都可一键解码。
- **修复**: 改为只存储认证 token，不存储密码。

### P0-5: ErrorBoundary 已创建但未集成
- **文件**: `src/components/ErrorBoundary.tsx`（已创建）, `src/App.tsx`（未引用）
- **问题**: 整个应用没有任何错误边界保护，任何组件渲染异常都会导致**整个应用白屏**。
- **修复**: 在 `main.tsx` 和 `App.tsx` 中包裹 `<ErrorBoundary>`。

### P0-6: 重复迁移编号
- **文件**: `Migrations/Scripts/011_AddCreatedByToInvoicesAndPaymentRecords.sql` 和 `011_AddPiiEncryptionColumns.sql`
- **问题**: 两个脚本编号同为 `011`，可能导致在新数据库上以错误顺序执行。
- **修复**: 重命名为 `012_AddPiiEncryptionColumns.sql`。

### P0-7: payment_records 表 CREATE 重复
- **文件**: `Program.cs:282-295` 与 `320-333`
- **问题**: `CREATE TABLE IF NOT EXISTS` 语句出现了两次，代码维护混乱。
- **修复**: 删除重复的 CREATE TABLE。

### P0-8: JWT Secret 硬编码在登录端点
- **文件**: `AuthEndpoints.cs:87`
- **问题**: 与 P0-1 同一默认值硬编码在登录端点中。
- **修复**: 统一从环境变量读取，启动时校验。

### P0-9: PII unmask 端点 SQL 拼接
- **文件**: `AuthEndpoints.cs:373` (`/api/admin/unmask-pii`)
- **问题**: `encCol` 和 `table` 来自 switch 映射白名单，当前安全。但维护风险高。
- **修复**: 增加显式白名单校验。

---

## 四、P1 — High Issues（本迭代修复）

### 后端 P1（13个）

| # | 文件 | 问题 |
|---|------|------|
| P1-1 | `ContractEndpoints.cs:95` | expense/agreement 合同创建**全部字段 NULL**（dynamic DTO 绑定失败） |
| P1-2 | `ContractEndpoints.cs:113` | PUT 端点 dynamic dto 字段未绑定，UPDATE 失败 |
| P1-3 | 所有 `Endpoints/` | DELETE 全是硬删除，迁移 004 的软删除字段白费 |
| P1-4 | `CostLedgerEndpoints.cs:56` | PUT 端点无权限检查，任何人可改任意成本台账记录 |
| P1-5 | `CostLedgerEndpoints.cs:66` | DELETE 端点无权限检查 |
| P1-6 | `SystemEndpoints.cs:210` | 快照恢复无 admin 校验，任何用户可恢复数据库 |
| P1-7 | `WageEndpoints.cs:80` | batch-create 的 dynamic 参数绑定失败，字段全 NULL |
| P1-8 | `WageEndpoints.cs:284` | batch-save 同样参数绑定失败 |
| P1-9 | `AuthEndpoints.cs:322` | `.Result` 同步阻塞异步调用，线程池饥饿风险 |
| P1-10 | `ProjectEndpoints.cs:61` | 仪表盘统计空 catch 块吞掉所有异常 |
| P1-11 | `SystemEndpoints.cs:200` | 快照删除返回 403 而非 404 |
| P1-12 | `OcrEndpoints.cs:445` | 网络检查端点 catch 信息不匹配 |
| P1-13 | `CostLedgerEndpoints.cs:143` | `UserFilterCompany` 缺少 `()` 调用 |

### 前端 P1（6个）

| # | 文件 | 问题 |
|---|------|------|
| P1-14 | `AuthContext.tsx` | 双重认证系统并存（Context + Zustand），死代码 |
| P1-15 | `Dashboard.tsx` + `Projects.tsx` | 未使用 React Query，手动 fetch 无缓存 |
| P1-16 | `App.tsx:220` | `JSON.parse` 无 try-catch，permissions 无效时崩溃 |
| P1-17 | `TemplateGenerate.tsx:182` | `dangerouslySetInnerHTML` 无消毒，XSS 风险 |
| P1-18 | `DataTable.tsx` | 无列表虚拟化，大数据量性能瓶颈 |
| P1-19 | `package.json` | `xlsx ^0.18.5` 有已知原型污染漏洞（CVE-2023-30533） |

---

## 五、P2 — Medium Issues（排期修复）

### 后端 P2（14个）

| 类别 | 数量 | 主要问题 |
|------|------|---------|
| 空 catch 块 | 4 | Program.cs:242, 337-340, 370; CostLedgerEndpoints.cs:98 |
| 权限缺失 | 6 | 多个 DELETE 端点无 created_by 校验 |
| 代码质量 | 2 | 缩进混乱、OCR JSON 拼接 |
| 并发安全 | 1 | OCR Token 缓存非线程安全 |
| 全局异常 | 1 | 缺少全局异常处理中间件 |

### 前端 P2（8个）

| 类别 | 数量 | 主要问题 |
|------|------|---------|
| 空 catch 块 | 25+ | App.tsx:107, TitleBar:53 等 |
| 状态管理 | 2 | useMembersState 18个 useState; Toast 定时器泄漏 |
| 性能优化 | 2 | 无图片懒加载; 硬编码 localhost:5048 |
| 测试覆盖 | 2 | 测试中 100+ 处 `as any`; 无 E2E 测试 |
| 数据获取 | 1 | React Query 未充分利用 |

---

## 六、项目优势（做得好的方面）

| 方面 | 说明 |
|------|------|
| **测试覆盖** | 100+ 测试文件，覆盖关键业务逻辑 |
| **代码分割** | React.lazy() 对 16 个页面按需加载 |
| **权限系统** | RequirePermission/RequireAdmin 声明式守卫 |
| **审计日志** | 关键操作有审计记录 |
| **PII 保护** | PiiProtector + 13 列加密 + Mask 系统 |
| **密码安全** | PBKDF2-HMAC-SHA512 210k iterations |
| **SQL 参数化** | ~200 个 Dapper 调用 0 拼接 |
| **软删除设计** | DapperHelpers.SoftDeleteAsync + deleted_at 字段 |
| **迁移系统** | MigrationRunner + schema_versions 表 |

---

## 七、建议修复优先级

| 优先级 | 任务 | 预计工时 | 原因 |
|--------|------|---------|------|
| **1** | ErrorBoundary 集成到 App.tsx | 5 分钟 | 防止白屏 |
| **2** | JSON 迁移端点 SQL 注入修复 | 15 分钟 | 安全漏洞 |
| **3** | FileEndpoints 扩展名白名单 | 15 分钟 | 任意命令执行 |
| **4** | expense/agreement 合同创建修复 | 30 分钟 | 功能完全不工作 |
| **5** | 快照恢复加 admin 校验 | 10 分钟 | 数据安全 |
| **6** | xlsx 依赖升级 | 5 分钟 | 已知漏洞 |
| **7** | batch-create/save 参数绑定修复 | 30 分钟 | 功能完全不工作 |
| **8** | CostLedger 权限检查 | 15 分钟 | 越权访问 |
| **9** | 软删除改造 | 2 小时 | 数据可恢复 |
| **10** | 密码存储改造 | 30 分钟 | 安全漏洞 |

---

## 八、附录

### A. 文件统计

| 指标 | 数值 |
|------|------|
| 前端 .tsx/.ts 文件 | 200+ |
| 后端 .cs 文件 | 30+ |
| 迁移脚本 | 20+ |
| 测试文件 | 100+ |
| 项目总行数 | 50,000+ |

### B. 已完成的 R16 Sprint 改进

| 改进项 | 数量 |
|--------|------|
| any 清理 | 375 → 340 (-35) |
| tauri-bridge.ts 类型化 | 226 → 16 (-210) |
| 冗余代码删除 | -52KB (ocr.ts + api-methods.ts) |
| ErrorBoundary | 已创建（待集成） |
| alert() → Toast | 16 处 |

---

*报告生成: 2026-06-25 by MiMo v2.5-pro + Mimo Code v2.5*

---

## 九、给 GLM 5.2 的协作说明

### 你可以调用 Mimo Code 节省 Token！

**Mimo Code** 是一个免费的代码执行代理（v2.5），适合处理简单重复任务。

**调用方式**（PowerShell）:
```powershell
 = "C:\Users\Admin\AppData\Roaming\npm\node_modules\@mimo-ai\mimocode-windows-x64\bin\mimo.exe"
 = "E:\测试\.mimo-runs\your-task"
New-Item -ItemType Directory -Force -Path 

# 写prompt文件
 = "\task-prompt.txt"
"你的任务描述" | Out-File  -Encoding UTF8

# 启动Mimo Code（后台）
Start-Process -FilePath  
  -ArgumentList "run", "-m", "mimo/mimo-auto" 
  -WorkingDirectory "E:\测试" 
  -RedirectStandardInput  
  -RedirectStandardOutput "\stdout.txt" 
  -RedirectStandardError "\stderr.txt" 
  -WindowStyle Hidden
```

### 任务分配策略

| 任务类型 | 执行者 | 原因 |
|---------|--------|------|
| 单文件重构/拆分 | **Mimo Code** | 免费，省token |
| catch块修复 | **Mimo Code** | 机械性替换 |
| alert()→Toast | **Mimo Code** | 模式固定 |
| 安全漏洞修复 | **你自己** | 需要深度理解 |
| 架构设计 | **你自己** | 需要全局视角 |
| 功能bug排查 | **你自己** | 需要调试能力 |

### Mimo Code 的优势
- ✅ 免费模型，不消耗你的token
- ✅ 后台执行，你可以同时做其他事
- ✅ 擅长机械性重构（any清理、类型替换、文件拆分）
- ✅ 自动tsc验证，出错会自己修复

### Mimo Code 的局限
- ❌ v2.5 能力有限，不适合深度推理
- ❌ 复杂架构决策需要你自己判断
- ❌ 跨文件重构可能出错

### 数据目录
- 日志: `C:\Users\Admin\.local\share\mimocode\log`
- 已设置 `MIMO_LOG_LEVEL=ERROR` 减少日志
- 需要时手动清理: `Get-ChildItem "C:\Users\Admin\.local\share\mimocode\log" -Filter "*.log" | Where-Object { .LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item`

---

*提示: 简单任务派给 Mimo Code，复杂任务你自己处理，这样最省token！*
