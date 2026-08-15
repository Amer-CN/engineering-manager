# 冻结契约 · FREEZE-CONTRACT

> **M-EDITION1 版本分线** — 个人版 / 企业版功能冻结清单与维护铁律
>
> 基线 commit：`46da1f8` / master（2026-07-31）
> 生效版本：v0.83.0+
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
- `DataScope` 多用户分支（`CurrentUser.cs`）— personal 恒返 `All`
- 审计按用户筛选（`SystemEndpoints.cs` L106-L108）

---

## 2. 三条维护铁律

1. **只冻代码不冻数据** — `users` / `roles` / `project_authorizations` / `created_by` 等表和列保留，禁止删表删列迁移
2. **冻结区代码必须继续编译跑测试** — 禁止删除其对应测试
3. **企业版（enterprise）功能原样可用** — 冻结不等于删除；`config.json` 设 `"edition": "enterprise"` 即解冻全部

---

## 3. 解冻检查清单

企业版上线前逐条确认：

- [ ] **后端补齐端点级 RBAC** — 当前权限检查仅存在于前端（`src/hooks/usePermission.tsx` RequirePermission/RequireAdmin + `src/hooks/permissionHelpers.tsx` 守卫实现）。后端 `GlobalAuthMiddleware` 只校验登录，不校验权限码。`CurrentUser.HasPermission(ctx, db, "xxx:read")` 方法存在（`Security/CurrentUser.cs` L127-L151）但无任何端点调用它。解冻每个端点时必须同时接入 HasPermission 校验
- [ ] `GET /api/roles` 等端点移除 `ApiConfig.IsPersonal` gate
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
| 后端 | `ApiConfig.GetEdition()` / `ApiConfig.IsPersonal` / `ApiConfig.IsEnterprise` |
| API | `GET /api/config` 响应含 `edition` 字段 |
| 前端 | `src/store/editionStore.ts` → `useIsPersonal()` / `useIsEnterprise()` |

---

## 5. 相关文档

| 文档 | 路径 |
|------|------|
| 步骤 1 交接 | `docs/enterprise/HANDOFF-STEP1.md` |
| 权限矩阵快照 | `docs/enterprise/PERMISSION-SNAPSHOT.md` |
| 项目导航 | `AGENTS.md`「版本分线」章节 |

---

## 6. 安全修复登记（R9-1，写侧归属守卫）

> 本节点按 R9 系列安全审查登记写侧归属守卫进展。G 编号由审查方（M-FIX/R9 轮）命名，
> 与 §1 冻结清单无关，属「数据范围 / 归属校验」缺陷跟踪。

### G73 已修（batch-import UPDATE 归属守卫）

- 端点：`POST /api/attendances/batch-import`（`WageEndpoints.cs`）
- 修复：UPDATE 分支 WHERE 由 `id=@Id` 改为 `id=@Id AND (created_by=@Uid OR @IsAdmin=1)`（对齐 `PUT /api/attendances` 既有守卫）；新增 `skipped` 数组返回被归属拦截的 projectWorkerId（照 generate-v2 先例）；INSERT 分支未动（归 G75）
- 实证指针（fix/r9-1 三笔 commit）：
  - `f9952ef` — Z1(a) 翻转 Y1b 目标态断言（先红：Y1b updated==1、Y1a skipped 键缺失，EXIT≠0）
  - `65fc5db` — Z1(b) 修复 + 3/3 绿
  - 破坏自证：临时删守卫 → Y1b 红（updated==1）→ `git checkout --` 还原 → 3/3 绿 → porcelain 空
- 测试：`EngineeringManager.Tests/Endpoints/R9AttendanceImportAuthzTests.cs`（Y1b 改名 `CannotOverwriteForeignRow`）

### G74 闭环（写侧全集清点已交付）

- `docs/planning/R9-SCOPE.md` §1b：写侧全集四桶分类 = **A 7 / B 42 / C 6 / D 10 = 65 条业务写语句**（grep 95 匹配对账）
- D 桶（无归属校验写语句）10 条为 R9 修复候选集，G73 已处理其中 D1 的 UPDATE 分支，D2 本轮处理（见下）

### D2 已修（generate UPDATE 归属守卫）

