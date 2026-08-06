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



### 门禁口径变化备注表（R4/R5/R6，TD-BACKEND-28 条目下）

**重要**：TD-BACKEND-28 的 28 这个数字在 R4/R5/R6 多轮口径调整后仍为 28，
「28 不变」≠「口径不变」。以下逐项记录 R4/R5/R6 对 check-backend-rules 的门禁口径变化，
下一轮以本表为基准比对，任何新增放宽必须在此登记。

| # | 变化 | 类型 | 原因/说明 |
|---|------|------|----------|
| 1 | B1 插值白名单新增：projectFilterInvoices / projectFilterSettlements / projectFilterCostLedger | 放宽（逐条枚举） | R4.1 修复 AgentToolService dashboard 时按表拆分过滤器片段，三个新片段名入白名单 |
| 2 | B1 新增机制：ALLOWED_SQL_INTERPOLATION_PATTERNS（正则模式白名单） | 放宽（机制升级） | R4.1 后 UserFilterWithAuthorizedProjects 带表名限定列实参，精确字符串枚举不可行（表名会增长），改正则模式匹配 |
| 3 | B1 拼接切片窗口 80 → 240（before/after 两侧） | 放宽（窗口扩大） | 限定列调用文本超 80 字符被截断导致白名单失配（R4.2 实测）——这是扫描窗口修正，不是放行新形态 |
| 4 | B5 例外 1 处：SafeQueryValidator.cs GetTableFilter 动态构造列名 | 显式例外 | projectCol 由 tableAlias 运行时拼装；行为由 R5.1(b)(c)(d) 测试钉住；B5 打印「例外放行 N 处」不许静默 |
| 5 | B5 从形状匹配改为全枚举（R5.3） | 收紧（fail-open → fail-closed） | 形状不匹配的调用点（方法调用首参/插值串/成员访问实参）此前静默跳过；现一律 HARD FAIL |
| 6 | B5 限定符黑名单：pa_authz / project_authorizations（R5.2） | 收紧 | 自引用限定符 → 自比较恒真 → 越权；守卫与 B5 双重拦截 |
| 7 | B6 新增：手写 project_authorizations 过滤副本（SELECT 1 FROM project_authorizations 签名） | 收紧（新规则） | 消灭绕过 helper 的手写副本（R5.4 迁移 settlements/invoices/BuildScopeFilter 三处）；白名单为空；授权表自身管理端点（SELECT pa.* / INSERT INTO）天然不匹配该签名 |
| 8 | B3 catch 日志（无变化） | — | R5.1(e) 新增 runSafeQuery 校验 catch 已含 Console.Error.WriteLine，未触基线 |
| 9 | B5 限定符引用归一化：剥离 [] / "" / `` 后比对黑名单（R6.2） | 收紧 | G4：带引号的 "[pa_authz].project_id" / "`pa_authz`.project_id" / "[project_authorizations].project_id" 此前绕过黑名单（限定符原样比对）→ 恒真自比较越权；守卫 NormalizeQualifier + B5 normalizeSqlQualifier 双重归一化；DataScopeTests 回归测试钉住 3 形态 |
| 10 | B5 首参门禁：必须为 scope 变量或 CurrentUser.GetDataScope(ctx)；硬编码 DataScope.All → HARD FAIL；同规则覆盖 UserFilterCompany（R6.3） | 收紧（新签名） | G2：调用点硬编码 DataScope.All 作首参 → UserFilter* 返回 (1=1) 恒真 → 全员可见全部数据；现有全部调用点均合规（存量 28 不变），破坏性自证（ContractEndpoints/MemberEndpoints 合成 .All）双红后还原 |
| 11 | B6 收紧（R6.4）：修复 lastIndex bug（去掉 /g 标志）+ 新增形态 B「相关比较」签名（project_id = x.project_id / x.project_id = project_id，限定符非 @ 参数）+ 形态 A 支持带引号表名 | 收紧（修复+新签名） | G3：全局正则 test() 复用 lastIndex 交替漏检（同文件两个副本时第二个被跳过）；G5：SELECT 1 FROM 签名过窄，相关比较/JOIN ON 裸右/带引号表名形态可绕过；负向对照（AuthEndpoints 5 条 SQL + CanAccessProject COUNT）实测保持绿色；5 形态自证 fixture 全部命中后删除 |
| 12 | B5 首参门禁伴生规则：`var scope = <右侧含 DataScope 且非 GetDataScope>` → HARD FAIL（R7.7 G13） | 收紧（新规则） | G13：`var scope = CurrentUser.DataScope.All;` 可整体绕过首参门禁。纪律 17 偏差两处：① DI `var scope = ctx.RequestServices.CreateScope()`（System.IServiceScope，类型与 DataScope 无关）误伤 → 收紧为「右侧含 DataScope 标识符」才 FAIL；② `var scope = isAdmin ? DataScope.All : DataScope.AuthorizedProjects`（KnowledgeBaseService.BuildScopeFilter，无 ctx）是 GetDataScope(ctx) 的同构运行时判定（CurrentUser.cs:37-38 即 IsAdmin ? All : AuthorizedProjects，R5.4 语义等价迁移，行为由 ProjectAuthzIsolationTests 三分支钉住）→ 显式放行形态，不许其他形态绕过 |
| 13 | B6 形态 B 左边界 + 形态 B2（R7.7 G14） | 收紧（修复+新签名） | G14 记过 6：`cl.project_id = p.project_id` 会从 cl. 后 project_id 起误匹配（合法 JOIN 判红）→ 裸 project_id 侧加边界（前不得紧邻 \w/. /引号，后不得紧邻 \w）。B2：双限定 project_id 比较仅当同字面量含 project_authorizations 时命中；AuthEndpoints（pa.project_id = p.id 右侧列是 id）天然不匹配；负例 cl.project_id = p.project_id 实测不命中 |
| 14 | B5 伴生规则由单形态扩为三形态（var / 显式类型 / 重新赋值）（R8.5 G24） | 收紧（新规则） | R7.7 只堵 var 声明；G24 实测 `CurrentUser.DataScope scope = ...;`（显式类型）与 `scope = ...;`（重新赋值）可绕过 → 三形态全枚举；`==` 排除防误伤；三形态自证 fixture 全命中后删除 | 28 不变 |
| 15 | count 文件缺失或解析失败由静默 fail-open 改为 exit 2 fail-closed（R8.6 G25） | 收紧（fail-open → fail-closed） | 此前 catch 后 expectedCount=null 走旧逻辑 exit 1（等同 fail-open）；现缺失/解析失败直接 exit 2 + FATAL 文案；自证：改坏 → exit 2 → 还原 → exit 1 | 28 不变 |
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
| 4 | TD-PERM-MATRIX-DRIFT（R6.7 G10） | agent 工具路径 GetUserPermissions 硬编码 Common.GetDefaultPermissions，与前端 HasPermission 读取 DB roles.permissions 口径不一致 | 实测（R6.7 测试钉住）：worker 默认权限 = [dashboard/projects/members/wages:read]，不含 safeQuery:read；manager 含。但 DB roles.permissions 若被管理员自定义（或默认种子与硬编码漂移），agent 路径仍按硬编码判定 → 两端权限口径可能不一致（一边放行一边拒绝）。风险方向：agent 路径更严格（默认值不含自定义放行）→ 无越权，只有可用性差异。仅登记不修复（R6.7）；根治方向：GetUserPermissions 改为读 DB roles.permissions（与 HasPermission 同源），需统一缓存策略与 fail-closed 语义。 |


