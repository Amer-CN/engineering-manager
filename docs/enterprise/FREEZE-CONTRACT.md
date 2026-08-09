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
- D 桶（无归属校验写语句）10 条为 R9 修复候选集，G73 已处理其中 D1 的 UPDATE 分支

### G75 新登记（只登记不修）

- 创建路径无项目归属校验（INSERT 分支）：
  - `batch-import` INSERT 分支（`WageEndpoints.cs`）
  - `generate` / `generate-v2`（考勤生成，INSERT 侧）
  - `batch-create`（考勤批量创建）
- 根治方向：**方案丙项目级写入门坎**（未授权项目一律拒绝，与 confirm-matches 方案丙对齐）
- 排期：**R9-2 与 D2 同轮评估**

### D6 备注（审查方 R9-1 读码发现）

- `DELETE /api/regions/{id}`（`RegionEndpoints.cs:31`）已记 D6（WHERE 仅 `id=@Id`、无权限码）
- 补充：`POST /api/regions`（`RegionEndpoints.cs:20`）**同样无权限码**（仅强制登录）——与 D6 同属「区域配置写无权限门」面，评估时一并处理