- 端点：`POST /api/wages/generate`（`WageEndpoints.cs`）
- 修复：UPDATE 分支 WHERE 追加 `AND (created_by=@Uid OR @IsAdmin=1)`（对齐 `PUT /api/wages` 既有守卫）；新增 `ownershipSkipped` int 计数与响应字段（照 archivedSkipped 先例，不换结构）；INSERT 分支未动（归 G75）
- 实证指针（fix/r9-2 三笔 commit + 破坏自证）：
  - `5e75492` — Z1(b) 初版 GenB 目标态断言（expected-red；后被裁决不可达，见下）
  - `fb0f871` — Z1 续(a) 重建 GenB（`GenB_OwnAttendance_ForeignWageRow_CannotOverwrite`：B 自建考勤 + A 建工资行 → 触达 UPDATE 守卫）
  - `e515be9` — Z1(c) 修复 + 3/3 绿
  - 破坏自证：临时删守卫 → GenB 红（`Expected: 20000, Actual: 30000`，A 的工资行被 B 重算）→ `git checkout --` 还原 → 3/3 绿 → porcelain 空
- 威胁模型定稿：**enterprise 下可触达面被考勤源 scope 过滤收窄**——generate 的考勤源 SELECT 带 `UserFilterWithAuthorizedProjects(scope, "a.project_id", "a.created_by")`，非 admin 只能读到自建或已授权项目的考勤行，故只有「自建或授权考勤行 + 他人/未授权工资行」的组合能走到 UPDATE；守卫经「自建考勤 + 他人工资行」路径实证。个人版单 admin 天然免疫（GetDataScope 恒返 All 且 IsAdmin 恒真）。
- 留痕一句：本轮任务书初版误述测试基座为 personal，执行方纪律 17 停手纠正（实测基座 = enterprise，ApiTestBase.cs:28），审查方已撤回该陈述并裁决方案 A 变体。

### G75 已修（创建路径项目级写入门坎，范围扩面 4→5）

- **范围扩面说明**：登记时 4 处（batch-import INSERT / generate / generate-v2 / batch-create），审查方主动扩面至 **5 处**——补 `POST /api/attendances` 单条（与四处同族，不修它就是半修）。
- 修复形态：`CurrentUser.CanWriteProject(ctx, db, projectId)`（方案丙创建侧门坎，签名风格照 HasPermission）——三级判定：admin → true；`projects.created_by == uid` → true；`EXISTS(SELECT 1 FROM project_authorizations pa WHERE pa.project_id=p.id AND pa.user_id=@Uid)` → true；否则 false。子查询形态与 UserFilterWithAuthorizedProjects 同族（别名 + 限定列）。
- 五端点接线（均在 HasPermission("wages:create") 之后、任何写之前）：
  1. `POST /api/attendances`（单条）：`dto.ProjectId` 可空，为空 → 400「projectId 必填」；否则 `CanWriteProject` 不过 → 403
  2. `batch-create`：逐条反序列化后先收集 distinct ProjectId；空集合 → 400；任一门不过 → 整单 403
  3. `generate` / 4. `generate-v2`：对已验证 `dto.ProjectId.Value` 一道门（循环之前）
  5. `batch-import`：对已验证 projectId 一道门（循环之前）；**UPDATE 行级守卫（R9-1 第二层防线）原地保留**
- 实证指针（fix/r9-3 两笔 commit + 破坏自证）：
  - `0d21ef6` — 12 条测试（反向×5 无授权→403、正向×5 admin→200、授权×2 project_authorizations 种子→200）；先红 5 反向全红（Actual OK）
  - `b3df8ec` — CanWriteProject helper + 5 端点接线 + GenA/GenC 硬化 → 12/12 绿
  - 破坏自证 A：CanWriteProject 改恒 true → 5 反向全红（Expected Forbidden / Actual OK）→ 还原
  - 破坏自证 B：摘掉 batch-create 门 → 只有它的反向红（证明逐点接线）→ 还原 → 12/12 绿 → porcelain 空
- 测试：`EngineeringManager.Tests/Endpoints/R9CreatePathProjectGateTests.cs`
- 禁止清单遵守：未把任何行级守卫放宽为「授权项目可改他人行」（方案丙更新侧，另排）

### 两层防线定稿（R9-3 W2，G75 与 G73 的叠加关系）