### R7 实证记录（G11/G12 已修 + 只登记不修项）

- **G11 作用域穿透（严重，已修 + 实证指针）**：先红实证——manager 执行 `SELECT (SELECT amount FROM invoices i WHERE i.id = 3) AS leaked FROM invoices i` 返回 `{"leaked":300}`×2（子查询内表零过滤，两条过滤都注入顶层绑定外层 i）；`SELECT a.id, b.amount FROM invoices a JOIN (SELECT ...) b ON a.id = b.id` fail-closed（no such column: invoices.created_by）。修复 = TableOccurrence.Depth 全链传递（CollectTables/ValidateDerivedQuery/ValidateProjection/ValidateExpressionColumns），深度>0 拒绝整条查询（明确文案「嵌套查询暂不支持」+ 审计 warning）；工具描述同步更新。覆盖 = 4 形态 Theory（Derived/IN/EXISTS/标量子查询，各断言拒绝文案 + 300 不泄漏）+ 2 正向对照（顶层 SELECT 返回 {100,200}、self-join 行数 4 {100,100,200,200}）+ R7.5 正向对照。破坏自证：去掉作用域判定 → 4 红 → 还原 → 6 绿 → porcelain 空。
- **G12 字面量劫持（严重，已修 + 实证指针）**：先红实证——`SELECT 'WHERE' AS w, id, amount FROM invoices` 的过滤片段被整段插进 w 列字面量、SQL 无任何过滤 → amount=300 全表泄漏；`SELECT 'LIMIT 1' AS w, id FROM invoices` 无 LIMIT 保护。修复 = MaskSqlLiterals（单引号字面量掩码，'' 转义，保留长度/换行），FindTopLevelKeyword/EnsureLimit 在掩码副本上定位偏移。覆盖 = WHERE/LIMIT/GROUP/ORDER 四 token 字面量 Theory（各断言 {100,200} 可见 + 300 不出现 + w 列原文）+ 普通查询正向对照。破坏自证：去掩码 → 4 红 → 还原 → 5 绿 → porcelain 空。
- **G18（小，只登记不修）**：保留别名拒绝不覆盖列限定符形态（`WHERE pa_authz.project_id = 'P1'` 能过验证层，靠 SQLite 作用域 + DryRun 兜底，错误文案回吐 pa_authz）。登记不修；根治方向：列校验阶段对保留限定符（归一化后）的列引用同样拒绝。
- **G19（小，只登记不修）**：限定符归一化逻辑三处手写副本（CurrentUser.NormalizeQualifier / SafeQueryValidator 7.5 步内联 while / 门禁 normalizeSqlQualifier）。登记不修；根治方向：提取共享静态工具（如 Common.NormalizeSqlIdentifier），三处调用同一实现。


