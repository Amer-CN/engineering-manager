# 冻结契约 · FREEZE-CONTRACT

> **M-EDITION1 版本分线** — 个人版 / 企业版功能冻结清单与维护铁律
>
> 基线 commit：`d80020d` / origin/master（2026-08-01）
> 生效版本：v0.91.0+
> 真源：本文件 + `docs/enterprise/HANDOFF-STEP1.md` §3

---

## 1. 冻结清单（personal 模式不可见 / 不可调用）

### 后端端点（personal 返回 404）

| 分组 | 端点 |
|------|------|
| 用户 CRUD | `GET/POST/PUT/DELETE /api/users`、`GET /api/users/{id}` |
| 角色管理 | `GET/PUT /api/roles`、`GET /api/roles/{id}`、`POST /api/roles/{id}/reset` |
| 项目授权 | `GET/POST/DELETE /api/admin/project-authorizations`、`GET .../by-user/{userId}` |

### 前端页面 / 组件

| 项目 | 文件 |
|------|------|
| 用户管理页 | `src/components/Users.tsx`（含 `RolePermissionsTab`） |
| 侧边栏入口 | `src/components/Sidebar.tsx`「用户管理」按钮 |
| 路由守卫 | `src/App.tsx` renderPage — personal 下 `users` → Dashboard |

### 后端逻辑分支（冻结但保留代码）

- `SYSTEM_ROLES` 多角色分支（`src/types/permissions.ts`）
- `DataScope` 多用户分支（`CurrentUser.cs`）— F6-3 起由【角色维度】决定：admin→`All`，其余→`AuthorizedProjects`（自有 `created_by` ∨ 授权项目）；personal 不再恒返 `All`（原 X8「能力开关关闭时恒返 All」语义已移除）
- 审计按用户筛选（`SystemEndpoints.cs` L106-L108）
- **`multiUserDataScope` 能力键 = 契约占位键，当前无行为绑定** — 数据可见范围现由角色维度决定（admin→All，其余→自有+授权项目），不再由版本能力开关决定。`MultiUserDataScope` 保留（后端 `EditionFeatures.cs` + 前端 `src/constants/editionFeatures.ts`，check:feature-keys 要求 6 键同步），全仓无任何 `Has()` 生产调用；**不得删除**（删除会红键同步门禁与 EditionFeaturesTests 精确集合断言）
- **个人版冻结的是写入通道，不是既有数据的可见性** — 存量 enterprise 库降级为 personal 后 `project_authorizations` 表数据仍在：写端点 403 冻结，但 `UserFilterWithAuthorizedProjects` 的 `EXISTS(SELECT 1 FROM project_authorizations ...)` 对既有授权数据仍会命中（R1 曾表述为「表为空」，不准确，此处纠正）

---

## 2. 三条维护铁律

1. **只冻代码不冻数据** — `users` / `roles` / `project_authorizations` / `created_by` 等表和列保留，禁止删表删列迁移
2. **冻结区代码必须继续编译跑测试** — 禁止删除其对应测试
3. **企业版（enterprise）功能原样可用** — 冻结不等于删除；`config.json` 设 `"edition": "enterprise"` 即解冻全部

---

## 3. 解冻检查清单

企业版上线前逐条确认：

- [ ] **后端补齐端点级 RBAC** — 当前权限检查仅存在于前端（`src/hooks/usePermission.tsx` RequirePermission/RequireAdmin + `src/hooks/permissionHelpers.tsx` 守卫实现）。后端 `GlobalAuthMiddleware` 只校验登录，不校验权限码。`CurrentUser.HasPermission(ctx, db, "xxx:read")` 方法存在（`Security/CurrentUser.cs` L127-L151）但无任何端点调用它。解冻每个端点时必须同时接入 HasPermission 校验
- [ ] `GET /api/roles` 等端点移除 `EditionFeatures.Has(...)` gate（将能力键加入对应 edition 集合）
- [ ] 前端 `Sidebar.tsx` 恢复「用户管理」入口
- [ ] 前端 `App.tsx` renderPage 移除 personal 重定向
- [ ] `DataScope` 恢复按角色映射
- [ ] 审计日志恢复按用户筛选
- [ ] 权限矩阵 55 处前后端差异统一对齐（见 `PERMISSION-SNAPSHOT.md`）
- [ ] 全量回归测试（含冻结区测试用例）

---

## 4. 版本开关机制

| 层 | 实现 |
|----|------|
| 配置 | `%APPDATA%\工程管家\config.json` → `"edition": "personal" \| "enterprise"` |
| 后端 | `ApiConfig.GetEdition()` → `EditionFeatures.Has(key)`（禁止 IsPersonal/IsEnterprise） |
| API | `GET /api/config` 响应含 `edition` + `features` 数组（后端算好下发） |
| 前端 | `src/store/editionStore.ts` → `useHasFeature(key)`（消费后端下发 features 数组，禁止自建映射） |

