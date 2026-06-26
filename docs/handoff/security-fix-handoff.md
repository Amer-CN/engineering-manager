# Security Fix Sprint Handoff — P0 安全修复 (2026-06-26)

> **状态**: 5 个 P0 已修 + 红绿灯全绿，**未 commit**
> **版本**: v0.78.3 (master, HEAD `f3e8f06`)
> **触发源**: `docs/audit-report-2026-06-25.md` (MiMo v2.5-pro 生成)

---

## 一、本次已完成

### 审计报告核实结论

MiMo 审计报告列了 9 个 P0，我用 file:line 实证区分了真阳/假阳：

| # | 报告声称 | 判定 | 原因 |
|---|---------|------|------|
| P0-1/8 | JWT secret 硬编码 | **真阳** | `Program.cs:50` + `AuthEndpoints.cs:87` 同一个默认串 |
| P0-3 | open-external 可执行任意文件 | **真阳** | `UseShellExecute=true` 无扩展名限制 |
| P0-4 | 密码 btoa 存 localStorage | **真阳** | `Login.tsx:41` Base64 不是加密 |
| P0-5 | ErrorBoundary 未集成 | **真阳** | 文件存在但 0 引用 |
| P0-7 | payment_records CREATE 重复 | **真阳** | L282 和 L320 字面重复 |
| P0-2 | migrate 端点 SQL 注入 | **假阳** | JSON 来自本地受信 dataPath，非用户 HTTP 输入 |
| P0-6 | 迁移 011 编号重复 | **假阳** | MigrationRunner 按完整文件名排序+schema_versions 表记录 |
| P0-9 | unmask-pii SQL 拼接 | **假阳** | 报告自己写"当前安全"，switch 白名单已足够 |

### 修复明细 (5 个真阳，全部已完成)

| # | 修复方式 | 改动文件 |
|---|---------|---------|
| **P0-1/8** | 新建 `JwtSecretProvider`：优先 `JWT_SECRET` 环境变量 → 持久化文件 `%APPDATA%\工程管家\jwt.key` → 首次生成随机 32 字节 | `Program.cs` (+58行)、`AuthEndpoints.cs` (改1行) |
| **P0-3** | `open-external` 加扩展名白名单 19 种 (文档+图片)，显式拒绝 .bat/.exe/.cmd/.ps1 等 | `FileEndpoints.cs` (+22行) |
| **P0-4** | 只记用户名不存密码；移除"自动登录"UI；catch `any` → `unknown` | `Login.tsx` (+6 -18) |
| **P0-5** | `main.tsx` 在 `<App />` 外包裹 `<ErrorBoundary>` (Mimo Code 执行) | `main.tsx` (+5行) |
| **P0-7** | 删除第二段重复 `CREATE TABLE IF NOT EXISTS payment_records` | `Program.cs` (-14行) |

**总 diff**: 5 files, +111 -40

### 红绿灯验证 (全部通过)

| 检查项 | 结果 |
|--------|------|
| `dotnet build` | 0 错误 0 警告 ✅ |
| `dotnet test` | 122/122 通过 ✅ |
| `npx tsc --noEmit` | 0 error ✅ |
| `npx vite build` | built in 11.50s ✅ |
| `npm run check` | BUILD PASSED (1 软警告: ErrorBoundary 硬编码 hex) ✅ |

### 用户侧行为变化

1. **JWT token 首次重启后全部失效** — 密钥从硬编码换成随机生成，用户需重新登录一次
2. **"记住密码"→"记住用户名"** — 重启后用户名自动回填，密码需手动输入
3. **"自动登录"下线** — UI 复选框已移除
4. **ErrorBoundary 防白屏** — 组件渲染异常不再白屏，显示错误页面+重新加载按钮
5. **文件预览限制** — `.bat/.exe` 等可执行文件不能通过 open-external 打开

---

## 二、未 commit 的改动

```bash
# 5 个文件有改动，均未 commit：
git status  # 5 modified

# 建议的 commit message：
# fix(security): P0 安全修复 — JWT secret 持久化 + 文件预览白名单 + 密码存储改造 + ErrorBoundary 集成
```

---

## 三、接下来要做什么

以下按优先级排列，全部来自同一份审计报告 `docs/audit-report-2026-06-25.md`。我用 file:line 实证核实了 P1 的真阳性，**下面列出的是已确认的真阳**（假阳已排除）。

### 🔴 紧急 (功能完全不工作 + 安全)