- 开源口径已确认：MIT
- R8.12 manager 写权限裁决（方案丙：可读可改不可删，删除限 created_by/admin，跨人修改落审计）已登记 → 施工面盘点见 PERMISSION-SNAPSHOT.md「R8.12 manager 写权限裁决与施工面盘点」
，仓库有意公开；企业版差异化在服务不在代码授权。依据：README.md 许可证段（R8.10 补 LICENSE 文件）

### R8 实证记录（G20/G21 已修 + G22 实证 + 只登记不修项）

- **G20 WHERE OR 优先级击穿（严重，已修 + 实证指针）**：先红实证——`WHERE id = 0 OR 1 = 1` 注入后为 `WHERE (过滤) AND id = 0 OR 1 = 1`（AND 优先 → OR 恒真）→ 全表含 amount=300；`WHERE amount = 300 OR amount = 300` → 直出 300。修复 = 注入形态改 `WHERE ({filterClause}) AND ({userWhere})`，userWhere 终点 = 顶层 GROUP/ORDER/LIMIT 最靠前者或串尾（终点定位在 MaskSqlLiterals 副本上，G12 教训）。覆盖 = 2 OR PoC + NOT + 3 尾子句组合 + 正向对照（11 测试）。破坏自证：去括弧 → 2 红 → 还原 → 全绿。
- **G21 CTE 主体零校验（严重，已修 + 实证指针）**：先红实证——`WITH invoices AS (SELECT s.id ... FROM settlements s) SELECT ... FROM invoices`（CTE 名伪装白名单表 + created_by 伪装）→ 泄漏全部 settlements 行；`WITH invoices AS (... FROM audit_logs)` → **穿透 ForbiddenTables**（WITH 子句不在 select.From，从未被 CollectTables 校验）。修复 = `query.With != null` → fail-closed 拒绝（文案与 7.6 同族 + 「暂不支持 WITH/CTE」）+ 工具描述更新。覆盖 = 3 CTE 形态拒绝 + 正向对照。破坏自证：条件恒 false → 3 红 → 还原 → 全绿。
- **G22 CI 棘轮生效（已实证）**：workflow 改 `code=0; node ... || code=$?`（R8.3 审查方指定，if-cmd 后取 $? 语义含歧义）。CI 级双向实证：run 号（绿/红/回绿）见 R8 报告必答 3；`RATCHET BROKEN: N 项违规 != 登记基线 28` 为失败判定输出。
- **G26（只登记不修）**：表达式类型枚举缺口——R8.4 fail-closed default 上线后，任何未枚举的 Expression 子类型会 throw 并打印类型名（宁可拒绝不静默）。当前已枚举 LiteralValue/Wildcard/QualifiedWildcard（无列引用叶子）。未来新增类型由人决定补枚举或保持拒绝；登记不修。
- **G27（只登记不修）**：audit_logs 幽灵列类缺陷根治方向——R8.7(c) 全仓清单显示写侧 6 处 INSERT（含 [audit_logs] 方括号形态）+ 读侧 ReportGenerationService 均已对齐 resource 列；但「列名与 DDL 漂移」这类错误已在 6 处 INSERT + 3 处 SELECT 上重复发生（description / resource_type），证明人工对齐不可靠。根治方向：门禁新增「列存在性」规则——扫描 audit_logs 相关 SQL 字面量的列清单与 Program.cs:535 DDL 逐列比对，漂移即 HARD FAIL。登记不修（R8 范围外）。
- **G28 报告 prompt 消费端列名漂移（R8.14.1 已修，实证指针）**：R8.7 只改了 SQL 列名（resource_type → resource），BuildUserPrompt 两处消费端仍读 .resource_type → Dapper 对缺失列返回 null（实测：prompt 打出「- : 2 次」）→ 报告静默残缺。修复 = 两处 .resource_type → .resource + 注释对齐；先红测试（FakeLlm 拦截 userPrompt）→ 修复 → 破坏自证闭环。测试：ReportAuditPromptTests.UserPrompt_ResourceSection_ContainsInvoiceAndContract。
- **G29 AggregateKpiAsync 的 catch 静默吞异常（只登记不修）**：ReportGenerationService.cs:214-217 `catch (Exception ex) { Console.Error.WriteLine(...) }`——异常被吞 → KPI 返回全 0（宿主无人看 Console.Error）+ ex.Message 未经 Sanitize 直接入日志文本。与 G26/长队列「AggregateKpiAsync 返回全 0」同源。根治方向：聚合失败返回结构化错误并回传前端（Sanitize 后）。登记不修。
- **G30 尾子句定位器括号内关键字（结论已由 G33 订正，见下条）**：R8.14.3 三条 PoC 实测（① `WHERE id IN (SELECT 1 ORDER BY 1) OR 1 = 1`；② `LIKE '%ORDER BY%'`；③ `/* GROUP BY */` 注释）均无 300 泄漏。**机制归因订正（R8.16.4）**：PoC-1 不是被 7.6 深度检查拒绝的——7.6 位于 ValidateAndRewrite 末尾（8.5 之后），NRE 发生在 ValidateExpressionColumns → InSubquery → ValidateDerivedQuery → CollectTables，从未走到 7.6；修复后拦它的是 R8.15.2 的无表子查询 guard（及 R8.16.1 顶层 guard），也不是 7.6。三条保留为正向对照测试（R8G30PoCTests）。
- **G31 UserFilterCompany 命名撒谎（只登记不修，R9 一并重命名）**：函数名 Company（公司级）但函数体是 `created_by = @Uid`（个人级，CurrentUser.cs:69），比 UserFilterWithAuthorizedProjects 还严；每个读代码的人都会被误导。R9 重命名（如 UserFilterOwnOnly）。登记不修。
- **G32 无表子查询 NRE（已修，实证指针）**：① 子查询路径（R8.15.2）：`SELECT id IN (SELECT 1 ORDER BY 1)` → `subSelect.From == null` → CollectTables foreach NRE，被外层 catch 兜成「校验异常: Object reference...」；修复 = ValidateDerivedQuery 入口显式 fail-closed（固定文案「无表子查询暂不支持：子查询必须引用白名单内的表（R8.15.2 fail-closed）。」）。② 顶层路径（R8.16.1 补完）：`SELECT 1` / `SELECT 1 ORDER BY 1` 的 `select.From == null` 走 ValidateAndRewrite 步骤 7 的 CollectTables——该处 try 只 catch ValidationException，NRE 穿透整个校验器（探针实测）；修复 = CollectTables 入口 `if (fromClause == null) return;`（在空引用点本身防，任何调用点传 null 都不再 NRE），落回「未找到有效的表名」设计拒绝；ValidateDerivedQuery 的无表子查询 throw 原样保留（空过会让 depth>0 的 occurrence 收不到，7.6 拦不住）。调用点 grep：仅 :229（顶层，被入口 guard 覆盖）与 :471（子查询，被 throw 覆盖）两处。
- **G33 G30 结论订正**：原「G30 不成立」表述撤回；精确结论为「当前不可达依赖 7.6 深度 fail-closed，非定位器自身健壮；7.6 放宽即需重测」。PoC-1 由「没泄漏」改为「设计性拒绝」断言（R8.15.1），三条 PoC 保留为正向对照。
- **G34 门禁不扫 EngineeringManager.Tests/（只登记不修）**：静态扫描（check-backend-rules.cjs）csFiles 仅遍历 EngineeringManager.Api/，测试代码可写空 catch 与恒真断言（R8.15.1(a) 恒真实证即为测试代码）。R9 或专轮评估是否把静态扫描扩到测试目录。登记不修。
- **G35 ValidateProjection else 分支 fail-closed（R8.16.2 已修，不可达防御性）**：未知 SelectItem 类型此前 `else { continue; }` 静默跳过列白名单校验（R8.4 G23 在兄弟函数的同款分支漏改）。改为 `throw new ValidationException("不支持的投影项类型：{item.GetType().Name}（R8.16.2 fail-closed）")`。全量测试无变红——当前 SelectItem 仅 4 种已全枚举（Wildcard/QualifiedWildcard 显式 throw，UnnamedExpression/ExpressionWithAlias 枚举），此分支不可达，本改动为防御性，无法提供破坏自证（如实声明）。
- **G36 InjectUserFilterAstAware 零过滤器兜底 fail-closed（R8.16.3 已修，不可达防御性）**：`filters.Count == 0` 此前 `return sql;`（fail-open——拿不到过滤器就原样返回未注入过滤的 SQL）。改为 `throw new ValidationException("未能为任何表生成过滤条件，拒绝执行（R8.16.3 fail-closed）")`，由 ValidateAndRewrite 既有 catch 转 ValidationResult。全量测试无变红——可达性分析：occurrences 为空时 referencedTables 也为空，「未找到有效的表名」在步骤 7 先拒；occurrences 非空时 CollectTableFromFactor 已保证表全在白名单（ForbiddenTables/白名单 throw）→ 此分支不可达，防御性，无法提供破坏自证（如实声明）。
- **003 迁移记录脱节（红线级，指向 M-AUDIT M5/M10，结论 R8.16.4 订正）**：`schema_versions` 第 1-9 条时间戳全部为 2026-06-12 00:00:00，属一次性批量登记（把既有老库直接标记为已升至第 9 版），非 9 次真实执行；生产库无 _new 残留表，佐证 003 一条语句都未执行过。**机制 = 基线登记时无人核对物理结构，非执行器缺陷**。现行 MigrationRunner 顺序正确（先执行后记录、同事务、吞错范围仅 IsBenignAlterError），无此缺陷。后续核对归 M-AUDIT M5/M10。