---

## 5. 操作纪律

### Worktree 共享 refs 约束

本任务使用 git worktree 隔离。worktree 隔离的是文件互踩，不是仓库互踩。
**禁止在任一 worktree 内执行影响共享 refs 的破坏性操作：**

- `git branch -D`（强删分支）
- `git push --force`（覆写远端历史）
- `git reflog expire`（清除恢复点）
- `git gc --prune=now`（立即清除悬空对象）

真正保护这批工作的是已推送到远端的分支，不是 worktree。

### backup/pre-edition-split 不得删除

`backup/pre-edition-split` 指向 `265e976`（混合 4 主题的巨型 commit）。
该 commit 同时包含另一会话的工作（Reports / Knowledge / CostLedger Grid），
而远端 `feat/folderstack3d-react` 仍停在 `8708557a`。

**在另一会话正式推送其工作之前，禁止删除 `backup/pre-edition-split`。**

---

## 6. 相关文档

| 文档 | 路径 |
|------|------|
| 步骤 1 交接 | `docs/enterprise/HANDOFF-STEP1.md` |
| 权限矩阵快照 | `docs/enterprise/PERMISSION-SNAPSHOT.md` |
| 项目导航 | `AGENTS.md`「版本分线」章节 |


---

## 7. CI 预存红清单（只减不增）

基线：d80020d（four-themes merge）引入，5fb0241（merge 前）全绿。
证据：GitHub Actions run 30656905289（master, d80020d）。
规则：清单外任何 job 红 = 不通过。新增豁免需单独批准。

| # | Job | 红因 | 基线证据 | 数量 | 登记 |
|---|-----|------|----------|------|------|
| 1 | Backend Redline Static Scan（28.3 起独立 job） | check-backend-rules 28 项（22 B1 token 口径误报 + 7 B3 catch 无日志，扣 1 已修） | run 30656905289 | 28 项 | TD-BACKEND-28 |
| 2 | ~~E2E Critical Paths~~ | ~~API 60s 启动超时（CI runner 环境）~~ | run 30656905289 | ~~1 job~~ | ~~TD-E2E-TIMEOUT~~ |
| 3 | ~~Unit Tests (22)~~ | ~~ConversationHistory.test.tsx 6 个稳定失败（waitFor 找不到「今天的对话」）~~ | run 30656905289 | ~~6 tests~~ | ~~TD-VITEST-CONVHIST~~ |
| 4 | Backend Build & Test（filter 排除 5 条 M2 测试） | 5 条 Model_* 测试需真实 BGE 模型文件预存在（与 BgeE2ETests 同族）；CI 无确定性供给步骤，新 VM 必红 | run 30885122149（红）/ 30885991410、30888639643（绿） | 5 tests | TD-M2-REALMODEL |

注：Unit Tests (20) 在 d80020d 为 cancelled（被 22 的失败触发取消），非独立红因。

### TD-M2-REALMODEL 登记（R3.2，审查方批准的唯一条目；棘轮只减不增）