- **项目级门（G75，创建侧，方案丙）在前**：`CanWriteProject` —— 能否「写这个项目」（admin / 项目创建者 / 项目授权任一即放行）。
- **行级守卫（G73，更新侧现状语义）在后**：`(created_by=@Uid OR @IsAdmin=1)` —— 能否「改这一行」。
- **判别信号**：`403` = 项目级门拦（非 admin 且无授权/非本人项目）；`200 + skipped` = 项目级门过、行级守卫拦（有项目授权但改的是他人创建的行）。
- **测试适配（R9-3 W1）**：Y1b 补「projects 行 + project_authorizations 行」两个种子（缺一不可——CanWriteProject 的 SQL 以 projects 行为锚，光补授权查不到项目行照样 403），使 B 过项目级门、抵达行级守卫，断言不变（200 + skipped 成立，证明拦人的是行级守卫而非项目门）。
- **Y1d 新增（正向对照）**：B + 授权种子 + B 自己创建的考勤行 → import → 200 + updated==1 + skipped 空（两层叠加不过度拦截合法主流程）。
- 留痕一句：本轮任务书 Z5 靶子未预见 Y1b 交互（G75 项目级门遮蔽 G73 行级守卫测试场景），审查方第 2 次规格认账，执行方纪律 17 停手纠正。

### G76 已修（wages 创建侧项目门，CanWriteProject 零新增直接复用）

- **范围**：`POST /api/wages` 与 `batch-save` 的 INSERT/upsert 分支无项目门坎（与 G75 同族：创建工资行可落在未授权项目）。
- 修复形态：**`CurrentUser.CanWriteProject` 零新增直接复用**（一行新 helper 代码都没写）：
  1. `POST /api/wages`：`HasPermission("wages:create")` 之后、INSERT 之前——`dto.ProjectId`（long?，可空）缺失 → 400「projectId 必填」；否则 `CanWriteProject` 不过 → 403
  2. `batch-save`：照 batch-create 同款——先预扫收集 distinct ProjectId；空 → 400；任一门不过 → 整单 403，再进写循环；**DO UPDATE 行级守卫原地不动**
- 实证指针（fix/r9-4 两笔 commit + 破坏自证）：
  - `e9806cd` — 6 条测试（反向×2 无授权→403、正向×2 admin→200 含「分」断言、授权×2 projects+authorization 种子→200）；先红 2 反向全红（Actual OK）
  - `2df226b` — POST /api/wages + batch-save 两调用点接线 → 6/6 绿
  - 破坏自证 A：CanWriteProject 改恒 true → 2 反向全红（Expected Forbidden / Actual OK）→ 还原
  - 破坏自证 B：摘掉 batch-save 门 → 只有它的反向红（证明逐点接线）→ 还原 → 6/6 绿 → porcelain 空
- 测试：`EngineeringManager.Tests/Endpoints/R9WageCreateGateTests.cs`

### 两层防线适配（R9-4 W2）

- `WritePermissionB2Tests` 两个 O3 用例（`Accountant_BatchSave_OtherOwnersRow_Skipped` / `Accountant_BatchSave_OwnRow_Saved`）原用 `projectId=1` 但无 projects 行种子，G76 门下 403 遮蔽行级守卫场景；补 projects 行 + project_authorizations 行（项目 1 → accountant uid='3'，授权分支）使其过门抵达 DO UPDATE 守卫，断言不变（skipped/saved 语义保留）。
- 判别信号沿用：`403` = 项目门拦；`200 + skipped` = 行级守卫拦。
- 留痕：本轮任务书 Z5 靶子未预见既有 B2 交互（与 R9-3 Y1b 同族），审查方第 3 次规格认账；流程修复 = 门禁/守卫类任务书自此必须含既有测试影响面扫描（已入 CONVENTIONS）。

### D6 已修（regions 写端点权限码门）

