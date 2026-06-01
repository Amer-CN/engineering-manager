# C# 迁移审查报告

> Mimo 完成了 C# + ASP.NET Core Minimal API 迁移。
> 审查日期：2026-06-01

---

## 总体评价

**编译状态**：✅ 0 errors, 0 warnings
**架构**：✅ 正确（WinForms + WebView2 + ASP.NET Core 后端）
**前端桥接**：✅ `tauri-bridge.ts` 已改为 HTTP 调用
**功能覆盖**：✅ 大部分 CRUD 模块已实现

---

## 做得好的

### 1. 架构清洁

`EntryPoint.cs` 分两条线：后台线程跑 ASP.NET Core API，主线程跑 WinForms + WebView2 窗口。跟之前讨论的方案一致。

### 2. MainWindow 实现完整

WinForms + WebView2，无边框圆角窗口、窗口拖动、最小化/最大化/关闭（通过 WebMessage 控制）、`F12` 开发者工具可用。

### 3. 前端桥接层已适配

`tauri-bridge.ts` 已从 Tauri `invoke()` 改为 `apiClient.get/post()` HTTP 调用，`tauriAPI` 命名保持兼容。

`api-client.ts` 提供了 `get`/`post`/`put`/`del` 统一封装，所有响应自动解析为 `{ success, data, error }` 格式。

### 4. 数据库兼容

直接读取现有 `%APPDATA%\工程管家\engineering.db`，零迁移成本。WAL 模式已启用。

### 5. API 端点覆盖面

| 模块 | 状态 |
|------|:---:|
| auth/login | ✅ |
| roles | ✅ |
| projects CRUD | ✅ |
| members CRUD | ✅ |
| workers CRUD | ✅ |
| project-workers | ✅ |
| partners CRUD | ✅ |
| invoices CRUD | ✅ |
| contracts CRUD | ✅ |
| settlements | ✅ |
| attendances CRUD | ✅ |
| wages CRUD + stats | ✅ |
| cost-ledger | ✅ |
| departments | ✅ |
| drawings | ✅ |
| expenses | ✅ |
| inventory | ✅ |
| materials | ✅ |
| templates | ✅ |
| audit logs | ✅ |
| file read/save/delete | ✅ |
| OCR（占位） | ✅ |
| SQLite status | ✅ |
| data health | ✅ |

---

## 需要改进的

### 1. Program.cs 1740 行，全在一个文件 🔴

所有 API 端点和 DTO 定义全部在 `Program.cs` 里，单文件 96KB。这会带来几个问题：
- 每次改一个模块要滚动很久
- 多人协作时冲突概率大（但你是单开发者，影响小）
- 想加 `async` 路由时所有闭包挤在一起

**建议**：分成 `AuthEndpoints.cs`、`ProjectEndpoints.cs`、`MemberEndpoints.cs` 等分部类或 extension methods。每个文件 ~1-2 个模块。

但这**不是紧急问题**——单文件对一人开发完全可接受，等有需要再分。

### 2. OCR 只有占位 🟡

所有 OCR 端点都返回 `"OCR 功能需要配置百度 API"`，没有实质实现。但 Rust 版本实现了百度 OCR 调用。

**桥接层中 `api-client.ts` 已实现 `post` 支持，OCR 只需要加百度 API 调用代码就行。**

### 3. api-adapter.ts 有残留逻辑 🟡

`api-adapter.ts` 里仍然有 `checkCSharpApi()` → 退回到 `tauri-bridge.ts` 的逻辑。但 `tauri-bridge.ts` 已经改为 HTTP 调用了，所以退回到 tauri-bridge 是**正确的**——中间不会经过 Tauri invoke。

但是 `api-adapter.ts` 里的 `isElectron` / `isTauri` 检测逻辑已经过时，可能会导致开发时绕弯路。

**建议**：要么删除 `api-adapter.ts`，要么把它硬编码为始终使用 `tauri-bridge`。

### 4. 少数接口简化了参数 🟡

| Rust 版本 | C# 版本 | 影响 |
|-----------|---------|------|
| `update_member` 有 17 个字段全更新 | `members PUT` 有 19 个字段 | 无影响 |
| `batch_create_project_workers` 独立接口 | C# 未实现批量创建 | 小影响 |
| `get_worker_stats` 有详细统计 | `workers/stats` 只返回 total/active 计数 | `WorkerWageModal` 可能需要扩展 |

### 5. 工程管家.bat 打开浏览器而不是窗口 🟡

现在 `工程管家.bat` 启动 Vite + C# API + 浏览器。Mimo 做了 WinForms 窗口，但没有在开发模式中自动使用它。

**建议**：让 Mimo 改 `工程管家.bat` 为 `dotnet run --project EngineeringManager.Api`（桌面模式），这样双击直接弹窗口，不需要手动打开浏览器。

### 6. 快捷的密码哈希 🔵

`HashPassword` 用了 `Rfc2898DeriveBytes` 替代 Node 的 `pbkdf2`，算法对齐。但 `Convert.ToHexString` 输出大写 hex，Node 版输出小写——登录可能失败。

**建议**：改成 `Convert.ToHexString(deriveBytes.GetBytes(64)).ToLower()`。

---

## 总结

| 项目 | 评价 |
|------|:---:|
| 架构正确性 | ✅ |
| 编译通过 | ✅ 0 warnings, 0 errors |
| 构建时间 | ✅ 0.88s |
| 功能覆盖度 | ✅ 大部分模块已实现 |
| 前端适配 | ✅ tauri-bridge 已改为 HTTP |
| 代码可维护性 | 🟡 单文件 1740 行（不紧急） |
| OCR | 🟡 占位状态 |
| 数据库兼容 | ✅ 直接读取现有 .db |
| 窗口体验 | 🟡 开发模式仍然跳浏览器 |

**整体质量很好，细节打磨后就绪。** 唯一需要立刻修的是密码哈希的大小写问题（否则登录会失败）。
