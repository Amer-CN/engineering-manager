# CHANGELOG

> **版本策略**: 本项目采用语义化版本 (SemVer). 规则:
> - `feat` (新功能): minor bump (0.X.0)
> - `fix` (bug 修复): patch bump (0.X.Y)
> - `refactor` (代码重构): **不 bump version**
> - `docs` / `chore` (文档/杂务): **不 bump version**
>
> **重要**: v0.74.0 → v0.75.3 期间曾过度打 tag (refactor-only sprint 也 bump). 已在 v0.75.3 重新整理 git 历史 (drop 7 个 spurious chore "bump version" commits), 重组成正确的 semver 历史. 详见 `docs/handoff/v0.75.3-handoff.md`.

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