- **范围**：`POST /api/regions` 与 `DELETE /api/regions/{id}` 两写端点无权限码（GET 读路径全员可用，字典下拉框依赖，不动）。原登记仅 DELETE，POST 由审查方 R9-1 读码补记、本轮一并修复。
- 修复形态：**`settings:update` 权限码门**——`GetUserId` 之后、写之前 `if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();`。
- **权限码归属决策理由**：regions 是全局省市区字典（无 project_id / created_by），行级守卫与项目级门均不适用；字典维护属设置域 → 复用 `settings:update`（admin 默认持有；worker/accountant 默认无——GetDefaultPermissions 查证）。**不新立 regions 码族**——那会动迁移默认、前端权限矩阵与 PERMISSION-SNAPSHOT，收益为零。
- DELETE 既有「0 行受影响 → Forbid」怪癖原位保留（非本轮范围）。
- 实证指针（fix/r9-5 两笔 commit + 破坏自证）：
  - `b59fb0e` — 4 条测试（反向×2 worker 无 settings:update → 403 且无副作用、正向×2 admin → 200 且副作用发生）；先红 2 反向全红（Actual OK）
  - `928e894` — POST + DELETE 两调用点接线 → 4/4 绿
  - 破坏自证 A：摘 POST 门 → 仅 Reverse1（POST）红 → 还原
  - 破坏自证 B：摘 DELETE 门 → 仅 Reverse2（DELETE）红 → 还原 → 4/4 绿 → porcelain 空
- **Z1(b) 影响面扫描结果**：测试工程与前端 src 均无 `api/regions` 既有调用（grep 零命中）→ 无需适配既有测试。
- 测试：`EngineeringManager.Tests/Endpoints/R9RegionWriteGateTests.cs`

### D3 已修（worker-teams PUT 归属守卫）

- 端点：`PUT /api/worker-teams`（`MemberEndpoints.cs`）
- 修复形态：**对齐手足 `DELETE /api/worker-teams/{id}` 的行级守卫**——WHERE 由 `id=@Id` 改为 `id=@Id AND (created_by=@Uid OR @IsAdmin=1)`，补 `var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;` 与 `Uid/IsAdmin` 参数；顺手纠正班组节头撒谎注释（「无 created_by」→「有 created_by（v1.1.0 起）」）。
- **读侧早已按 created_by 过滤（GET `(wt.created_by=@Uid OR @IsAdmin=1)`）、写侧补齐对称**一句。
- 实证指针（fix/r9-6 两笔 commit + 破坏自证）：
  - `57f78f6` — 3 条测试（反向×1 自定义角色 r9-6-lead 改他人行 → 403 + name 不变、正向×2 admin/本人行 → 200）；先红 Reverse1 红（Actual OK，name 被改写 = 漏洞实证）
  - `c4aba11` — PUT 守卫接线 → 3/3 绿
  - 破坏自证：临时摘守卫（WHERE 还原 id=@Id）→ Reverse1 红（Expected Forbidden / Actual OK）→ checkout 还原 → 3/3 绿 → porcelain 空
- **可达性定稿**：`members:update` 默认仅 admin 持有（GetDefaultPermissions 查证）；但企业版角色权限可编辑（`PUT /api/roles` + RoleUpdateDto），admin 给任意角色加该码后路径即现实可达——**守卫补的是配置路径，非纯理论纵深**。测试以自定义角色行（`r9-6-lead`，name==id 走 HasPermission id 直通）模拟该配置，不动任何默认角色行。
- 测试：`EngineeringManager.Tests/Endpoints/R9WorkerTeamGuardTests.cs`

### D9/D10 已修（cost_ledger_categories 写端点权限码收紧）

- 端点：`POST / PUT / DELETE /api/cost-ledger/categories`（`CostLedgerEndpoints.cs`）三处，码 `costLedger:update` → `settings:update`。
- **决策记录**：分类是全局共享字典（无 created_by / project_id），无归属/项目维度；作者 2026-08-09 拍板归 admin 管——**accountant 失去分类管理入口为有意行为变更**（与 regions、reset 端点一致）。`reset` 本已 `settings:update` 不动（测试 Pin1 钉住）；GET 读路径不动。
- **POST 同族扩面说明**：D 桶原登记仅 PUT/DELETE（D9/D10），POST 一并收紧（不修即半修）。
- 实证指针（fix/r9-7 两笔 commit + 破坏自证）：
  - `0f65cb4` — 7 条测试（反向×3 accountant 无 settings:update → 403 且无副作用、正向×3 admin → 200、钉住×1 accountant reset → 403）；先红恰好 3 反向全红（Actual OK = 旧门 costLedger:update 放行 accountant）
  - `050c3f1` — 三调用点码替换 → 7/7 绿
  - 破坏自证 A/B/C：POST/PUT/DELETE 逐点回退 `costLedger:update` → 仅对应反向红 → 还原 → 7/7 绿 → porcelain 空
