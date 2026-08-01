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
| 1 | Backend Build & Test | check-backend-rules 28 项（22 B1 token 口径误报 + 7 B3 catch 无日志，扣 1 已修） | run 30656905289 | 28 项 | TD-BACKEND-28 |
| 2 | E2E Critical Paths | API 60s 启动超时（CI runner 环境） | run 30656905289 | 1 job | TD-E2E-TIMEOUT |
| 3 | Unit Tests (22) | ConversationHistory.test.tsx 6 个稳定失败（waitFor 找不到「今天的对话」） | run 30656905289 | 6 tests | TD-VITEST-CONVHIST |

注：Unit Tests (20) 在 d80020d 为 cancelled（被 22 的失败触发取消），非独立红因。