| # | 问题 | 文件:行 | 证据 | 修复难度 |
|---|------|---------|------|---------|
| **P1-1** | expense/agreement 合同 POST 字段全 NULL — dynamic dto 不被 Dapper 绑定 | `ContractEndpoints.cs:95,104` | INSERT 只传 `CreatedBy`+`Now`，`@ProjectId/@Name` 等全部缺失。income 端点 (L71 注释) 已修好可作为参考模板 | 中 |
| **P1-2** | income/expense/agreement PUT 字段全 NULL — 同上 dynamic dto 问题 | `ContractEndpoints.cs:113,122,131` | 参数对象缺 `Id/Name/Amount/Status/Remarks`，UPDATE 全 SET NULL | 中 |
| **P1-3** | batch-create (考勤) + batch-save (工资) 字段全 NULL — 同上 dynamic 问题 | `WageEndpoints.cs:80,284` | INSERT 只传 `Now`+`CreatedBy`，8 个业务字段全部 NULL | 中 |
| **P1-4** | 快照恢复无 admin 校验 — 任何登录用户可覆盖整个数据库 | `SystemEndpoints.cs:210` | 只有 `GetUserId` 无 `IsAdmin`，同文件 `/api/admin/db-checkpoint` 已有 IsAdmin 校验作为参考 | 低 |
| **P1-5** | CostLedger batches 查询 SQL 拼接 bug — `UserFilterCompany` 缺 `()` 导致返回方法名字符串 | `CostLedgerEndpoints.cs:143` | 同文件 L27/L38 正确用了 `UserFilterCompany()`，L143 漏了括号 | 极低 |

### 🟡 高优 (安全问题)

| # | 问题 | 文件:行 | 证据 |
|---|------|---------|------|
| **P1-6** | `dangerouslySetInnerHTML` 无消毒 — 模板变量可注入 `<script>` | `TemplateGenerate.tsx:182` | `previewHtml` 来自后端+用户变量拼接，无 sanitize |
| **P1-7** | xlsx `^0.18.5` 原型污染漏洞 (CVE-2023-30533) | `package.json:35` | 需升级到 `xlsx` 社区维护 fork 或换 SheetJS |
| **P1-8** | `JSON.parse` 无 try-catch — permissions 畸形 JSON 崩溃页面 | `App.tsx:220` | `useMemo` 内直接 parse，无异常保护 |

### 🟢 中优 (代码质量 / 可维护性)

| # | 问题 | 文件 | 证据 |
|---|------|------|------|
| **P1-9** | AuthContext.tsx 死代码 — Context 版 0 引用，Zustand 版是实际实现 | `src/hooks/AuthContext.tsx` | `useAuth.ts` 只 re-export authStore，AuthContext.tsx 无人 import |
| **P1-10** | `.Result` 同步阻塞异步 — 线程池饥饿风险 | `AuthEndpoints.cs:322` | `ExecuteAsync(...).Result` 应改 await 或 `GetAwaiter().GetResult()` |
| **P1-11** | DELETE 全是硬删除 — 迁移 004 的软删除字段白费 | 所有 `Endpoints/` | 全用 `DELETE FROM` 而非 `SoftDeleteAsync` |

### 🔵 低优 (审计报告 P2，可选)

| 类别 | 数量 | 典型问题 |
|------|------|---------|
| 空 catch 块 | 后端 4 + 前端 25+ | `catch { }` 吞掉所有异常 |
| CostLedger 行级授权缺失 | 2 端点 | PUT/DELETE 有登录鉴权但缺 `created_by` 过滤 |
| DataTable 无虚拟化 | 1 | 大数据量性能瓶颈 |
| 全局异常中间件缺失 | 1 | Program.cs 无 `app.UseExceptionHandler` |

---

## 四、修复建议

### P1-1/2/3 (dynamic dto 绑定失败) — 最重要

这是**功能完全不工作**的 bug，影响范围：
- 收入合同创建/更新 (income POST/PUT — 已修好 ✅)
- 支出合同创建/更新 (expense POST/PUT — ❌ 未修)
- 协议合同创建/更新 (agreement POST/PUT — ❌ 未修)
- 考勤批量创建 (batch-create — ❌ 未修)
- 工资批量保存 (batch-save — ❌ 未修)

**修复模式**: 参照 income POST (ContractEndpoints.cs L71 注释 `改用 HttpRequest 读 body`)，将 `dynamic dto` 改为强类型 DTO + `await ctx.Request.ReadFromJsonAsync<XxxDto>()`。每个端点 15-30 分钟。

### P1-4 (快照恢复无 admin) — 最简单

```csharp
// 在 restore 端点加一行：
var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
if (!CurrentUser.IsAdmin(uid)) return Common.Forbidden("仅管理员可恢复快照");
```

### P1-5 (缺少括号) — 一行修复

```csharp
// CostLedgerEndpoints.cs:143
- {CurrentUser.UserFilterCompany}
+ {CurrentUser.UserFilterCompany()}
```

---

## 五、当前项目状态备忘

- **分支**: master (唯一分支)
- **版本**: v0.78.3 (package.json)，最新 tag v0.78.1
- **红绿灯基线**: 5/5 全绿 (dotnet build 0w0e + test 122/122 + tsc 0e + vite 11.5s + check PASSED)
- **后续大方向** (来自 v0.78.1-handoff):
  1. cloud sync 阶段 2 (endpoint 改造 + sync worker + 冲突 UI)
  2. 组件拆分 (src/components/*.tsx 迁到 features/)
  3. any 继续清理 (剩余 ~282 处)
  4. npm check 67 软警告 (文件行数超标)

---

*生成: 2026-06-26 by GLM-5-Turbo*