- **Z1(b) 扫描处置一句话**：既有测试中 categories 写端点全部 worker（无码→403）或 admin（→200），无「非 admin 预期 200」用例 → 无需适配。
- 测试：`EngineeringManager.Tests/Endpoints/R9CategoryGateTests.cs`

### D4/D5/D7/D8 闭卷（D 桶清零，R9-8 零生产代码）

四者皆**全局/纯管理操作**（模板配置 / 审计清理 / 数据库迁移），无行归属语义可补；admin-only 门（`settings:update` 权限码或 `isAdmin` 强校验）即充分控制。逐端点门原文引用 + 覆盖证据：

| 端点 | 门原文 | 覆盖证据 |
|------|--------|----------|
| D4 PUT /api/templates | `TemplateEndpoints.cs:68` `if (!HasPermission(ctx, db, "settings:update")) return Forbid();` | 既有 `WritePermissionB1Tests.Worker_TemplatesUpdate_Returns403` |
| D5 DELETE /api/templates/{id} | `TemplateEndpoints.cs:25` 同 | 既有 `WritePermissionB1Tests.Worker_TemplatesDelete_Returns403`（:282） |
| D7 POST /api/audit/clear | `SystemEndpoints.cs:161` `if (isAdmin == 0) return Forbid();` | 本轮钉住 `R9AdminGatePinTests.D7_AuditClear_Worker_Returns403_AndOldLogsStay`（Z1 清点 D7 缺覆盖） |
| D8 POST /api/sqlite/migrate | `SystemEndpoints.cs:599` `settings:update` 门 | 既有 `WritePermissionT1Tests.Worker_SqliteMigrate_Returns403` |

- **收尾声明：D 桶 10/10 处置完毕**——D1/D2/D3/D6/D9/D10 修复（R9-1/2/3/5/6/7），D4/D5/D7/D8 闭卷（R9-8）——无归属校验写语句面清零。

### 方案丙大对齐总纲（B 桶更新侧，R9-9 起）

- **既定裁决（原作者 2026-08-10 拍板，全部沿用）**：授权项目内可改不可删 + 跨人修改落 audit（fail-closed 必备件）+ 仅企业版（由 `GetDataScope` 天然承担，零新开关）；公司锚定实体与 projects 行本身维持 created_by（Q1）；A 桶 7 条同补 audit（Q2，并入批次 3）。
- **审查方细化裁决（本轮新增）**：B44/B45/B46（付款清空/归档锁定/解锁）对授权跨人不放宽，维持 created_by/admin，随登记入册。
- **四层设计**：① `RowWriteGate.Classify` 四态（AllowedOwn/AllowedViaAuthorization/Denied，C# 单点裁决）；② audit fail-closed 同事务（`AuditWriter.CrossUserEdit` 不写 try/catch，审计写不进 → 事务回滚）；③ 仅企业版由 GetDataScope 承担（个人版恒 All、IsAdmin 恒真 → 永远 AllowedOwn）；④ 锁在授权分支之前（已发款/已归档 → 409，admin/授权也不例外）。
- **分批计划**：1a=B41 本轮；1b=B48+B50 下一轮（含 B2 既有用例语义翻转预告）；2=考勤 B38；3=合同域+A 桶 audit；4=图纸/材料/项目工人；5=收尾对账；confirm-matches 专列。
- **本批实证指针（fix/r9-9 两笔 commit + 破坏自证）**：
  - `00a90af` — 6 条测试（Red1 授权跨人 200+audit、Pin1 无授权 403、Pin2 本人 200 无 audit、Pin3 admin 200、Pin4 锁行授权 409、Pin5 不存在 403）；先红 Red1+Pin1 双红（Actual Conflict = 旧版 409 混同）
  - `13592a7` — RowWriteGate.cs（Classify + AuditWriter）+ PUT /api/wages 重排 → 6/6 绿
  - 破坏自证：Classify AllowedViaAuthorization 分支临时 return Denied → Red1 红（Expected OK / Actual Forbidden）→ 还原 → 6/6 绿 → porcelain 空