- **根因（一句话）**：M2 的 5 条 Model_* 测试断言真实 BGE 模型文件必须预存在（`Assert.True(File.Exists(realModel))`，M2FourthRoundTests.cs 断言行 290/343/378/436/484），CI 无确定性供给（模型未纳入版本库、workflow 无下载步骤），而套件内所有触发真实下载（hf-mirror.com，bge-small-zh-v1.5.onnx 94.8MB）的路径（POST /api/knowledge/documents → KnowledgeBaseService.IngestAsync → BgeEmbeddingService.EnsureModelAsync，KnowledgeBaseService.cs:153-158；POST /api/contracts/income fire-and-forget）在串行执行序中全部晚于这 5 条测试 → 新 VM 上 5 条必红。
- **实测证据指针**：红 run 30885122149（01eea40，`Failed: 5, Passed: 689, Total: 694`，断言行 290/343/378/436/484）；绿 run 30885991410（fcbbc65，0 失败）、30888639643（b2bcd22，0 失败）。本地闭环复现（2026-08-04）：移走本机模型（GetEngineDir 路径 E:\asr-engine\embedding）→ 同 5 条、同断言行失败；单跑 WritePermission_AdminUser_CanWrite_Returns200（POST /api/knowledge/documents）→ 94.8MB 模型真实下载落地 GetEngineDir()/embedding/（文件时间戳实测）；再跑 5 条 → 全绿。
- **绿 run 机制（已证实，非「不可控」）**：GitHub Windows runner 池 VM 状态跨 job 保留——上一 job 的运行内下载落在 runner 的 `D:\asr-engine\embedding\`（GetEngineDir 兜底路径），对本次 run 的 5 条（~40s 处执行）太晚，但对复用到同一 VM 的下一 job 生效 → 绿。红 run = 该 VM 恰好冷启动/被轮换。
- **附带发现**：E2E_RealBge（类 `BgeE2ETestsV2`）FQN 含 "BgeE2ETests"，早被原 filter `!~BgeE2ETests` 排除，CI 上从未执行（handoff 分项「BgeE2E 1」即它）——红 run 上它「通过」是未运行，不是模型可用。
- **代价**：这 5 条在 CI 不再执行（本地仍全量执行——本机模型存在，已验证 7/7 全绿）；CI 后端 total 相应 −5。
- **解除条件**：CI 增加确定性模型准备步骤（如 actions/cache 或显式下载到 GetEngineDir() 路径），验证连续绿后移除 filter 排除项并将本条目移出清单。

### encoding-baseline = 1 正式登记（R4.4，豁免三条件第 2 条补齐）

- **债**：check-encoding 报 1 处 U+FFFD（src/utils/useWorkerImport.ts），为有意正则（编码检测逻辑），非乱码。
- **基线**：encoding 门禁口径 violation(s) <= baseline 1；基线文件 = scripts/check-encoding.cjs 的 baseline 常量。
- **证据**：npm run check 输出 "encoding check passed: 1 violation(s) <= baseline 1"；R2-R4 三轮实测恒为 1。
- **棘轮**：只减不增——若 useWorkerImport.ts 的 U+FFFD 被移除，baseline 同步降为 0。

### TD 出栈记录（棘轮只减不增）

- **TD-VITEST-CONVHIST 出栈（2026-08-04，R3.4）**：根因 = 测试 mock 过时——组件 `loadConversations` 用 `Promise.all([getAgentConversations(), getDeletedAgentConversations()])`（ConversationHistory.tsx 原 L74-77），测试 mock 缺 `getDeletedAgentConversations`（agent-client.ts:111 真实导出）→ 加载必抛 → silent catch → 列表恒空 → 6 条全挂在 `getByText('今天的对话')`。修复 = 补齐 mock（不弱化任何断言）；顺带按 M-REFACTOR1 把组件拆到 177 行（useConversationList hook）。验证：vitest 1725 total / 0 failed；check 警告 14→13。移除依据：6 条失败已修绿且全量 0 failed。

- **TD-E2E-TIMEOUT 出栈（2026-08-03）**：修复为 E2E 的「启动 API + 等待就绪 + Playwright」合并为单个步骤（进程生命周期完全在步骤内，finally 中 Stop-Process 清理）。验证：run 30833294697 E2E job success。
  - **根因归因（已降级为假说，28.4c）**：「GitHub Actions runner 2026-08 起清理跨步骤子进程」是**未经证实的假说**。证据只支持「8/1 能跨步骤存活、8/3 不能」，不支持具体机制（可能是 runner 行为变化，也可能是 -PassThru 引入的句柄变化等其他原因）。**单步骤方案的有效性不依赖该假说成立**——无论根因是什么，进程生命周期完全在步骤内即可规避。
  - **已确立的事实（28.4c）**：单步骤方案在包含 F1（EditionResolver）的代码上跑绿，反证 F1 未破坏 API 启动。

### 技术债登记（28.4，只登记不修）

| # | 登记 | 债 | 说明 |
|---|------|-----|------|
| 1 | TD-XUNIT-SERIAL | xUnit 全局 disableParallelization | `_cachedEdition` 是全局可变静态，xUnit 并行会互相污染（EditionFreezeEndpointsTests 切换 edition 与依赖 enterprise 的测试类竞态）。已 `[assembly: CollectionBehavior(DisableTestParallelization = true)]`，代价：dotnet test 串行 5m29s。根治方向：edition 判定脱离静态缓存（F1 已让映射测试退役反射，但端点测试仍依赖）。 |
| 2 | TD-EDITION-REFLECT | 端点冻结测试用反射改 `_cachedEdition` | F1 已让【映射】测试退役「反射改 _cachedEdition + 环境变量」手法（改为 Resolve 纯函数），但【端点】测试（EditionFreezeEndpointsTests）又复活了它：用「临时设 env + 反射清缓存」在端点级切换 edition。如实写明：这是 GetEdition 薄壳静态缓存 + config 路径硬编码 %APPDATA% 的必然结果，端点级无干净状态可拿。根治方向：GetEdition 可注入 configPath（F2 范围）。**新增端点级冻结/隔离测试沿用反射切换，已知代价：必须串行 + 需自行还原全局状态（R2.3 已为 CostLedgerIsolationTests 补齐「存旧值→finally 还原 env + 删除注入用户」的还原纪律）。** |
| 3 | TD-E2E-ROOTCAUSE-HYPOTHESIS | E2E 根因归因未证实 | 「runner 清理跨步骤子进程」是假说（见上）。单步骤方案有效性不依赖该假说，但若真因是 -PassThru 句柄变化等其他机制，其他 job 的后台进程也可能受影响，需留意。 |

