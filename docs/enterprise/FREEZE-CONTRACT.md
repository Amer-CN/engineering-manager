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