- **批次 1b（R9-10，B48 batch-payment + B50 batch-save）**：
  - `384f97d` — 8 条测试 + B2 OtherOwnersRow 翻转 SavedWithAudit（Pin4 重定义 = 项目创建者改他人行 → Denied → skipped；Pin5 = 授权 + 本人行 → saved 无 audit）；先红 Red1+Red2 + B2 改名条红
  - `bfe3ff8` — batch-payment/batch-save 两循环体预读 + Classify + audit → 8/8 + 19/19 绿
  - 破坏自证 A/B：batch-payment/batch-save 循环内授权分支当 Denied → 仅 Red1 / 仅 Red2+B2 红 → 还原 → 双绿 → porcelain 空
- **批次 2（R9-11，B38 PUT /api/attendances）**：
  - `6a05152` — 6 条测试（Red1 授权跨人 200+audit、Pin1 无授权 403 无 audit、Pin2 本人 200 无 audit、Pin3 admin 200、Pin4 不存在 403、Pin5 项目创建者改他人行 403）；先红**恰好 Red1 一红 + 5 绿**（本端点无 409/403 混同，非双红）
  - `92d7701` — PUT /api/attendances 预读行归属（created_by+project_id）→ Classify 单点裁决 → 授权跨人 + audit（fail-closed 同事务），归属条件移出 SQL → 6/6 绿
  - 破坏自证：Classify 授权分支当 Denied → 仅 Red1 红（Expected OK / Actual Forbidden）→ 还原 → 6/6 绿 → porcelain 空
  - 无锁列（attendances 无 paid_amount/payment_locked）故无 409 档；行不存在与未授权均 403（现状语义，Pin4 钉住）。
- **批次 3a（R9-12，B13 PUT /api/invoices + B37 PUT /api/invoices/{id}/status）**：
  - `737ce53` — 10 条测试（B13 6 条：Red1 授权跨人 200+audit、Pin1 无授权 403 无 audit、Pin2 本人 200 无 audit、Pin3 admin 200、Pin4 不存在 403、Pin5 项目创建者改他人行 403；B37 4 条：Red2 授权跨人改状态 200+audit、Pin6 无授权 403、Pin7 本人 200 无 audit、Pin8 不存在 403）；先红**恰好 Red1+Red2 双红 + 8 绿**（两端点无 409/403 混同）
  - `036c651` — 两端点预读行归属（created_by+project_id）→ Classify 单点裁决 → 授权跨人 + audit（fail-closed 同事务），归属条件移出 SQL；B13 知识库种子 fire-and-forget 保留在 Commit 之后（原条件原样）→ 10/10 绿
  - 破坏自证 A：B13 授权分支当 Denied → 仅 Red1 红；B：B37 授权分支当 Denied → 仅 Red2 红 → 还原 → 10/10 绿 → porcelain 空
  - 无锁列（invoices 无 paid_amount/payment_locked）故无 409 档；不存在仍 403（维持现状，未改 WriteResult 的 404）；发票金额单位是「元」直传直存（无 ToFen）。
- **批次 3b（R9-13，B15 PUT /api/payment-records）**：
  - `16e59f5` — 6 条测试（Red1 授权跨人 200+audit、Pin1 无授权 403 无 audit、Pin2 本人 200 无 audit、Pin3 admin 200、**Pin4 不存在 404**（WriteResult 语义，非 403）、Pin5 项目创建者改他人行 403）；先红**恰好 Red1 一红 + 5 绿**（Pin1/2/3/5 现状已是 403/200；Pin4 现状已是 WriteResult 404）
  - `954f194` — PUT /api/payment-records 预读行归属（created_by+project_id）→ Classify 单点裁决 → 授权跨人 + audit（fail-closed 同事务），归属条件移出 SQL；行不存在 → 404 / Denied → 403（**WriteResult 可观察语义保留**，竞态兜底仍走 WriteResult）→ 6/6 绿
  - 破坏自证：Classify 授权分支当 Denied → 仅 Red1 红 → 还原 → 6/6 绿 → porcelain 空
  - 无锁列（payment_records 无 paid_amount/payment_locked）故无 409 档；金额单位「元」直传直存（无 ToFen）。
