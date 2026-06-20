# CHANGELOG

> **版本策略**: 本项目采用语义化版本 (SemVer). 规则:
> - `feat` (新功能): minor bump (0.X.0)
> - `fix` (bug 修复): patch bump (0.X.Y)
> - `refactor` (代码重构): **不 bump version**
> - `docs` / `chore` (文档/杂务): **不 bump version**
>
> **重要**: v0.74.0 → v0.75.3 期间曾过度打 tag (refactor-only sprint 也 bump). 已在 v0.75.3 重新整理 git 历史 (drop 7 个 spurious chore "bump version" commits), 重组成正确的 semver 历史. 详见 `docs/handoff/v0.75.3-handoff.md`.

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