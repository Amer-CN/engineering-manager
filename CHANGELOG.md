# CHANGELOG

> **版本策略**: 本项目采用语义化版本 (SemVer). 规则:
> - `feat` (新功能): minor bump (0.X.0)
> - `fix` (bug 修复): patch bump (0.X.Y)
> - `refactor` (代码重构): **不 bump version**
> - `docs` / `chore` (文档/杂务): **不 bump version**
>
> **重要**: v0.74.0 → v0.75.3 期间曾过度打 tag (refactor-only sprint 也 bump). 已在 v0.75.3 重新整理 git 历史 (drop 7 个 spurious chore "bump version" commits), 重组成正确的 semver 历史. 详见 `docs/handoff/v0.75.3-handoff.md`.

---

## v0.77.0 (2026-06-21) — feat: cloud sync schema 准备 (阶段 1)

> **核心范围**: cloud sync 调研 (累计待办 #4) 的 v0.77.0 阶段 1 实施 — 只做 schema 准备, 不实现 sync 推/拉/冲突逻辑.
> **完整方案**: `docs/design/cloud-sync-design.md` (245 行, 4 方案对比 + 推荐 E=B+D 混合, 3 阶段路线).
> **SemVer**: minor bump (0.76.0 → 0.77.0), 因为加 5 列 + 2 新表 = 新功能, 但不破坏现有 API (DEFAULT 值保证兼容).

### 改动 (1 feat + 2 migration, 共 3 项)

- **`feat(cloud sync schema)`**: 27 业务表加 5 列 + 2 新基础设施表
  - migration 024_AddCloudSyncColumns.sql (233 行):
    - 27 业务表 (按 user-dim P0-4 闭环清单): projects / project_members / project_workers / income_contracts / expense_contracts / agreement_contracts / wages / attendances / members / workers / partners / supervisors / inventory_items / inventory_transactions / materials / expenses / drawings / invoices / payment_records / cost_ledger / settlements / cost_ledger_batches / worker_teams / departments / contract_templates / salary_history / wage_history
    - 每表加 5 列: `version` (INTEGER NOT NULL DEFAULT 1, 乐观锁 CAS) / `last_modified_by_device` (TEXT, 多设备追踪) / `last_modified_at` (TEXT, sync 面时间戳) / `sync_status` (TEXT NOT NULL DEFAULT 'synced', 程序层约束 'synced'/'pending'/'conflict') / `conflict_marker` (TEXT, 阶段 2 冲突检测用)
    - 每表加 idx_<table>_version 索引 (高频 CAS 查询)
  - migration 025_AddSyncQueueAndDevices.sql (58 行):
    - `sync_queue` 表 (本地待同步写操作队列): id / table_name / row_id / operation / payload (JSON) / device_id / user_id / version / enqueued_at / attempt_count / last_error / last_attempt_at + 3 索引
    - `device_registrations` 表 (多设备注册): device_id (主键) / user_id / device_name / device_type / os_info / app_version / registered_at / last_seen_at / refresh_token_hash / refresh_token_expires_at / is_active + 2 索引
  - 60 个新 unit tests (CloudSyncSchemaTests.cs):
    - 4 Facts (sync_queue / device_registrations 表 + 索引存在性)
    - 27 × 2 = 54 Theory (每张业务表都有 5 列 + version 索引)
    - 2 Facts (INSERT 默认 version=1 sync_status='synced' / sync_queue 可写可查)

### 测试结果

- 后端 build: 0 错误
- 后端 tests: 100/100 通过 (40 旧 + 60 新 CloudSyncSchemaTests)
- 前端 check: BUILD PASSED (66 历史软警告)
- tsc: 0 errors
- vite build: built in 18.67s

### 设计决策

- **不做的事** (留到 v0.78.0 阶段 2):
  - 33 业务端点的 INSERT/UPDATE 加 version 自增 (设计文档列在阶段 1 但本 sprint 范围收窄, 留到阶段 2 改 endpoint 时一起做)
  - JWT refresh token (阶段 2 设备注册后才有意义)
  - sync worker 推/拉 (阶段 2)
  - 冲突检测 UI (阶段 2)
- **DEFAULT 值策略**: version=1, sync_status='synced', last_modified_at=NULL 让现有代码完全无感 — INSERT 不写这些列也能 work, 老数据迁移零成本
- **程序层约束**: sync_status 不加 SQLite CHECK 约束 (避免老版本 SQLite ALTER ADD COLUMN 失败), 由 C# CloudSyncHelper 强制取值 (阶段 2)
- **索引策略**: 只加 version 单列索引 (CAS 高频), 暂不加 sync_status / last_modified_at 索引 (阶段 2 有 sync worker 后再加)

### 升级路径 (v0.76.0 → v0.77.0)

1. 重启 C# 服务, 自动跑 migration 024 + 025
2. 27 张业务表加 5 列 (DEFAULT 1 / NULL, 不破坏现有数据)
3. 新表 `sync_queue` + `device_registrations` 建好, 暂时为空 (阶段 2 才写)
4. 前端无需改动 (GET 端点自动返新列, 但前端暂未展示 version / sync_status)

### 已知风险 + 缓解

| 风险 | 严重度 | 缓解 |
|---|---|---|
| 27 表 × 5 列 ALTER TABLE 在大库上慢 | 🟢 低 | ALTER TABLE 不锁表, SQLite 单文件 ALTER ADD COLUMN 微秒级 |
| DEFAULT 1 让所有现有行 version=1 | 🟢 低 | 这是预期行为, 阶段 2 sync 不会误判冲突 (本地 vs 云端都是 1) |
| sync_status='synced' 默认 | 🟢 低 | 阶段 2 sync worker 才会把 pending 行推完后改回 synced |

### v0.78.0 阶段 2 入口

- 33 业务端点 INSERT/UPDATE 改用 CloudSyncHelper (version 自增 + last_modified_at 注入)
- CloudSyncHelper.WriteAsync(db, table, op, rowId, dto) 统一入口
- sync worker: 定时 SELECT sync_queue WHERE attempt_count < 3 → POST 云端 → DELETE 成功行
- 设备注册 API: POST /api/devices/register → 生成 device_id (32 hex) + refresh_token
- 冲突检测: 拉云端时 version 比本地旧 → 弹窗让用户选 (本地 / 云端 / 字段合并)

### 阶段 1 收尾 (commit b662814): 33 业务端点 INSERT/UPDATE 加 version 自增

- **`feat(endpoint version 自增)`** b662814: 12 端点文件 × 80 SQL 修改
  - UPDATE 端点 (40 处): SET 末尾 WHERE 前加 `, version=version+1, last_modified_at=@Now`
  - INSERT 端点 (40 处): columns 末尾加 `last_modified_at`, VALUES 末尾加 `@Now`
  - 现有客户端调用零改动 (version DEFAULT 1, sync_status DEFAULT 'synced')
  - 端点文件: AuthEndpoints / ContractEndpoints / CostLedgerEndpoints / ExpenseEndpoints / FileEndpoints / InventoryEndpoints / InvoiceEndpoints / MemberEndpoints / PartnerEndpoints / ProjectEndpoints / ProjectWorkerMiscEndpoints / WageEndpoints
- **`test(endpoint e2e)`** 3 个新 unit tests (CloudSyncEndpointTests.cs):
  - Projects_InsertAndUpdate_IncrementsVersionAndSetsLastModifiedAt (POST → GET v=1 → PUT → GET v=2 → PUT → GET v=3)
  - Contracts_Update_IncrementsVersion (raw SQL v=1 → 2)
  - Members_Insert_SetsLastModifiedAtToCurrentTime (INSERT 时 last_modified_at 被注入)
- **测试**: 100/100 → 103/103 通过
- **不做** (留 v0.78.0 阶段 2):
  - UPDATE 加 CAS WHERE version=@OldVersion (客户端暂不传 oldVersion)
  - last_modified_by_device 注入 (阶段 2 设备注册后才有 device_id)
  - JWT refresh token (阶段 2 sync worker 推送时才有意义)



---

## v0.76.0 (2026-06-20) — 7 项累计待办集中 release: PII 防护强化 + react-query 接入 + PII 密钥轮换

> **核心原则**: 本次 release 是 v0.75.3 era 之后 7 个跨 sprint 累计待办的集中收尾, 每项单独 commit, 一起 bump 到 v0.76.0 (minor, 因为含 5 个 feat).

### 改动 (5 feat + 1 docs + 1 refactor, 共 7 commits)

- **`feat(PII 解密 ACL)`** 9c9248a: PII 字段级访问控制 (累计待办 #1)
  - `CurrentUser.CanReadPii`: 检查角色, admin/manager/accountant 可读 PII
  - `Common.MaskPiiField`: 统一脱敏入口 (idCard/phone/bankAccount 按字段类型)
  - 改 GET /api/members, /api/members/{id}, /api/workers 加 PII ACL
  - 3 个新 unit tests (29/29 总通过 → 32/32)

- **`feat(MaskContext 离线优先)`** bb3b1ab: useState 改 lazy 同步读 localStorage (累计待办 #2)
  - 避免首屏 mask 闪一下
  - useEffect 只剩 setIsHydrated(true)

- **`feat(react-query 完整接入)`** 4f9be29: 全局 QueryClient + useMutation 模板 (累计待办 #3)
  - App.tsx 包 QueryClientProvider (staleTime=30s, refetchOnWindowFocus=false, retry=1)
  - useMembers.ts 加 useCreateMember / useUpdateMember / useDeleteMember 模板
  - 现有 10 个 data hooks (useContracts/useCostLedger/useDepartments/useInvoices/usePartners/useProjects/useSettlements/useTemplates/useWorkers) 保持不变, 后续 sprint 渐进迁移

- **`docs(cloud sync design)`** fa62456: 多设备/多用户 cloud sync 调研 + 决策 (累计待办 #4)
  - `docs/design/cloud-sync-design.md` (245 行, 4 方案对比 + 决策 = 推迟到 v0.77.0+ 独立 sprint)
  - 范围太大需 major bump, 推后到 v0.77.0 阶段 1 (2-3 周准备) + 阶段 2 (4-6 周实施) + 阶段 3 (4 周离线增强 + 移动端)
  - 推荐方案 E (B 中央数据库 + D 增量同步) 混合

- **`feat(PII 列级 key rotation)`** ef79f0c: 多 key 加密 + admin 轮换 API (累计待办 #5)
  - migration 023: `pii_keys` 表 (key_id, encrypted_key, is_active, created_at, retired_at, created_by)
  - PiiProtector 升级: 多 key 内存缓存 + 密文加 1 字节 version 头 (key_id)
  - 旧 v1.2.0 密文兼容: 无 version 字节 → fallback 到 key_id=1 (legacy, 从 %APPDATA%\pp.key 迁移)
  - PiiKeyEndpoints: GET /api/admin/pii/keys (列) + POST /api/admin/pii/rotate (admin-only, 写 audit)
  - UI: Settings 页新 `SettingsPiiKeySection` 卡片 (active key / 总数 / 上次轮换 / 立即轮换)
  - 11 个 PiiProtectorTests (40/40 总通过)

- **`feat(版本号 build-time 注入)`** c30edd4: index.html 改用 vite 插件读 package.json (累计待办 #6)
  - vite.config.ts 加 `injectVersionPlugin` (transformIndexHtml hook)
  - 源文件 `<APP_VERSION>` 占位符, dist 输出实际版本
  - 未来 bump package.json → 自动同步, 无需手改 index.html

- **`refactor(Settings 拆分)`** 9efebbe: Settings.tsx 280 → 90 行 (累计待办 #7)
  - 新增 4 个子组件: DataPathSection / DevToolsSection / AppearanceSection / AboutSection (在 features/settings/)
  - Settings.tsx 只剩组合 + loading 状态
  - refactor 不 bump (本应在 v0.75.3 era, 一起并到 v0.76.0)

### mimo scoreboard (本 release 累计 n=0)
- 0 个 mimo 任务 (本期 7 项都是手写, 因为涉及 schema 决策 / 跨文件协调 / 端点设计, mimo 1-file-patch 不适合)
- 上次 n=33 (v0.75.3 part 4 闭环) 仍然有效

### 升级路径 (v0.75.3 → v0.76.0)
1. `git pull`
2. 重启 C# 服务 (自动跑 migration 023 加 pii_keys 表)
3. 首次启动: PiiProtector 自动从 %APPDATA%\工程管家\pp.key 导入到 pii_keys (key_id=1, is_active=1)
4. 现有 PII 密文继续可读 (旧格式无 version, 自动 fallback 到 key_id=1)
5. (可选) admin 在 Settings → PII 加密密钥 立即轮换


---

## v0.75.3 (2026-06-20) — fix: TemplateCard Tooltip + 18 个 refactor (refactor 不 bump, 与 v0.75.3 同版本)

### 改动

- **`fix(TemplateCard Tooltip)`** ac643ef: TemplateCard 加 Tooltip + TemplatePreview 测试改 getByRole
  - 模板卡片悬停 Tooltip 显示完整内容 (之前被截断)
  - TemplatePreview 测试改用 getByRole 提升可访问性

- **`refactor(后续 14 个 file splits)`** 在 v0.75.2 → v0.75.3 期间完成, 全是内部结构调整, 无行为变化:
  - v0.80.0 阶段: PartnerForm (→ PartnerFormFields) + StaffAttendance
  - v0.81.0: Drawings + ContractPage
  - v0.82.0: WageManagement bank receipt hook + Members WorkerSection + Dashboard
  - v0.83.0: Partners CRUD hook + Users columns + ProjectDetailTabs MembersTab
  - v0.84.0: SettingsSqliteSection 4 文件拆 + ContractTemplates print utility
  - v0.85.0: ContractDashboard formatCurrency + AuditLogViewer constants + Projects HeroBanner + Settings GpuToggle

### mimo scoreboard (累计 n=21)
- 一次过 20/21 (95.2%), 含 8 次小自修复
- 平均耗时 159s

---

## v0.75.2 (2026-06-19) — fix: clear 84 tsc errors + add tsc to red-light-green-light

### 改动
- **`fix(tsc 84 errors)`** 35d1431: 清空 84 个 tsc 错误 (unused imports + unused vars)
  - 红绿灯新增第 5 项: `npx tsc --noEmit --pretty false` (v0.79.0 起, 防 unused import / 类型错乱回归)
- **`docs(AGENTS.md red-light adds tsc)`** 3b359db: AGENTS.md 红绿灯文档同步

---

## v0.75.1 (2026-06-19) — fix: DataTable 3 critical runtime bug + Tooltip native title fallback

### 改动
- **`fix(DataTable critical)`** 2b47756: 修 DataTable 3 个 critical runtime bug
  - useDataTableState 漏 import
  - getRowKey 类型不匹配
  - Tooltip native title fallback

---

## v0.75.0 (2026-06-19) — feat: useUserIdSync 接入 App.tsx

### 改动
- **`feat(useUserIdSync)`** 8cccaa8: useUserIdSync hook 接入 App.tsx
  - 用于同步当前用户 ID 到全局 context

### 前置 refactors (在 v0.75.0 之前完成, 不影响版本号)
- **`refactor(DataTable 453→358)`** fbbcaa2: 拆 DataTable.tsx 453 → 358 行 (-21%)
- **`refactor(DataTable 358→209)`** 7f9da39: DataTable.tsx 进一步拆分 358 → 209 行 (-42%)
- **`docs(同步知识库)`** 9428874, a8af087, b23b9f2, d6ef9c7: AGENTS.md / CLAUDE.md / CHANGELOG / docs/ 同步

---

## v0.74.0 (2026-06-19, 之前) — pre-semver-rebase base

`v0.74.0 WIP` (ce8cf23) 是本次重构系列之前的"基线状态". 历史中 v0.69.0 之前的 commit 因 `git reset --hard v0.69.0` 已丢失, 详见 v0.69.0 之前的审计报告 (P0-FIX-PLAN.md).