- **批次 3c（R9-14，B1 PUT /api/contracts/agreement）**：
  - `7c03456` — 6 条测试，**自定义角色 r9-14-agr（id==name，permissions 含 contracts:update；accountant 默认集无 contracts:update，R9-6 先例走 HasPermission id 直通；仅 INSERT 新 roles 行，未动四个内置角色）**（Red1 授权跨人 200+audit、Pin1 无授权 403 无 audit、Pin2 本人 200 无 audit、Pin3 admin 200、**Pin4 不存在 404**（WriteResult 语义，非 403）、Pin5 项目创建者改他人行 403）；先红**恰好 Red1 一红 + 5 绿**
  - `f67f72b` — PUT /api/contracts/agreement 预读行归属（created_by+project_id）→ Classify 单点裁决 → 授权跨人 + audit（fail-closed 同事务），归属条件移出 SQL；行不存在 → 404 / Denied → 403（**WriteResult 可观察语义保留**，竞态兜底仍走 WriteResult）→ 6/6 绿
  - 破坏自证：Classify 授权分支当 Denied → 仅 Red1 红 → 还原 → 6/6 绿 → porcelain 空
  - 无锁列（agreement_contracts 无 paid_amount/payment_locked）故无 409 档；金额单位「元」直传直存（无 ToFen）。
- **批次 3d（R9-15，B7 PUT /api/settlements）**：
  - `9fd0351` — 7 条测试（比 B1 多一条软删 Pin6），**自定义角色 r9-15-set（id==name，permissions 含 settlement:update；accountant 默认集只有 settlement:read/approve 无 update，走 HasPermission id 直通；仅 INSERT 新 roles 行，未动内置角色）**（Red1 授权跨人 200+audit、Pin1 无授权 403 无 audit、Pin2 本人 200 无 audit、Pin3 admin 200、**Pin4 不存在 404**、Pin5 项目创建者改他人行 403、**Pin6 软删行（deleted_at 非空、id 仍在）→ 403 不是 404** + 库值不变 + 无 audit）；先红**恰好 Red1 一红 + 6 绿**（Pin6 现状已是 WriteResult 403）
  - `dd7aa65` — PUT /api/settlements 预读行归属与软删态（created_by+project_id+deleted_at，**预读不加 deleted_at IS NULL——软删误判 404 的坑规避**）→ 软删 → 403 / 行不存在 → 404 / Classify Denied → 403 → 授权跨人 + audit（fail-closed 同事务），归属条件移出 SQL（WHERE 只留 id + deleted_at IS NULL 兜底）；知识库种子 fire-and-forget 保留在 Commit 后（原条件原样）→ 7/7 绿
  - 破坏自证：仅 B7 授权分支当 Denied（同文件 B1 唯一定位）→ 仅 Red1 红（Pin6 仍 403）→ 还原 → 7/7 绿 → porcelain 空
  - 无锁列（settlements 无 paid_amount/payment_locked）故无 409 档；金额单位「元」直传直存（无 ToFen）。
- **①「项目创建者 ≠ 行编辑权」设计澄清**：G75/G76 项目门放行创建，但 `RowWriteGate.Classify` 无「项目创建者」分支——改他人创建的行只认 `project_authorizations`（B41/B48/B50 一致；Pin4 实证：项目创建者改他人行 → Denied → skipped）。
- **② 留痕**：任务书 Z3 初版 Pin4/Pin5 用「无授权」构造 batch-save 行级场景，被既有 G76 预扫整单 403 遮蔽（到不了行级）——审查方第 6 次规格认账，执行方纪律 17 停手纠正；修正为 Pin4=项目创建者改他人行（Denied 唯一可达路径）、Pin5=授权+本人行。
- **旧版 PUT /api/wages 尾部 409/403 混同修正（新发现）**：旧版 affected=0 时 rowExists 分支把「无归属权限」误报为 409（已发款/已归档），注释声称的「无归属权限（403）」区分并不存在（注释撒谎同族）；修复后语义：不存在→403 / 锁定→409 / 未授权→403 / 授权跨人→200+audit / 本人或 admin→200；**Pin1 为行为翻转测试（409→403）**，先红阶段 Red1+Pin1 双红为正确形态。留痕：任务书误信注释预期「当前 403」，实测 409——审查方第 5 次规格认账，执行方纪律 17 停手纠正。
