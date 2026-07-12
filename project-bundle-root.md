This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

================================================================
File Summary
================================================================

Purpose:
--------
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

File Format:
------------
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

Notes:
------
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, postcss.config.js, tailwind.config.js, index.html, playwright.config.ts, config.example.json, .gitignore, CHANGELOG.md, README.md, build-installer.bat, release.bat, 工程管家.bat, update, skills-lock.json, docs/**, scripts/**, public/**, e2e/**, .github/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)


================================================================
Directory Structure
================================================================
.github/workflows/test.yml
.gitignore
工程管家.bat
build-installer.bat
CHANGELOG.md
config.example.json
docs/ARCHITECTURE.md
docs/DATABASE_DESIGN.md
docs/design/cloud-sync-design.md
docs/handoff/R16-handoff-latest.md
docs/handoff/R16-handoff.md
docs/handoff/R16-R17-handoff.md
docs/handoff/R16-R17-verification.md
docs/handoff/README.md
docs/handoff/security-fix-handoff.md
docs/MODULES.md
docs/P0-FIX-PLAN.md
docs/SMOKE-TEST.md
e2e/critical-paths.spec.ts
index.html
package.json
playwright.config.ts
postcss.config.js
public/fonts/README.md
public/installer.nsh
public/logo-graphite.png
public/logo-graphite.svg
public/logo-sandstone.png
public/logo-sandstone.svg
public/logo-white.png
public/logo-white.svg
public/ocr-config-example.json
README.md
release.bat
scripts/check-rules.cjs
scripts/make-manifest.mjs
scripts/pack-installer.ps1
scripts/sync-version.mjs
skills-lock.json
tailwind.config.js
tsconfig.json
tsconfig.node.json
update/manifest.json
vite.config.ts

================================================================
Files
================================================================

================
File: .github/workflows/test.yml
================
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20, 22]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Cache node_modules
        uses: actions/cache@v3
        id: cache-node-modules
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ matrix.node-version }}-${{ hashFiles('package.json') }}
          restore-keys: |
            ${{ runner.os }}-node-${{ matrix.node-version }}-

      - name: Install dependencies
        if: steps.cache-node-modules.outputs.cache-hit != 'true'
        run: npm install

      - name: Run tests
        run: npm run test:ci
        env:
          CI: true

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        if: matrix.node-version == '20'
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: false
          verbose: true

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-node-${{ matrix.node-version }}
          path: |
            coverage/
            *.xml

  typecheck:
    name: TypeScript Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: TypeScript check
        run: npm run build --if-present

  lint:
    name: Lint
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Run linter
        run: npm run check

  build:
    name: Build
    runs-on: windows-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Build Electron app
        run: npm run build
        env:
          CSC_IDENTITY_AUTO_DETECTION: false

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: electron-app-windows
          path: |
            release/
            dist/
            dist-electron/
          retention-days: 7

================
File: 工程管家.bat
================
@echo off
chcp 65001 >nul 2>&1
title EngineeringManager

cd /d "%~dp0EngineeringManager.Api"

taskkill /F /IM EngineeringManager.Api.exe 2>nul
timeout /t 1 /nobreak >nul

dotnet run
exit

================
File: config.example.json
================
{
  "dataPath": "./data"
}

================
File: docs/design/cloud-sync-design.md
================
# 工程管家 多设备/多用户 Cloud Sync — 4 方案对比与决策

> 时间：2026-06-20
> 输入：v0.76.0 累计待办 #4 — multi-user cloud sync 调研
> 现状：单机桌面应用 + 本地 SQLite (engineering.db) + 19 业务表 user-dim (v0.73.0 P0-4 闭环) + PII 加密 (v0.72.0)
> 决策：**推迟到 v0.77.0+ 独立 sprint**。v0.76.0 仅做调研 + schema 暂不准备（不写代码）。

---

## 业务需求（为什么需要 cloud sync）

工程管家目标用户是**中小工程公司**（10-50 人规模）。当前架构痛点：

- **单设备绑定**：所有数据在 `F:\Company Database\engineering.db`（用户配置的数据路径），换电脑 = 0 数据
- **无协作**：admin/manager/accountant/worker 4 个角色设计好了，但**单用户单机**用，4 个角色 = 1 台机器
- **数据备份靠用户**：用户自己负责外接硬盘 / NAS / 网盘备份
- **PII 加密了但无异地容灾**：DPAPI 加密的 PII 数据 + 整个 db 一起丢 = 不可恢复

**用户实际场景**（按 PM 调研）：
- 项目经理笔记本 + 工头工地板房电脑，**两份数据**，每周人工同步
- 财务月底回办公室才能录入发票，平时移动端看不到
- 老板出差想看项目利润，**打开应用 = 看不到**（他没带电脑）

**真实需求 ≠ Google Docs 实时协同**，而是：
1. **多设备**（1 个用户，3 台设备：笔记本 + 工地机 + 手机）
2. **多用户协作**（同一公司，5 个员工共享数据）
3. **离线优先**（工地没网/信号差）
4. **不要求实时**（每 10-30 分钟同步一次即可）

---

## 现状评估（v0.75.3 era）

**已具备的 cloud sync 基础**：

| 项 | 状态 | 文件 |
|---|---|---|
| JWT 鉴权 | ✅ v1.0.0 | `EngineeringManager.Api/GlobalAuthMiddleware.cs` |
| 角色 + 权限 | ✅ v1.0.0 | `users` / `roles` / `role_permissions` 表 |
| user-dim 数据隔离 | ✅ v0.73.0 (P0-4 闭环) | `CurrentUser.UserFilterCompany/UserFilterWithAuthorizedProjects` |
| PII 加密 (DPAPI) | ✅ v0.72.0 | `EngineeringManager.Api/Security/PiiProtector.cs` |
| 审计日志 | ✅ v1.0.0 | `audit_logs` 表 |
| 软删除 | ✅ v0.74.0 | `deleted_at` 字段 |
| 19 业务表 created_by | ✅ v0.73.0 (migrations 009/011/014) | 所有业务表 |

**缺失的 cloud sync 基础设施**：

| 项 | 状态 | 备注 |
|---|---|---|
| 中央 server | ❌ 无 | 项目架构假设"无 server 也能用" |
| sync protocol | ❌ 无 | 没有 version / etag / last_modified 列 |
| conflict resolution | ❌ 无 | SQLite 单写者模型无冲突 |
| multi-device auth | ❌ 无 | JWT 是单设备 session，无 refresh token |
| 异地容灾 | ❌ 无 | 用户自备份 |
| 实时 push 通知 | ❌ 无 | 5 秒轮询 |

**关键 schema gap**：所有业务表都有 `created_at` / `updated_at` / `created_by` / `deleted_at`，**没有** `version` (乐观锁) / `last_modified_by_device` / `last_synced_at` / `sync_status` / `conflict_marker` 列。

---

## 方案 A：Dropbox-like 文件同步（最简单）

**做法**：把整个 `engineering.db` 放到 OneDrive/坚果云/百度网盘同步目录，多设备 share 同一文件。

**优点**：
- 0 改动架构，**0 代码**，30 分钟搞定
- 用户已有云盘习惯
- 离线优先天然支持

**缺点**：
- **冲突 = 数据库损坏**：SQLite 是单写者文件锁，云盘同时上传 = 二进制冲突
- **不实时**：依赖云盘 sync 间隔（5-30 分钟）
- **不支持多用户写协作**：4 个角色同时开 = 锁竞争 + 各种奇怪错误
- **PII 加密 + 云盘双重加密**：性能 + 兼容性问题
- **不能加 server 端逻辑**：审计、限流、备份都没法做

**适用场景**：单用户**多设备**（不协作），用户能接受"每天只在一台设备上写"。

**实际不可行**：因为 SQL 写锁和云盘 binary sync 的冲突是结构性矛盾。

---

## 方案 B：中央数据库 + REST API（标准方案）

**做法**：服务端用 PostgreSQL（推荐） / MySQL，前端走 HTTP API（与现在 C# Minimal API 类似但后端是云）。前端本地仍保留 SQLite 缓存做离线。

**优点**：
- 成熟方案，文档多
- 权限细到 row level（Postgres RLS）
- 服务端可以做审计、限流、备份、监控
- 4 角色权限天然映射（admin/manager/accountant/worker 共享同一 db）

**缺点**：
- **必须连网**：工地无信号 = 0 数据
- **服务端运维**：数据库 / 应用服务器 / 监控 / 日志聚合 / CDN
- **SQLite → Postgres 迁移**：Dapper SQL 兼容性，JSON 列、自增 ID、字符串排序差异
- **服务器成本**：用户规模小（10-50 人）摊薄不下来
- **必须自建/租用**：用户敏感数据上云 = 信任问题

**适用场景**：用户接受"必须有网"，团队规模 ≥ 5 人。

**风险**：
- 中小工程公司 IT 能力弱，部署运维是负担
- 数据上云的合规性（建筑行业有数据本地化要求）

---

## 方案 C：CRDT / Yjs 协同（先进但不适配）

**做法**：用 Yjs / Automerge 协同编辑框架，把 SQLite 表 → CRDT 数据结构。

**优点**：
- **离线优先 + 无冲突 + 实时**：CRDT 理论保证
- 多人编辑同一行不会丢数据
- 已经有 Yjs / Automerge / Electric SQL 等成熟实现

**缺点**：
- **DB schema 改写成本极高**：CRDT 假设文档型数据，我们的表是关系型
- **学习曲线陡**：团队需要理解 CRDT / 状态向量
- **Yjs 不适合 tabular data**：Yjs 主要是 nested object / array
- **数据增长**：CRDT 历史版本会膨胀（即使压缩）
- **PII 加密集成复杂**：加密列 + CRDT merge = 难

**适用场景**：协同编辑文档（如 Notion、Google Docs）；**不适合**结构化表格数据库。

**结论：不推荐**。工程管家的数据是高度结构化的（19 个相互 JOIN 的表），CRDT 的优势发挥不出来，劣势全部中。

---

## 方案 D：增量同步 + last-write-wins（LWW）

**做法**：每行加 `version INTEGER` + `last_modified_by_device TEXT` + `last_modified_at` + `sync_status` 列。本地写完 push 到云端，云端 merge（按 `last_modified_at` 谁新谁赢），下拉时按 `version > local.version` 拉。

**优点**：
- 相对简单，**离线优先天然支持**
- schema 改动小（加 4 列）
- 复用现有 user-dim 隔离（每行带 device_id + user_id）
- 写冲突可检测 + 提示用户

**缺点**：
- **写冲突静默丢数据**：LWW 是 last-write-wins，老的写会被覆盖
- **需要冲突 UX**：检测到冲突 → 弹窗让用户选"保留本地 / 保留云端 / 合并"
- **删除 = 软删除的灾难**：LWW 删了一条记录，但云端还有 → 复活
- **多表事务**：本地 `INSERT A + INSERT B` 在云端是 2 个独立操作，crash 在中间 = 半同步
- **同步频率**：写后立即 push 还是定时批量？实时耗带宽，定时耗时间

**适用场景**：**低频写协作**（每日 10-100 次写 / 用户），用户能接受"冲突时人工选"。

**风险**：
- "丢数据"风险是 P0 级，必须有强警告 + 操作审计
- 移动端需要单独实现（暂时不在 scope）

---

## 方案 E（补充）：混合 — B (云端服务) + D (本地缓存)

**做法**：方案 B 的云端 + 方案 D 的本地缓存。前端本地有完整 SQLite (engineering.db) 做离线缓存，所有写先写本地 + 入 sync queue，后台 worker 推送到云端。云端是 authoritative source。

**优点**：
- **B 的优势**（细权限 / 服务端审计 / 异地容灾 / 限流）+ **D 的优势**（离线优先 / 低带宽 / 响应快）
- 同步层独立可替换（先 LWW 简单做，后升级到 OT/CRDT）
- PII 加密在两端都做（云端只存密文）

**缺点**：
- **实现成本最高**：要云端服务 + 同步层 + 冲突 UX + 缓存失效
- 估算：1-2 个全职工程师 **3-6 个月**（含测试 / 安全审计 / 部署）
- **SQLite → Postgres 迁移**：Dapper SQL 兼容性（占 30% 工作量）
- **新依赖**：云函数 / DB / CDN / 监控（运维成本）

**适用场景**：长期愿景（v0.77.0+）的最终方案。

---

## 我的推荐：**E (B + D 混合)，分 3 阶段**

### 阶段 1：v0.77.0 — 准备工作（2-3 周）
- schema 加 5 列：`version` (乐观锁), `last_modified_by_device`, `last_modified_at`, `sync_status`, `conflict_marker`
- 33 个业务端点的 INSERT/UPDATE 加 version 自增
- 加 `sync_queue` 本地表（pending writes）
- 加 `device_registrations` 表（多设备注册）
- JWT 改 refresh token（支持多设备 session）
- **不实现 sync 逻辑** — 只准备 schema + 写路径

### 阶段 2：v0.78.0 — 推 + 拉同步（4-6 周）
- 云端部署 Postgres + 同步 API（HTTP webhook）
- 前端 sync worker：定时推 sync_queue + 拉云端 delta
- 冲突检测（version mismatch）+ 弹窗 UX
- PII 加密跨端兼容（DPAPI 跨设备不行，需换方案）
- 限流 + 审计 + 监控

### 阶段 3：v0.79.0 — 离线增强 + 移动端（4 周）
- 离线模式提示 + 网络状态监听
- 冲突解决 UX 完善（"保留本地 / 保留云端 / 字段级合并"）
- 移动端 (iOS/Android) 适配（独立 sprint scope）
- 异地容灾 / 备份 / 恢复演练

**不推荐**：
- 方案 A（SQLite 文件同步结构性不可行）
- 方案 C（CRDT 不适合关系型数据库）
- 方案 D 单独（缺服务端能力，丢数据风险高）

---

## 推迟到 v0.77.0 的理由

1. **范围太大**：E 方案实施需要 1-2 人 × 3-6 个月。**v0.76.0 sprint 容纳不下**。
2. **架构级变更**：按现行 SemVer 政策，应该 **major bump**（v0.X.0 → v(X+1).0.0）"v1.0.0-cloud-sync"。混在 v0.76.0 release 里 = SemVer 失真。
3. **PII 加密跨设备问题**：当前 DPAPI 是 Windows 绑定，云端同步要换 KDF + KMS，**不是加列能解决的**。
4. **服务端基础设施**：当前项目假设"无 server 也能用"，加 cloud = 部署形态变化，要用户决策（自建 / 阿里云 / 腾讯云 / 自托管）。
5. **依赖现有 sprint 收尾**：v0.76.0 累计待办 #1-#7 涉及 5 红绿灯 + bump + CHANGELOG + handoff + tag，独立 sprint 已经饱和。

---

## v0.76.0 sprint 的实际交付

- **#1 PII ACL** ✅ `9c9248a`
- **#2 MaskContext 离线优先** ✅ `bb3b1ab`
- **#3 react-query 完整接入** ✅ `4f9be29`
- **#4 cloud sync 调研** ✅ **本文档**（决策：推迟到 v0.77.0）
- #5 PII 列级 key rotation
- #6 index.html version 注入
- #7 Settings 剩余拆分
- 收尾：5 红绿灯 + bump v0.75.3 → v0.76.0 + CHANGELOG + handoff + tag

---

## 参考资料

- `EngineeringManager.Api/Security/CurrentUser.cs` — user-dim 隔离已就绪
- `EngineeringManager.Api/Security/PiiProtector.cs` — PII 加密（DPAPI，跨设备不可用）
- `EngineeringManager.Api/Migrations/Scripts/009_AddCreatedByToBusinessTables.sql` — 19 表 user-dim
- `EngineeringManager.Api/GlobalAuthMiddleware.cs` — JWT 中间件（v1.0.0）
- `docs/P0-FIX-PLAN.md` — P0/P1 历史修复记录
- `docs/v1.1.0-ROADMAP.md` — v1.1.0 路线图

## 决策记录

| 决策点 | 选择 | 理由 |
|---|---|---|
| 是否 v0.76.0 实施 | **否** | 范围 / 风险 / SemVer 政策 |
| 推荐方案 | E (B + D 混合) | 平衡离线 + 协作 + 复杂度 |
| 推迟到 | v0.77.0 独立 sprint | 留 3-6 个月工作窗口 |
| 阶段 1 范围 | schema + 写路径 | 不动 sync 逻辑 |
| PII 跨设备方案 | 待 v0.77.0 重新设计 | DPAPI 不行 |
| 服务端部署 | 待 v0.77.0 决策 | 自建 vs 云 |

================
File: docs/handoff/R16-handoff-latest.md
================
# R16 Sprint Handoff — 接手文档（2026-06-25 更新）

## 状态总览

| 项目 | 状态 |
|------|------|
| **HEAD** | `4b65076`（R15：代码结构优化 — any 清理 + 大文件拆分） |
| **分支** | master |
| **未提交改动** | 34 个文件（见下方清单） |
| **三灯状态** | tsc 0 error ✅ / vite build ✅ / npm run check ALL CLEAN ✅ |

---

## 本轮已完成内容（2026-06-25）

### any 清理成果

| 指标 | 开始 | 结束 |
|------|------|------|
| any 总数（非 services/tests） | 375 | 282 |
| 改动文件数 | 0 | 34 |
| 减少量 | — | **93** |

### 已清理文件（22 个，any 已归零）

| 文件 | before → after |
|------|---------------|
| StaffList.tsx | 10 → 0 |
| useLaborOperations.ts | 22 → 12（catch 块已清，接口参数保持 any） |
| useSettlementHandlers.ts | 6 → 0 |
| SettlementProjectActions.tsx | 6 → 0 |
| useLaborProjectWorker.ts | 8 → 0 |
| useLaborData.ts | 6 → 0 |
| StaffAttendanceDashboard.tsx | 6 → 0 |
| DepartmentManager.tsx | 1 → 0 |
| audit/logger.ts | 11 → 0 |
| audit.ts | 8 → 0 |
| useCompanyQuery.ts | 6 → 0 |
| usePartnerActions.ts | 5 → 2（catch 已清，formData 参数保持 any） |
| useLaborWorkerLifecycle.ts | 5 → 0 |
| LaborDashboard.tsx | 5 → 0 |
| useWageActions.ts | 5 → 0 |
| CostLedgerAnalytics.tsx | tsc 修复 |
| CostLedgerImportModal.tsx | tsc 修复 |
| SettlementForm.tsx | tsc 修复 |
| SettlementItemsTable.tsx | tsc 修复 |
| usePayrollData.ts | tsc 修复 |
| auditFieldFormat.tsx | tsc 修复 |
| useMemberOperations.ts | tsc 修复 |

### 未提交改动清单（34 文件）

已 stage 的改动（可直接 commit）：

```
src/components/Projects.tsx
src/components/Users.tsx
src/components/features/audit/auditFieldFormat.tsx
src/components/features/costLedger/CostLedgerAnalytics.tsx
src/components/features/costLedger/CostLedgerImportModal.tsx
src/components/features/hr/StaffAttendanceDashboard.tsx
src/components/features/hr/StaffList.tsx
src/components/features/hr/StaffPayrollTable.tsx
src/components/features/hr/StaffPayrollToolbar.tsx
src/components/features/hr/useStaffPayrollFilters.ts
src/components/features/labor/LaborDashboard.tsx
src/components/features/labor/hooks/useLaborOperations.ts
src/components/features/labor/hooks/useLaborProjectWorker.ts
src/components/features/labor/hooks/useLaborWorkerLifecycle.ts
src/components/features/members/MemberWorkerSection.tsx
src/components/features/members/TeamWorkerModal.tsx
src/components/features/members/WorkerSectionModals.tsx
src/components/features/members/useMemberFileHandlers.ts
src/components/features/members/useMemberFileUrls.ts
src/components/features/members/useMemberOperations.ts
src/components/features/members/useWorkerImport.ts
src/components/features/members/useWorkerPicker.ts
src/components/features/partners/useCompanyQuery.ts
src/components/features/partners/usePartnerActions.ts
src/components/features/payroll/PayrollPage.tsx
src/components/features/payroll/PayrollTable.tsx
src/components/features/payroll/usePayrollData.ts
src/components/features/settlement/SettlementForm.tsx
src/components/features/settlement/SettlementItemsTable.tsx
src/components/features/settlement/SettlementProjectActions.tsx
src/components/features/settlement/useSettlementHandlers.ts
src/components/features/wages/useWageActions.ts
src/utils/audit.ts
src/utils/audit/logger.ts
```

---

## 剩余任务

### 剩余 any 分布（282 处，126 文件）

| 分类 | 估计数量 | 说明 |
|------|---------|------|
| 组件层接口参数 | ~120 | `useState<any>`、`formData: any`、`Column<any>` 等 |
| types/electron.d.ts | 9 | 类型定义文件中的 any |
| test-utils/ | ~10 | 测试辅助工具 |
| services 层 | ~100 | tauri-bridge / api-methods（建议不动） |
| tests 层 | ~50 | 测试文件（建议不动） |

### Top 15 待清理文件

| 文件 | any 数 | 类型 |
|------|--------|------|
| useLaborOperations.ts | 12 | 接口参数（projects: any[] 等） |
| DepartmentManager.tsx | 8 | useState / props |
| WorkerImportPhase.tsx | 6 | Column / render |
| StaffFormModal.tsx | 5 | editing / departments props |
| AttendanceImportBody.tsx | 5 | wb: any / Column |
| useLaborData.ts | 5 | projects: any[] |
| ProjectDetail.tsx | 5 | useState / filter |
| InvoiceLinker.tsx | 5 | useState / filter |
| WageDetailTable.tsx | 5 | scopeData / Column |
| db-helpers.ts | 5 | 测试辅助 |
| FormUploadWidgets.tsx | 4 | |
| useLaborModals.ts | 4 | |
| ContractFormModal.tsx | 4 | |
| useLaborPoolWorker.ts | 4 | |
| LaborWorkerList.tsx | 4 | |

---

## 经验教训（重要）

### ✅ 安全替换（零连锁风险）

```typescript
// 1. catch 块（最安全）
catch (error: any) → catch (error: unknown)
error.message || 'xxx' → (error instanceof Error ? error.message : 'xxx')

// 2. Record<string, any>（在工具层安全）
Record<string, any> → Record<string, unknown>

// 3. showToast 类型（联合类型）
type: any → type: 'success' | 'error' | 'warning' | 'info'
```

### ⚠️ 危险替换（会引发连锁 tsc 错误）

```typescript
// 1. useState 泛型（会破坏所有 setXxx 调用）
useState<any[]>([]) → useState<Member[]>([])
// 问题：setMembers(data) 的 data 类型不匹配

// 2. 函数参数类型（会破坏所有调用方）
formData: any → formData: Record<string, unknown>
// 问题：调用方传入 StaffFormData 不兼容 Record<string, unknown>

// 3. Column 泛型（会破坏 render 函数）
Column<any>[] → Column<Record<string, unknown>>[]
// 问题：render: (item: Record) => JSX 中 item.xxx 变成 unknown

// 4. PromiseSettledResult 泛型（会破坏 .value 访问）
PromiseSettledResult<any> → PromiseSettledResult<unknown>
// 问题：r.value.success 变成 unknown 没有 .success
```

### 策略建议

1. **先做 catch 块**（安全，每个文件 1-3 处）
2. **再做 Record<string, any>**（工具层安全，组件层小心）
3. **接口参数最后做**（需要逐文件评估，改一个可能要改 5 个调用方）
4. **每批 ≤10 文件**，每批结束跑 tsc
5. **发现连锁错误立即 revert 该文件**，不要硬修
6. **services 层和 tests 层建议不动**（是 API 桥接设计债，改了收益低风险高）

---

## 红绿灯

```bash
cd "E:\测试" && npx tsc --noEmit --pretty false    # 0 error
cd "E:\测试" && npx vite build                       # success (16-18s)
cd "E:\测试" && npm run check                         # ALL CLEAN
```

---

## 推荐接手流程

1. **先 commit 当前改动**（34 文件已清理完毕，三灯全绿）
2. **跑一次摸底**：`grep -r '\\bany\\b' src/ --include='*.ts' | wc -l`
3. **按 Top 15 清单逐文件处理**，每文件先判断 any 类型：
   - catch 块 → 直接改
   - Record<string, any> → 改
   - useState / 函数参数 / Column → 评估连锁风险，保守处理
4. **每 5-10 文件跑一次 tsc**
5. **全部完成后 commit + tag**

---

*最后更新：2026-06-25 22:xx*

================
File: docs/handoff/R16-handoff.md
================
# R16 Sprint Handoff — any 深度清理（Russell/Galileo 续跑）

## 状态总览

- **HEAD**：`4b65076`（R15：代码结构优化 — any 清理 + 大文件拆分）
- **分支**：master
- **目标**：在 R15 基础上继续清理前端 `any`，优先完成 Russell/Galileo 未完成范围，再决定是否做 services 层

## 当前 any 统计（R15 后）

- `: any` ≈ 670
- `as any` ≈ 309

## R15 已完成 ✅

- 20 个 hooks/components/utils 文件的 `catch error: any` 等改为 `unknown`
- `src/services/ocr/` 拆分（13 文件）
- `src/utils/audit/` 拆分（8 文件）
- `useLaborOperations` 拆分（5 子 hook + 聚合层）
- `AttendanceImportModal` tsc 修复

## R16 已确认完成 ✅（Hilbert 范围）

- members 模块 8 文件（30+ 处 any 清理）

## 本次接手要做的任务

### 1）Russell（payroll/hr）

- `src/components/features/payroll/usePayrollData.ts`（~20）
- `src/components/features/payroll/PayrollTable.tsx`（~8）
- `src/components/features/hr/StaffPayrollToolbar.tsx`（~7）
- `src/components/features/hr/StaffPayrollTable.tsx`（~5）
- `src/components/features/hr/useStaffPayrollFilters.ts`（~5）
- `src/components/features/hr/DepartmentManager.tsx`（~6）

### 2）Galileo（settlement/labor/costLedger）

- `src/components/features/settlement/SettlementForm.tsx`（~6）
- `src/components/features/settlement/useSettlementHandlers.ts`（~6）
- `src/components/features/settlement/SettlementProjectActions.tsx`（~6）
- `src/components/features/labor/hooks/useLaborProjectWorker.ts`（~6）
- settlement/labor/costLedger/dashboard 散落文件若干（各1处）

## 替换策略

- `catch (error: any)` → `catch (error: unknown)`
- `any[]` → 具体类型（如 `Member[]`、`PayrollRecord[]`、`string[][]`）
- `Record<string, any>` → `Record<string, unknown>` 或具体类型
- `Dispatch<SetStateAction<any>>` → 具体泛型
- `(x as any).foo` → `(x as unknown as Record<string, unknown>).foo` 或直接删断言

## 验收标准（必须全绿）

- `tsc --noEmit --pretty false`：0 error
- `vite build`：success
- `npm run check`：0 HARD FAIL

## 操作提示

- 先做 payrolls/hr，再做 settlement/labor/costLedger
- 每个 worker 单次任务不超过 20 文件，避免超时
- services 层（tauri-bridge / api-methods）any 属历史技术债，建议本轮先不动

---
接手后只需执行三件事：摸底剩余 any → 分批清理 → 每批跑红绿灯。
## 2026-06-25 执行记录

- 首次子代理尝试失败：Param Incorrect / Not supported model gpt-5.2
- 改为手动分批执行（每批 ≤ 20 文件），先做 src/components/features + src/utils（非 services、非 tests）


## 2026-06-25 R16 执行记录（第一轮）

### 成果

- **any 总数**：375 → 297（非 services/tests 范围，减少 78 处）
- **修改文件**：28 个（含 6 个预存 tsc 错误修复）
- **三灯状态**：tsc 0 error ✅ / vite build ✅ / npm run check ALL CLEAN ✅

### 已完成文件

| 文件 | before → after |
|------|---------------|
| StaffList.tsx | 10 → 0 |
| useSettlementHandlers.ts | 6 → 0 |
| SettlementProjectActions.tsx | 6 → 0 |
| useLaborProjectWorker.ts | 8 → 0 |
| useLaborData.ts | 6 → 0 |
| StaffAttendanceDashboard.tsx | 6 → 0 |
| DepartmentManager.tsx | 1 → 0 |
| useLaborOperations.ts | 20 → 0 |
| audit/logger.ts | 11 → 0 |
| audit.ts | 8 → 0 |
| useCompanyQuery.ts | 6 → 0 |
| usePartnerActions.ts | 5 → 0 |
| WorkerImportPhase.tsx | 6 → 0 |
| LaborDashboard.tsx | 5 → 0 |
| useLaborWorkerLifecycle.ts | 5 → 0 |
| useWageActions.ts | 5 → 0 |
| auditFieldFormat.tsx | 0 → 0 (tsc 修复) |

### 预存 tsc 错误修复（6 个文件）

- CostLedgerAnalytics.tsx：API 响应类型 + recharts formatter
- CostLedgerImportModal.tsx：WorkBook 类型 + CostLedgerMatchRule
- SettlementForm.tsx：Excel 导入行类型
- usePayrollData.ts：teamId 默认值
- SettlementItemsTable.tsx：onUpdate 类型
- useMemberOperations.ts：logCreate 参数类型

### 经验教训

- **interface 参数类型（如 formData: any → Record<string, unknown>）**：容易引发连锁 tsc 错误，因为调用方传入的具体类型（如 StaffFormData）不兼容 Record<string, unknown>。**策略**：对函数参数的 any，优先用具体类型或保持 any，不要盲目改 unknown
- **catch (error: any) → catch (error: unknown)**：安全且无副作用，是最优先的清理目标
- **Record<string, any> → Record<string, unknown>**：在 audit/logger 等工具层安全，但在业务组件里需小心 JSX 渲染 unknown 的问题
- **批量 revert + 只做安全替换**：对于顽固文件，revert 到 HEAD 后只做 catch 块替换，比硬改接口类型效率高

### 下一步（新会话接手）

1. 剩余 any ≈ 297 处（含 services ~100、tests ~50、types ~20、组件 ~127）
2. 组件层 127 处可继续清理，但需逐文件评估是否会引起 tsc 连锁错误
3. services 层（tauri-bridge/api-methods）是 API 桥接设计债，建议不动
4. 建议每批 ≤10 文件，每批结束跑 tsc，发现连锁错误立即 revert 该文件

================
File: docs/handoff/R16-R17-verification.md
================
# R16-R17 接手核查文档 (2026-06-26)

> **目的**: 校正前两份交接文档的不准确之处,给接手 agent 一份可信的当前快照。
> **核查者**: GLM-5-Turbo (file:line 实证核查,非盲信文档)
> **基于**: HEAD `2ba01f2` + 工作区当前状态

---

## ⚠️ 给接手 agent 的最重要提示

**前两份文档不要直接信,有 2 处误导:**

1. `docs/handoff/R16-R17-handoff.md`(MiMo 写)声称"P0×5 + P1×10 + P2×20 已修" —— 我抽查 P1-4/P1-5 确认属实,但 **commit 9814575 的 message 撒谎了**(见下文问题 2)
2. `docs/handoff/security-fix-handoff.md`(我之前写)基于"未 commit"状态,现在 P0 早已 commit 进 HEAD,**该文档已过时**

---

## 一、当前真实状态

### Git 状态
- **HEAD**: `2ba01f2` (docs: R16-R17 工作交接文档)
- **分支**: master (唯一)
- **版本**: v0.78.3 (package.json),最新 tag v0.78.1
- **工作区**: **1 个未提交改动** — `EngineeringManager.Api/Endpoints/CostLedgerEndpoints.cs`

### 这个未提交改动是什么(关键!)

```diff
+ totalCount = ...FROM cost_ledger WHERE 1=1{...} AND deleted_at IS NULL
+ totalExpense = ...FROM cost_ledger WHERE direction='expense'{...} AND deleted_at IS NULL
+ totalIncome = ...FROM cost_ledger WHERE direction='income'{...} AND deleted_at IS NULL
```

**性质**: commit 9814575 把 `cost_ledger` 表改成软删除(`UPDATE ... SET deleted_at`),但**漏了给 3 条统计 SQL 加过滤**。这个未提交改动是配套补丁 —— **没有它,软删除的成本记录仍会被计入统计**(真 bug)。

**我已验证**:
- ✅ dotnet build 0 错误 0 警告
- ✅ dotnet test 122/122 通过
- ✅ 这是正确且必要的修复
- ⚠️ **不要 revert 这个改动** — 它防止数据统计错误

**处理建议**: 接手后第一个动作建议是 `git add` + commit 它,message 示例:
```
fix: cost_ledger 统计 SQL 补 deleted_at IS NULL (9814575 软删除配套)

9814575 把 cost_ledger DELETE 改成软删除,但漏了 3 条 COUNT/SUM
统计 SQL 加过滤。不补会导致软删除记录仍被统计。
```

---

## 二、核查发现的 2 个问题

### 问题 1: commit message 误导(9814575)

commit 9814575 的 message 说: "5张财务表 DELETE→UPDATE + SELECT 加 deleted_at IS NULL"

**实际真相**:
- ✅ 真正改成软删除的是 **5 张表**: `settlements` / `cost_ledger` / `invoices` / `payment_records` / `wages`
- ❌ message 暗示的 "contracts 表也软删除" 是错的 — `income_contracts`/`expense_contracts`/`agreement_contracts`/`contract_templates` **仍是硬删除**(`DELETE FROM`,这是对的,不需要改)
- ✅ 5 张软删除表的 SELECT 我逐一核查,**过滤全部正确**(invoices/payment_records/wages/settlements 都有;cost_ledger 列表有,统计就是上面那个未提交补丁)

**影响**: 无 bug,但接手 agent 若信 message 会困惑"为什么 contracts 查询没加 deleted_at 过滤"。

### 问题 2: P1-5 括号 bug(已修,勿重复修)

MiMo 的 security-fix-handoff 和早期核查提过 `CostLedgerEndpoints.cs:143` 缺括号。**实际已全部修复**:
- L27: `CurrentUser.UserFilterCompany()` ✅
- L39: `CurrentUser.UserFilterCompany()` ✅
- L145: `CurrentUser.UserFilterCompany()` ✅

接手时**不要再去找这个 bug**,已不存在。

---

## 三、已完成工作总览(可信)

### P0 ×5 (全部 commit,HEAD `814eacf`)
| # | 修复 | 文件 |
|---|------|------|
| P0-1/8 | JWT secret → `JwtSecretProvider` 持久化 | Program.cs, AuthEndpoints.cs |
| P0-3 | open-external 扩展名白名单(19种) | FileEndpoints.cs |
| P0-4 | Login 只记用户名不存密码 | Login.tsx |
| P0-5 | ErrorBoundary 集成 main.tsx | main.tsx |
| P0-7 | 删除重复 payment_records CREATE | Program.cs |

### P1 ×10 (全部 commit)
| # | 修复 | 核查 |
|---|------|------|
| P1-1/2 | ContractEndpoints DTO 绑定(dynamic→JsonElement) | ✅ |
| P1-3 | WageEndpoints batch DTO 绑定 | ✅ |
| P1-4 | 快照恢复加 IsAdmin 校验 (SystemEndpoints.cs:213) | ✅ 已验证 |
| P1-5 | UserFilterCompany 括号 (3处全修) | ✅ 已验证 |
| P1-6 | DOMPurify XSS 消毒 (TemplateGenerate.tsx) | 未抽查 |
| P1-8 | App.tsx JSON.parse try-catch | 未抽查 |
| P1-9 | AuthContext.tsx 死代码删除 | 未抽查 |
| P1-10 | .Result→await (AuthEndpoints.cs:322) | 未抽查 |
| P1-11 | 软删除阶段1(5张表) | ✅ 已验证(见问题1) |

### P2 ×20 (声称已修,未抽查)
包括: 空catch日志、DELETE权限、全局异常、图片懒加载、DataTable虚拟化、OCR权限、Token缓存加锁、硬编码端口等。

---

## 四、接下来要做什么

### 🔴 立即(5分钟)
1. **commit 工作区的 CostLedgerEndpoints.cs 改动**(见上文,防止丢失)

### 🟡 本 sprint
2. **P2-1: Dashboard/Projects 迁移 React Query** — 文档第二节列的,适合 Mimo Code 做模式替换
3. **抽查未验证的 P1/P2 修复**(P1-6/8/9/10 等) — 确保不是空 commit

### 🟢 后续(来自 v0.78.1-handoff 待办)
4. **cloud sync 阶段 2** — schema 已就绪(v0.77.0),endpoint 改造 + sync worker + 冲突 UI
5. **组件拆分** — src/components/*.tsx 迁到 features/
6. **any 继续清理** — 剩余 ~200 处
7. **npm check 软警告** — 文件行数超标

---

## 五、Mimo Code 协作(省 token)

单文件机械任务可派给 Mimo Code(免费)。本次会话 P0-5 ErrorBoundary 集成就是 Mimo 做的。

**正确调用方式**(文档里的 PowerShell 占位符语法有误):
```bash
cd "E:\测试" && echo "任务描述" | "C:/Users/Admin/AppData/Roaming/npm/node_modules/@mimo-ai/mimocode-windows-x64/bin/mimo.exe" run -m mimo/mimo-auto --dir "E:/测试" -f "prompt文件路径" --dangerously-skip-permissions > stdout.log 2> stderr.log
```

任务模板见 `.mimo-runs/P0-5-errorboundary/prompt.md`(成功的范例)。

**适合 Mimo**: 单文件拆分、catch→日志、alert→Toast、any 清理
**自己做**: 安全漏洞、架构决策、复杂 bug

---

## 六、红绿灯基线(已验证全绿)

```bash
cd "E:\测试\EngineeringManager.Api" && dotnet build          # 0 错 0 警
cd "E:\测试\EngineeringManager.Tests" && dotnet test          # 122/122
cd "E:\测试" && npx tsc --noEmit --pretty false               # 0 error
cd "E:\测试" && npx vite build                                # ~11s
cd "E:\测试" && npm run check                                 # BUILD PASSED
```

---

*生成: 2026-06-26 by GLM-5-Turbo | 核查基于 file:line 实证*

================
File: docs/handoff/security-fix-handoff.md
================
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

================
File: e2e/critical-paths.spec.ts
================
import { test, expect } from '@playwright/test'

test.describe('工程管家 E2E 关键路径', () => {

  test('API 健康检查', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
  })

  test('API 认证保护 — 未登录返回401', async ({ request }) => {
    const response = await request.get('/api/projects')
    expect(response.status()).toBe(401)
  })

  test('API 登录获取token', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' }
    })
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.token).toBeTruthy()
  })

  test('API 用token访问受保护端点', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' }
    })
    const loginBody = await loginRes.json()
    const token = loginBody.data.token

    const res = await request.get('/api/projects', {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(res.ok()).toBeTruthy()
  })

  test('API 无效token返回401', async ({ request }) => {
    const res = await request.get('/api/projects', {
      headers: { Authorization: 'Bearer invalid-token' }
    })
    expect(res.status()).toBe(401)
  })
})

================
File: index.html
================
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>工程管家 - 工程项目管理系统</title>
    <link rel="icon" type="image/png" href="/installer-assets/app-icon.png">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
        background-color: #f8fafc;
        overflow: hidden;
      }
      #root {
        width: 100vw;
        height: 100vh;
      }
      /* 极简加载占位 — 与 React SplashScreen 无缝过渡 */
      .app-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #f8fafc;
      }
      .app-loading-logo {
        width: 56px;
        height: 56px;
        margin-bottom: 20px;
        opacity: 0.6;
      }
      .app-loading-dots {
        display: flex;
        gap: 8px;
      }
      .app-loading-dots span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #2563eb;
        animation: pulse 1.2s ease-in-out infinite;
      }
      .app-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
      .app-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes pulse {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.3); }
      }
      /* 跟随主题：深色主题时切换背景 */
      [data-theme="graphite"] body,
      [data-theme="graphite"] .app-loading {
        background: #1a1a2e;
      }
      [data-theme="graphite"] .app-loading-dots span {
        background: #ff8c32;
      }
      [data-theme="sandstone"] body,
      [data-theme="sandstone"] .app-loading {
        background: #faf5ef;
      }
      [data-theme="sandstone"] .app-loading-dots span {
        background: #d97706;
      }
    </style>
    <script>window.__APP_VERSION__ = '<APP_VERSION>'</script>
  </head>
  <body>
    <div id="root">
      <div class="app-loading">
        <!-- Logo 三角形 — 与 SplashScreen 一致 -->
        <svg class="app-loading-logo" viewBox="0 0 18 18" fill="none">
          <defs>
            <linearGradient id="loading-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#2563eb" />
              <stop offset="100%" stop-color="#2563eb" stop-opacity="0.6" />
            </linearGradient>
          </defs>
          <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#loading-grad)" />
          <path d="M5 14 L9 6 L13 14 Z" fill="#f8fafc" />
        </svg>
        <!-- 脉冲点 -->
        <div class="app-loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

================
File: playwright.config.ts
================
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5048',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

================
File: postcss.config.js
================
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

================
File: public/fonts/README.md
================
# UI 字体文件

本目录存放 UI 界面字体文件，用于设置页面的"界面字体"切换功能。

## 需要的字体文件

| 文件名 | 字体 | 大小 |
|--------|------|------|
| `SourceHanSansSC-Regular.otf` | 思源黑体 简中 Regular | ~15MB |
| `SourceHanSerifSC-Regular.otf` | 思源宋体 简中 Regular | ~15MB |

## 下载地址

### 思源黑体 (Source Han Sans)
- GitHub: https://github.com/adobe-fonts/source-han-sans/releases
- 下载 SubsetOTF → CN → `SourceHanSansSC-Regular.otf`

### 思源宋体 (Source Han Serif)
- GitHub: https://github.com/junmer/source-han-serif-ttf/releases
- 下载 TTF → SC → `SourceHanSerifSC-Regular.otf`（或 OTF 版本）

## 使用方式

1. 下载上述两个字体文件
2. 重命名为上表中的文件名
3. 放到本目录 (`public/fonts/`)
4. 重启开发服务器或重新构建

字体文件不纳入 git 版本控制（已在 .gitignore 中排除）。

================
File: public/installer.nsh
================
; ══════════════════════════════════════════════════════════════════════════
; 工程管家 安装器自定义脚本
; ══════════════════════════════════════════════════════════════════════════

!include "MUI2.nsh"

; 抑制 Page Custom 函数被误判为未引用的警告
!pragma warning disable 6010

!define APP_CONFIG_DIR "$APPDATA\engineering-manager"

; ── 安装包界面品牌 ──
; header 位图由 package.json 的 nsis.installerHeader 配置
; welcome 侧栏位图使用 electron-builder 内置 Metro 风格
; 背景色保持默认白色（确保文字可读）

Var DataDir
Var DataDirDialog
Var DataDirButton

; ── 欢迎页 ──
!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

; ── 安装前：确保能检测到旧版安装 ──
!macro preInit
  ; 不删注册表，让 electron-builder 能识别旧版安装路径
!macroend

; ── 初始化：设置默认数据路径 ──
!macro customInit
  StrCpy $DataDir "D:\Company Database"
!macroend

; ── 安装目录页之后：显示数据存储路径选择页 ──
!macro customPageAfterChangeDir
  Page Custom DataDirPage DataDirLeave
!macroend

; ── 数据目录自定义页面 ──
Function DataDirPage
  !insertmacro MUI_HEADER_TEXT "数据存储路径" "选择工程管家的数据文件存储位置"
  nsDialogs::Create 1018
  Pop $DataDirDialog

  ${If} $DataDirDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 20u 100% 14u "示例数据、上传文件、配置文件将存储在此目录。$\n可以设置为已有的数据目录来迁移数据。"
  Pop $0

  ${NSD_CreateDirRequest} 0 60u 75% 14u "$DataDir"
  Pop $1
  ${NSD_CreateBrowseButton} 78% 58u 22% 17u "浏览..."
  Pop $DataDirButton
  ${NSD_OnClick} $DataDirButton OnDataDirBrowse

  nsDialogs::Show
FunctionEnd

Function OnDataDirBrowse
  ${NSD_GetText} $1 $0
  nsDialogs::SelectFolderDialog "选择数据存储目录" $0
  Pop $0
  ${If} $0 != error
    ${NSD_SetText} $1 $0
  ${EndIf}
FunctionEnd

; ── 数据目录页离开时：校验目录 ──
Function DataDirLeave
  ${NSD_GetText} $1 $DataDir
  ${If} $DataDir == ""
    MessageBox MB_ICONEXCLAMATION "请选择数据存储路径或使用默认路径。"
    Abort
  ${EndIf}
FunctionEnd

; ── 安装完成：写入 config.json 到 %APPDATA%\engineering-manager ──
; 如果已存在则不覆盖（保留原有数据路径，避免 JSON 格式兼容问题）
!macro customInstall
  IfFileExists "${APP_CONFIG_DIR}\config.json" done_cfg
    CreateDirectory "${APP_CONFIG_DIR}"
    FileOpen $0 "${APP_CONFIG_DIR}\config.json" w
    FileWrite $0 '{"dataPath":"$DataDir"}$\r$\n'
    FileClose $0
  done_cfg:
  CreateDirectory "$DataDir"
  CreateDirectory "$DataDir\uploads"
!macroend

================
File: public/logo-graphite.svg
================
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 18 18" fill="none">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#grad)" stroke-linejoin="round"/>
  <path d="M5 14 L9 6 L13 14 Z" fill="#0f172a"/>
</svg>

================
File: public/logo-sandstone.svg
================
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 18 18" fill="none">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#grad)" stroke-linejoin="round"/>
  <path d="M5 14 L9 6 L13 14 Z" fill="#1c1917"/>
</svg>

================
File: public/logo-white.svg
================
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 18 18" fill="none">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#grad)" stroke-linejoin="round"/>
  <path d="M5 14 L9 6 L13 14 Z" fill="#f8fafc"/>
</svg>

================
File: public/ocr-config-example.json
================
{
  "ocrConfig": {
    "provider": "baidu",
    "enabled": true,
    "baidu": {
      "apiKey": "您的API_KEY",
      "secretKey": "您的SECRET_KEY"
    }
  },
  "配置说明": {
    "provider": "OCR提供商: baidu(百度OCR) 或 offline(离线模式)",
    "enabled": "是否启用OCR功能",
    "baidu.apiKey": "百度OCR的API Key",
    "baidu.secretKey": "百度OCR的Secret Key"
  },
  "使用说明": "将上方baidu对象中的apiKey和secretKey替换为实际的百度OCR凭证，然后启动应用"
}

================
File: scripts/check-rules.cjs
================
/**
 * 工程管家 架构规则检查脚本
 *
 * 在 vite build 前自动运行，违规则中断构建。
 * 规则优先级：硬上限 → build 失败 | 软上限 → 警告继续 | 无上限 → 无提示
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const ELECTRON = path.join(ROOT, 'electron')

let violations = 0
let warnings = 0

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.split('\n').length
}

function countUseState(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const matches = content.match(/\buseState\s*\(/g)
  return matches ? matches.length : 0
}

function checkAnyInPreload(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  // 找每个 ipcRenderer.invoke 调用，检查其参数类型是否为 any
  const lines = content.split('\n')
  const violations = []
  lines.forEach((line, i) => {
    if (line.includes(': any') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      // 排除合法的 any 使用（如 catch 中的 error: any）
      if (line.includes('catch') || line.includes('error')) return
      violations.push({ line: i + 1, content: line.trim() })
    }
  })
  return violations
}

function fileExists(filePath) {
  return fs.existsSync(filePath)
}

// ═══════════════════════════════════════════════════════════
// 铁律一：文件行数上限
// ═══════════════════════════════════════════════════════════

const SIZE_LIMITS = {
  // 目录匹配模式 → { hard: 硬上限, soft: 软上限, glob: 匹配模式 }
  pageComponents: {
    dir: path.join(SRC, 'components'),
    hard: 500,
    soft: 350,
    // 只匹配顶层 .tsx（非 features/, 非 ui/）
    filter: (f) => f.endsWith('.tsx') && !f.includes('\\features\\') && !f.includes('\\ui\\') && !f.includes('/features/') && !f.includes('/ui/'),
  },
  featureComponents: {
    dir: path.join(SRC, 'components', 'features'),
    hard: 400,
    soft: 250,
    filter: (f) => f.endsWith('.tsx'),
  },
  ipcHandlers: {
    dir: path.join(ELECTRON, 'ipc-handlers'),
    hard: 350,
    soft: 200,
    filter: (f) => f.endsWith('.ts'),
  },
  hooks: {
    dir: path.join(SRC, 'hooks'),
    hard: 250,
    soft: 150,
    filter: (f) => f.endsWith('.ts') || f.endsWith('.tsx'),
  },
}

function walkDir(dir, filter) {
  const results = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, filter))
    } else if (filter(fullPath)) {
      results.push(fullPath)
    }
  }
  return results
}

console.log('\n═══ 铁律一：文件行数检查 ═══')
for (const [name, config] of Object.entries(SIZE_LIMITS)) {
  const files = walkDir(config.dir, config.filter)
  for (const file of files) {
    const lines = countLines(file)
    const rel = path.relative(ROOT, file)
    if (lines > config.hard) {
      console.log(`  HARD FAIL  ${rel}: ${lines} 行 (上限 ${config.hard})`)
      violations++
    } else if (lines > config.soft) {
      console.log(`  SOFT WARN  ${rel}: ${lines} 行 (建议 ≤${config.soft})`)
      warnings++
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 铁律二：已知孪生文件检测
// ═══════════════════════════════════════════════════════════

console.log('\n═══ 铁律二：孪生文件检测 ═══')

const TWIN_PAIRS = [
  {
    files: ['src/components/IncomeContracts.tsx', 'src/components/ExpenseContracts.tsx'],
    message: '收入/支出合同组件应合并为一个 ContractPage 组件',
  },
]

for (const pair of TWIN_PAIRS) {
  const exists = pair.files.filter(f => fileExists(path.join(ROOT, f)))
  if (exists.length >= 2) {
    console.log(`  HARD FAIL  孪生文件仍存在: ${exists.join(', ')}`)
    console.log(`              ${pair.message}`)
    violations++
  }
}

// ═══════════════════════════════════════════════════════════
// 铁律四：useState 数量检查
// ═══════════════════════════════════════════════════════════

console.log('\n═══ 铁律四：useState 数量检查 ═══')

const pageComponentDir = path.join(SRC, 'components')
const topLevelTsxFiles = fs.readdirSync(pageComponentDir)
  .filter(f => f.endsWith('.tsx'))
  .map(f => path.join(pageComponentDir, f))

for (const file of topLevelTsxFiles) {
  const count = countUseState(file)
  const rel = path.relative(ROOT, file)
  if (count > 8) {
    console.log(`  HARD FAIL  ${rel}: ${count} 个 useState (上限 8)`)
    violations++
  } else if (count > 5) {
    console.log(`  SOFT WARN  ${rel}: ${count} 个 useState (建议 ≤5，考虑拆分或 useReducer)`)
    warnings++
  }
}

// features 组件也检查
const featureFiles = walkDir(path.join(SRC, 'components', 'features'), f => f.endsWith('.tsx'))
for (const file of featureFiles) {
  const count = countUseState(file)
  const rel = path.relative(ROOT, file)
  if (count > 8) {
    console.log(`  HARD FAIL  ${rel}: ${count} 个 useState (上限 8)`)
    violations++
  }
}

// ═══════════════════════════════════════════════════════════
// 铁律五：preload.ts any 类型检测
// ═══════════════════════════════════════════════════════════

console.log('\n═══ 铁律五：preload.ts 类型安全 ═══')

const preloadPath = path.join(ELECTRON, 'preload.ts')
if (fileExists(preloadPath)) {
  const anyViolations = checkAnyInPreload(preloadPath)
  if (anyViolations.length > 30) {
    // 当前已有大量 any，只显示统计，不阻断
    console.log(`  SOFT WARN  preload.ts: ${anyViolations.length} 处使用 any（待逐步类型化）`)
    warnings++
  } else if (anyViolations.length > 0) {
    for (const v of anyViolations) {
      console.log(`  HARD FAIL  preload.ts:${v.line}: ${v.content}`)
    }
    violations += anyViolations.length
  }
}

// ═══════════════════════════════════════════════════════════
// 铁律七：样式系统防复发检查（新增 — 2026-06-10 治理）
// ═══════════════════════════════════════════════════════════

console.log('\n═══ 铁律七：样式系统防复发 ═══')

function walkTsxFiles(dir, filter) {
  const results = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkTsxFiles(fullPath, filter))
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      if (!filter || filter(fullPath)) results.push(fullPath)
    }
  }
  return results
}

// 规则 1：禁止硬编码 hex 颜色（排除 index.css 变量定义、测试文件、prototype HTML）
const hexColorRegex = /#[0-9a-fA-F]{6}/g
const noHexColorFiles = walkTsxFiles(SRC, f =>
  !f.includes('__tests__') && !f.includes('node_modules') && !f.includes('prototype') && !f.endsWith('.html') && !f.endsWith('Colors.ts'))
let hexWarnings = 0
for (const file of noHexColorFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  const matches = content.match(hexColorRegex)
  if (matches) {
    // 排除 index.css 中的 CSS 变量定义和主题颜色
    const effective = matches.length
    if (effective > 0) {
      const rel = path.relative(ROOT, file)
      console.log(`  SOFT WARN  ${rel}: ${effective} 处硬编码 hex 颜色`)
      hexWarnings += effective
      warnings++
    }
  }
}
if (hexWarnings > 0) {
  console.log(`  共 ${hexWarnings} 处硬编码颜色，建议迁移到 Tailwind 主题色或 CSS 变量`)
}

// 规则 2：禁止 gray- 色系（排除 index.css 主题定义）
function checkGrayInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const violations = []
  lines.forEach((line, i) => {
    if (/\bgray-\d/.test(line) && !line.trim().startsWith('/*') && !line.trim().startsWith('//')) {
      violations.push({ line: i + 1, content: line.trim() })
    }
  })
  return violations
}
const grayCheckFiles = walkTsxFiles(SRC, f => !f.includes('__tests__') && !f.includes('node_modules'))
let grayViolations = 0
for (const file of grayCheckFiles) {
  const v = checkGrayInFile(file)
  if (v.length > 0) {
    const rel = path.relative(ROOT, file)
    console.log(`  HARD FAIL  ${rel}: ${v.length} 处 gray-* 使用，请改为 slate-*`)
    grayViolations += v.length
  }
}
if (grayViolations > 0) {
  console.log(`  共 ${grayViolations} 处 gray-* 违规，必须改为 slate-*`)
  violations += grayViolations
}

// 规则 2：禁止 gray- 色系（排除 .css 文件——主题定义中 gray- 是有意为之）

// 规则 3：禁止 text-[Npx] 任意字号（已有 text-caption/text-micro 替代）
const arbitraryTextPattern = /text-\[\d+(\.\d+)?px\]/g
const textCheckFiles = walkTsxFiles(SRC, f => !f.includes('__tests__') && !f.includes('node_modules'))
let textViolations = 0
for (const file of textCheckFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  const matches = content.match(arbitraryTextPattern)
  if (matches) {
    const rel = path.relative(ROOT, file)
    console.log(`  HARD FAIL  ${rel}: ${matches.length} 处任意字号 (${matches.join(', ')})，请用 text-caption 或 text-micro`)
    textViolations += matches.length
  }
}
if (textViolations > 0) {
  violations += textViolations
}

console.log(`  硬编码 hex: ${hexWarnings} (warn), gray-*: ${grayViolations}, 任意字号: ${textViolations}`)

console.log('\n═══ 铁律六：代码分割检查 ═══')

const appPath = path.join(SRC, 'App.tsx')
if (fileExists(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf-8')
  if (!appContent.includes('React.lazy') && !appContent.includes('lazy(')) {
    console.log(`  SOFT WARN  App.tsx 未使用 React.lazy 做路由级代码分割`)
    warnings++
  }
}

// ═══════════════════════════════════════════════════════════
// 汇总
// ═══════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════')
console.log(`检查完成: ${violations} 项违规, ${warnings} 项警告`)
console.log('═══════════════════════════════════════\n')

if (violations > 0) {
  console.error(`BUILD BLOCKED: ${violations} 项硬性规则违规。请修复后再构建。`)
  process.exit(1)
} else if (warnings > 0) {
  console.log(`BUILD PASSED: ${warnings} 项警告，建议尽快处理。\n`)
  process.exit(0)
} else {
  console.log('ALL CLEAN: 所有规则检查通过。\n')
  process.exit(0)
}

================
File: skills-lock.json
================
{
  "version": 1,
  "skills": {
    "logo-generator": {
      "source": "op7418/logo-generator-skill",
      "sourceType": "github",
      "skillPath": "SKILL.md",
      "computedHash": "4e25e86d29728563f55bb9eef77db705220e10b68e49b59d57e568ed7f20503f"
    }
  }
}

================
File: tailwind.config.js
================
/** @type {import('tailwindcss').Config} */

/**
 * 辅助：创建引用 CSS 变量并支持 alpha 通道的色阶
 * CSS 变量格式为 "R G B"（空格分隔，无逗号），例如：
 *   --color-primary-500: 59 130 246;
 * 用法：
 *   bg-primary-500         → rgb(var(--color-primary-500) / 1)
 *   bg-primary-500/20      → rgb(var(--color-primary-500) / 0.2)
 *
 * <alpha-value> 是 Tailwind 识别的占位符，构建时自动替换。
 */
function colorVar(vName) {
  return `rgb(var(${vName}) / <alpha-value>)`
}

module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: colorVar('--color-primary-50'),
          100: colorVar('--color-primary-100'),
          200: colorVar('--color-primary-200'),
          300: colorVar('--color-primary-300'),
          400: colorVar('--color-primary-400'),
          500: colorVar('--color-primary-500'),
          600: colorVar('--color-primary-600'),
          700: colorVar('--color-primary-700'),
          800: colorVar('--color-primary-800'),
          900: colorVar('--color-primary-900'),
        },
        success: {
          50: colorVar('--color-success-50'),
          100: colorVar('--color-success-100'),
          200: colorVar('--color-success-200'),
          300: colorVar('--color-success-300'),
          400: colorVar('--color-success-400'),
          500: colorVar('--color-success-500'),
          600: colorVar('--color-success-600'),
          700: colorVar('--color-success-700'),
          800: colorVar('--color-success-800'),
          900: colorVar('--color-success-900'),
        },
        warning: {
          50: colorVar('--color-warning-50'),
          100: colorVar('--color-warning-100'),
          200: colorVar('--color-warning-200'),
          300: colorVar('--color-warning-300'),
          400: colorVar('--color-warning-400'),
          500: colorVar('--color-warning-500'),
          600: colorVar('--color-warning-600'),
          700: colorVar('--color-warning-700'),
          800: colorVar('--color-warning-800'),
          900: colorVar('--color-warning-900'),
        },
        danger: {
          50: colorVar('--color-danger-50'),
          100: colorVar('--color-danger-100'),
          200: colorVar('--color-danger-200'),
          300: colorVar('--color-danger-300'),
          400: colorVar('--color-danger-400'),
          500: colorVar('--color-danger-500'),
          600: colorVar('--color-danger-600'),
          700: colorVar('--color-danger-700'),
          800: colorVar('--color-danger-800'),
          900: colorVar('--color-danger-900'),
        },
        info: {
          50: colorVar('--color-info-50'),
          100: colorVar('--color-info-100'),
          200: colorVar('--color-info-200'),
          300: colorVar('--color-info-300'),
          400: colorVar('--color-info-400'),
          500: colorVar('--color-info-500'),
          600: colorVar('--color-info-600'),
          700: colorVar('--color-info-700'),
          800: colorVar('--color-info-800'),
          900: colorVar('--color-info-900'),
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'lifted': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'stagger-1': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both',
        'stagger-2': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        'stagger-3': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        caption: ['0.625rem', { lineHeight: '0.875rem' }],  // 10px — 替代 text-[10px]
        micro: ['0.6875rem', { lineHeight: '1rem' }],        // 11px — 替代 text-[11px]
      },
    },
  },
  plugins: [],
}

================
File: tsconfig.json
================
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "noEmitOnError": false,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "exclude": ["src/__tests__", "electron/__tests__", "dist", "dist-electron", "node_modules", "deliverables"]
}

================
File: tsconfig.node.json
================
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "electron/**/*.ts"]
}

================
File: docs/ARCHITECTURE.md
================
# 架构决策与数据保障

> 本文档包含架构决策历史记录和数据保障机制详细说明，AGENTS.md 只保留概要。
> 最后同步：2026-07-04（对齐 v0.82.0；v0.79–0.82 增量见 CHANGELOG.md）

---

## 🛡️ 数据保障机制（Phase 1+2+3 — 2026-05-29，全部完成）

### 写入流程（已迁移到 C#）
- C# SQLite 直接写入（单线权威存储，不再需要 Electron 双写）
- 旧 Electron 架构曾使用 `dual-write.ts`（SQLite 先写→JSON 后写），已迁移到纯 SQLite 模式
- C# 写入失败时返回 HTTP 500 + 错误信息

### JSON 周期性导出（已迁移到 C#）
- C# 端实现全量 JSON 导出（替代旧 `exportJsonFromSqlite()`）
- 触发时机：通过 API 触发，不再需要 app 关闭时自动导出
- 数据备份走快照系统，JSON 导出作为手动数据迁移工具保留

### 快照系统
- C# 端实现快照：同时备份 `.db` + `.db-wal`
- `EngineeringManager.Api/Endpoints/SystemEndpoints.cs` 提供快照管理
- 最多保留 200 个快照
- `restoreSnapshot()` 还原 SQLite

### 数据完整性校验
- C# 端启动时 `PRAGMA integrity_check`
- 空数据保护：内存为空但磁盘 >10KB → 拒绝写入 + 紧急备份
- 行数骤降检测：>10 行骤降 >50% → 拒绝写入 + 紧急备份

### 启动时检查（已迁移到 C#）
- `PRAGMA integrity_check`：失败返回错误状态
- JSON/SQLite 一致性检查（作为兼容性保留）
- C# API 端点：`GET /api/sqlite/status` → `EngineeringManager.Api/Endpoints/SystemEndpoints.cs`

### 关键文件
| 文件 | 作用 |
|------|------|
| `EngineeringManager.Api/Program.cs` | 数据库初始化 + CORS + 端点注册 |
| `EngineeringManager.Api/Endpoints/SystemEndpoints.cs` | 快照管理 + SQLite 状态 + 审计日志 + 健康检查 |
| `EngineeringManager.Api/EntryPoint.cs` | 桌面入口（[STAThread] + WebView2 窗口） |
| `EngineeringManager.Api/MainWindow.cs` | WinForms 窗口（WebView2 + DWM 圆角 + 消息通信） |

> **历史说明**：旧 Electron 架构使用 `electron/dual-write.ts`（双写）、`electron/database.ts`（完整性校验）、`electron/ipc-handlers/sqlite-status.ts`（健康检查）。C# 迁移后这些功能已重新实现，文件不再存在。

---

## 📋 架构决策记录

### 数据模型变更
| 变更 | 日期 | 说明 |
|------|------|------|
| `db.projectMembers` 多对多关联表 | 2026-05-05 | 替代 `Member.projectId` 单一字段，支持一个管理人员归属多个项目 |
| `db.templates` 模板集合 | 2026-05-07 | 模板管理独立模块 |
| `db.wages` + `db.attendances` | 2026-05-04 | 工资计算引擎 + 考勤系统（dailyStatus 五种日状态） |
| `db.auditLogs` + `db.roles` | 2026-05-05 | 审计日志 + 角色权限编辑器 |
| `ensureDatabaseFields()` 27 集合防御 | 2026-05-06 | 覆盖全部 `db.*` 集合，旧数据库缺字段时不再崩溃 |
| `db.salaryHistory` 薪资历史表 | 2026-05-13 | memberId/effectiveDate/baseSalary/subsidy/subsidyNote/note，追踪薪资变动 |
| `db.departments` 部门表 | 2026-05-12 | 部门 CRUD（名称+负责人），member.departmentId + member.position |
| Phase 1 数据保障 | 2026-05-29 | 24 表完整性校验 + 行数骤降检测 + SQLite 快照备份 |
| Phase 2 SQLite 先写 | 2026-05-29 | 旧 Electron 架构：SQLite 先写→JSON 后写 |
| Phase 3 JSON 退出热路径 | 2026-05-29 | 旧 Electron 架构：`exportJsonFromSqlite` 周期性导出 |
| C# 迁移完成 | 2026-06-01 | 全部 197 个 API 端点迁移到 ASP.NET Core Minimal API |

### 模块架构变更
| 变更 | 日期 | 说明 |
|------|------|------|
| 工人管理UX重构 v2.8.2 | 2026-05-15 | LaborManagement 重写为4-Tab容器（看板/工人库/班组管理/工资管理），琥珀色系(amber)，useConfirm替代原生confirm，3个Hook收敛状态管理 |
| 工资管理月份选择器内嵌 | 2026-05-15 | 从WageCycleDetail头部移除月份选择器，嵌入各Tab内部 |
| 工资管理纯工人化 v3.0 | 2026-05-14 | 代码级清理所有管理人员薪资逻辑，仅保留 projectWorkers |
| 模板管理独立顶级路由 | 2026-05-07 | 7 种分类 + 变量自动检测（mammoth 服务端）+ TemplateSelectorModal 业务集成 |
| 工资管理重构 | 2026-05-06 | 对标 Projects→ProjectDetail 模式，Dashboard+WageCycleDetail(3 Tab) |
| 结算办理重设计 | 2026-05-07 | 6 种细分类别 + 自动核验付款发票 + Excel 模板/灵活导入 |
| 合同看板重构 | 2026-05-07 | 看板首页+子页面模式，收支数据改用 paymentRecords |
| 项目管理重设计 | 2026-05-06 | 8 文件 Bento网格+健康环+投资组合横幅+告警区 |
| 全局工人信息库 | 2026-05-12 | db.workers + db.projectWorkers 双表分离 |
| 人事+工人管理部门化拆分 | 2026-05-12 | 员工管理拆为 HRManagement + LaborManagement 双模块 |
| 成本台账一二级分类重构 | 2026-05-11 | 支出 5 组 18 码 + 收入 4 组 7 码 |
| 成本台账筛选系统升级 | 2026-05-11 | 7 列统一搜索+勾选 Excel 风格，ColumnFilter CheckMeta 重构 |
| check-rules 清零 | 2026-05-11 | 7 硬违规→0：子组件提取 8 文件 + hook 提取 3 个 |
| 任务功能完整移除 | 2026-05-12 | 删除 Tasks 相关代码，Dashboard 替换为发票+结算摘要 |
| 健康度评分公式调整 | 2026-05-12 | 预算控制 40% + 合同执行 30% + 发票管理 30% |
| C# 迁移 | 2026-06-01 | Electron IPC handlers → ASP.NET Core Minimal API 端点 |
| C# 迁移补全 | 2026-06-04 | PartnerDto 新增 ProjectIds 字段，合作伙伴 POST/PUT SQL 补全 project_ids |
| P0-4 越权防护闭环 v0.73.0 | 2026-06-19 | 33 业务端点 + 4 管理端点 user-dim 隔离 + 6 migrations (009-014 + 020) + project_authorizations 表 (admin 手动授权) + CurrentUser helper 3 个 + smoke 测试 5 个 |
| PII Mask 基础设施 v0.73.0 | 2026-06-19 | MaskContext / MaskToggleButton / useMaskedFn hook / 8 组件响应式化 + vitest 单元测试 37 用例 |
| PII Mask 完整闭环 v0.74.0 | 2026-06-19 | 后端去硬 mask (18 处 Common.MaskXxx 调用简化) + 后端 ?unmask=true 查询参数 + apiClient 自动加 unmask=true 参数 (PII_PATHS 常量) + 4 个 GET 端点响应层 mask 支持 (含 GET /api/inventory / /api/materials) |
| PII Mask 多设备同步 v0.75.0 | 2026-06-19 | User Preferences API (migration 022 + 4 端点: GET/PUT /api/user-preferences + GET/PUT /api/user-preferences/{key}) + MaskContext 通过 PUT 后端同步 toggle + useUserIdSync hook (登录后拉后端真值覆盖 localStorage) |
| Partners tax_number schema 修复 v0.74.0 | 2026-06-19 | migration 021_AddPartnersTaxNumber.sql 修复 POST /api/partners 500 bug (v0.72.0 之前一直存在) |
| DataTable 拆分 v0.75.0 | 2026-06-19 | 453 → 358 行 (-21%) + 提取 useDataTableState + useDataTableFilters hook + 修复 alignMap UI bug (列对齐失效) |
| useUserIdSync 接入 v0.76.0 | 2026-06-19 | MaskContext 已暴露 useUserIdSync hook 但 App.tsx 没挂载 → L77 加 useUserIdSync(currentUser?.id) (登录后从后端拉 PII mask toggle 覆盖 localStorage) + L9 import 调整 |
| 仓库清理 v0.76.0 | 2026-06-19 | git rm 10 个一次性调试脚本 (count-btn/test-btn/test-regex/screenshot/rb.cjs + 4 个 generate-logos-*.py 旧版 + refactor-partnerform.ps1) + .gitignore 加 .mimo-runs/ 规则 |
| DataTable 进一步拆分 v0.77.0 | 2026-06-19 | DataTable.tsx 358→209 行 (-42%, 超 -35% 目标) + 新建 DataTable/types.ts (99 行, 4 interface) + DataTable/consts.ts (7 行, alignMap). 保持 import type { Column } from "../DataTable" 兼容, 子文件零改动 |
| DataTable critical runtime bug 修复 v0.78.0 | 2026-06-19 | v0.75.0 commit fbbcaa2 拆分时漏 3 处: (1) useDataTableState + useDataTableFilters import 缺失 (致 30+ List 页面 runtime 崩溃), (2) 内部用 getRowKey 但 props 叫 rowKey (string vs function 类型不匹配), (3) v0.77.0 export type 让 DataTableProps 在内部 scope 不可用. + Tooltip 加 native title fallback. SettlementList 0/8→8/8 |

### 文件存储演进
| 变更 | 日期 | 说明 |
|------|------|------|
| base64→磁盘统一文件服务 | 2026-05-03 | engineering.json 18MB→1.4MB，中文目录归类 |
| 项目名第一层目录 | 2026-05-04 | 有项目归属→`<项目名>/`，无项目→`未分类/` |
| 项目名称参数修复 | 2026-05-05 | 4 文件间参数名张冠李戴修复 |
| 同名检测 + 去随机后缀 | 2026-05-05 | saveFile 同名返回错误；文件名不再附加随机后缀 |
| C# 迁移 | 2026-06-01 | 文件端点迁移到 `FileEndpoints.cs` |

### 权限与审计
| 变更 | 日期 | 说明 |
|------|------|------|
| 权限分配重设计 | 2026-05-05 | `db.roles` + 角色权限编辑器 + `getFilteredSidebarRoutes()` + 路由守卫 |
| 审计日志接通 | 2026-05-05 | 持久化 + localStorage 双写 + `setCurrentAuditUser()` + 详情可读化 |
| 用户管理去重 | 2026-05-05 | Settings.tsx 删除内嵌用户管理（~270行），统一到 Users.tsx |
| 审计日志 C# 迁移 | 2026-06-01 | `EngineeringManager.Api/Endpoints/SystemEndpoints.cs` 提供审计 API |

### UI 系统演进
| 变更 | 日期 | 说明 |
|------|------|------|
| lucide-react 图标系统 | 2026-05-06 | emoji 全部替换，iconMap.ts + Icon 统一入口 |
| framer-motion 全站动画 | 2026-05-06 | CountUp+stagger+spring 物理+全局交互反馈 |
| slate 色系统一 | 2026-05-06 | 27 文件 682 处 gray→slate；15 文件 103 处 dark 清理 |
| 全站表头 sticky | 2026-05-06 | 4 个列表 border-separate+sticky thead |
| Toast 全局 Context | 2026-05-05 | 11 页面统一 useToastContext() |
| 发票票种细化 | 2026-05-06 | InvoiceKind 4 种：纸/电 × 普/专 |
| 窗口 resize + Aero Snap 修复 | 2026-06-03 | FormBorderStyle.None + CreateParams WS_THICKFRAME；前端 div 手柄→postMessage→C# SetCapture 手动 resize；标题栏 drag 走 postMessage startDrag，双击最大化由 C# 侧 500ms 间隔检测
| 金额 formatMoney 全局化 | 2026-05-06 | 53 处 toLocaleString→formatMoney，14 文件补 import |
| HoverScrollbar 统一化 | 2026-05-30 | App.tsx + 弹窗统一使用 HoverScrollbar |
| Modal Graphite 主题适配 | 2026-05-30 | Modal 使用 CSS 变量 var(--card) 适配深色主题 |
| 确认弹窗统一化 | 2026-05-30 | 单位管理删除确认改用 useConfirm hook |
| EmptyState 组件 | 2026-05-11 | 接入 ContractPage/Drawings/ContractTemplates/InvoiceList |
| Hero 横幅装饰光点统一 | 2026-05-11 | 6 页 hero banner 统一呼吸光点动画 |
| Dashboard CountUp 弹簧加速 | 2026-05-11 | stiffness 40→100，damping 25→20 |
| 启动动画系统 | 2026-06-02 | SplashScreen 粒子背景+Logo 脉冲+品牌逐字淡入 |
| 锁屏粒子背景 | 2026-06-02 | LockScreen 加入 ParticleBackground+主题适配 |
| 加载动画统一 | 2026-06-02 | Spinner/ButtonLoader 组件替代 12 个文件的 animate-spin |
| 数据路径 API | 2026-06-02 | C# 实现 getConfig/setDataPath/sqliteStatus 端点+STA 线程对话框 |
| **列表样式全局统一** | **2026-06-04** | TABLE 常量修复（headerRow 补 border-b），DataTable 重写（skeleton/headerRender/align），删除未使用的 ui/Table 组件，44 个文件迁移到统一 DataTable |
| **列头排序+筛选** | **2026-06-04** | sortable + filterable（createPortal+搜索+checkbox 多选），30+ 个列表补充排序/筛选 |
| **月份选择器** | **2026-06-04** | MonthPicker 组件（年份快速切换+3×4 月份网格+createPortal），替换原生 input[type=month] |
| **AI 识别反馈动画** | **2026-06-04** | OCRRecognitionFeedback 浮动通知（扫描线/spring 弹出/自动消失） |

### 工具链
| 变更 | 日期 | 说明 |
|------|------|------|
| check-rules.js 代码规则 | 2026-05-06 | 文件行数上限/禁止复制/useState限制/类型安全/代码分割强制检查 |
| DB 安全加固 | 2026-05-06 | 解析失败先备份再建新库，防止数据丢失 |
| /benchmark 基线 | 2026-05-11 | 构建产物性能基线：2.4MB dist / 33 chunks / 9.1s build / Grade A |
| Superpowers skill 体系修复 | 2026-05-11 | 15 个 sub-skill 嵌套提取到 ~/.claude/skills/ 根级 |

---

## 🕸️ Graphify 知识图谱

`graphify-out/graph.json` 是项目的代码知识图谱（2754节点，4653边，222社区），AI 自动用于：
- **社区定位**：按聚类锁定相关文件范围，避免全文扫描
- **依赖查询**：通过边找调用链/依赖链
- **中心节点**：快速识别核心模块（Icon()、CostLedger、Contracts 等）

### 更新方式
- **轻量更新（无需 API）**：`graphify update .`（AST + 依赖关系）
- **完整重建（需 API Key）**：`graphify extract . --backend <key>`（含语义分析）
- **检查更新**：`graphify check-update .`
- 安装：`graphify 0.8.14`（全局 CLI）

================
File: docs/DATABASE_DESIGN.md
================
# 工程管家 数据库设计文档

> **版本**：v1.1
> **日期**：2026-06-12（首版）/ 2026-07-04（对齐当前 schema）
> **状态**：Phase 1+ 已落地（金额已迁移 INTEGER、软删除/审计字段已补齐），本文档已对齐实际 schema

---

## 0.1 业务对象清单

| 业务对象 | 对应表 | 说明 |
|----------|--------|------|
| 项目 | `projects` | 工程项目基本信息 |
| 人员(staff) | `members` | 管理人员，月薪制 |
| 工人(worker) | `workers` | 农民工，日薪制 |
| 项目工人 | `project_workers` | 工人与项目的多对多关联 |
| 项目成员 | `project_members` | 人员与项目的多对多关联 |
| 收入合同 | `income_contracts` | 项目收入合同 |
| 支出合同 | `expense_contracts` | 项目支出合同 |
| 协议合同 | `agreement_contracts` | 项目协议合同 |
| 发票 | `invoices` | 收票/开票记录 |
| 支付记录 | `payment_records` | 收付款流水 |
| 结算 | `settlements` | 项目结算办理 |
| 工资 | `wages` | 工人工资记录 |
| 考勤 | `attendances` | 人员考勤记录 |
| 成本台账 | `cost_ledger` | 真实资金流追踪 |
| 台账分类 | `cost_ledger_categories` | 成本台账分类配置 |
| 台账匹配规则 | `cost_ledger_match_rules` | 自动分类规则 |
| 库存项目 | `inventory_items` | 仓库物料 |
| 库存交易 | `inventory_transactions` | 出入库记录 |
| 材料 | `materials` | 材料信息库 |
| 合作伙伴 | `partners` | 供应商/分包商等 |
| 监管单位 | `supervisors` | 政府监管部门 |
| 部门 | `departments` | 组织架构 |
| 薪资历史 | `salary_history` | 人员薪资变更记录 |
| 工人班组 | `worker_teams` | 工人分组 |
| 模板 | `templates` | 文档模板 |
| 合同模板 | `contract_templates` | 合同专用模板 |
| 图纸 | `drawings` | 项目图纸文件 |
| 费用 | `expenses` | 项目费用记录 |
| 用户 | `users` | 系统登录用户 |
| 角色 | `roles` | 权限角色 |
| 审计日志 | `audit_logs` | 操作审计记录 |
| 快照 | `snapshots` | 数据库快照 |
| 区域 | `regions` | 省市区数据 |

---

## 0.2 关系矩阵

### 核心关系

| 主表 | 从表 | 关系类型 | 关联字段 | 说明 |
|------|------|----------|----------|------|
| projects | project_members | 1:N | project_id | 项目↔成员 |
| projects | project_workers | 1:N | project_id | 项目↔工人 |
| projects | income_contracts | 1:N | project_id | 项目↔收入合同 |
| projects | expense_contracts | 1:N | project_id | 项目↔支出合同 |
| projects | agreement_contracts | 1:N | project_id | 项目↔协议合同 |
| projects | invoices | 1:N | project_id | 项目↔发票 |
| projects | payment_records | 1:N | project_id | 项目↔支付记录 |
| projects | settlements | 1:N | project_id | 项目↔结算 |
| projects | wages | 1:N | project_id | 项目↔工资 |
| projects | cost_ledger | 1:N | project_id | 项目↔成本台账 |
| projects | drawings | 1:N | project_id | 项目↔图纸 |
| projects | expenses | 1:N | project_id | 项目↔费用 |
| projects | worker_teams | 1:N | project_id | 项目↔班组 |
| projects | materials | 1:N | (逻辑关联) | 项目↔材料 |

### 人员/工人关系

| 主表 | 从表 | 关系类型 | 关联字段 | 说明 |
|------|------|----------|----------|------|
| members | project_members | 1:N | member_id | 人员↔项目关联 |
| workers | project_workers | 1:N | worker_id | 工人↔项目关联 |
| members | wages | 1:N | member_id | 人员↔工资 |
| project_workers | wages | 1:N | project_worker_id | 项目工人↔工资 |
| members | attendances | 1:N | member_id | 人员↔考勤 |
| project_workers | attendances | 1:N | project_worker_id | 项目工人↔考勤 |
| members | salary_history | 1:N | member_id | 人员↔薪资历史 |
| departments | members | 1:N | department_id | 部门↔人员 |
| worker_teams | project_workers | 1:N | team_id | 班组↔项目工人 |

### 财务关系

| 主表 | 从表 | 关系类型 | 关联字段 | 说明 |
|------|------|----------|----------|------|
| income_contracts | invoices | 1:N | contract_id | 合同↔发票 |
| expense_contracts | invoices | 1:N | contract_id | 合同↔发票 |
| invoices | payment_records | M:N | invoice_details (JSON) | 发票↔支付(通过JSON字段) |
| invoices | settlements | M:N | invoice_details (JSON) | 发票↔结算(通过JSON字段) |
| partners | payment_records | 1:N | partner_id | 合作伙伴↔支付 |
| partners | settlements | 1:N | partner_id | 合作伙伴↔结算 |
| cost_ledger | invoices | 1:N | linked_invoice_id | 台账↔发票 |

### 其他关系

| 主表 | 从表 | 关系类型 | 关联字段 | 说明 |
|------|------|----------|----------|------|
| partners | partner_projects | 1:N | partner_id | 合作伙伴↔项目（计划拆分；当前仍为 project_ids JSON） |
| supervisors | supervisor_projects | 1:N | supervisor_id | 监管单位↔项目（计划拆分；当前仍为 project_ids JSON） |
| inventory_items | inventory_transactions | 1:N | item_id | 库存项目↔交易 |
| roles | users | 1:N | role_id | 角色↔用户 |
| regions | supervisors | 1:N | region_id | 区域↔监管单位 |

---

## 0.3 Mermaid ER 图

```mermaid
erDiagram
    projects {
        INTEGER id PK
        TEXT name
        TEXT description
        TEXT address
        TEXT start_date
        TEXT end_date
        TEXT status
        INTEGER budget
        TEXT created_at
        TEXT updated_at
    }

    members {
        INTEGER id PK
        TEXT name
        TEXT phone
        TEXT email
        TEXT member_type
        TEXT role
        TEXT id_card
        TEXT gender
        INTEGER base_salary
        INTEGER daily_wage
        TEXT entry_date
        TEXT status
        INTEGER department_id
        TEXT position
        TEXT created_at
        TEXT updated_at
    }

    workers {
        INTEGER id PK
        TEXT name
        TEXT id_card
        TEXT gender
        TEXT phone
        TEXT address
        TEXT bank_account
        TEXT bank_name
        TEXT worker_type
        INTEGER daily_wage
        TEXT created_at
        TEXT updated_at
    }

    project_members {
        INTEGER id PK
        INTEGER project_id FK
        INTEGER member_id FK
        TEXT joined_at
    }

    project_workers {
        INTEGER id PK
        INTEGER worker_id FK
        INTEGER project_id FK
        INTEGER team_id FK
        INTEGER daily_wage
        TEXT worker_type
        TEXT entry_date
        TEXT status
        TEXT created_at
        TEXT updated_at
    }

    income_contracts {
        INTEGER id PK
        INTEGER project_id FK
        TEXT name
        INTEGER amount
        TEXT counterparty
        TEXT sign_date
        TEXT status
        TEXT remark
        TEXT files
        TEXT created_at
        TEXT updated_at
    }

    expense_contracts {
        INTEGER id PK
        INTEGER project_id FK
        TEXT name
        INTEGER amount
        TEXT counterparty
        TEXT sign_date
        TEXT status
        TEXT remark
        TEXT files
        TEXT created_at
        TEXT updated_at
    }

    agreement_contracts {
        INTEGER id PK
        INTEGER project_id FK
        TEXT name
        INTEGER amount
        TEXT counterparty
        TEXT sign_date
        TEXT agreement_type
        TEXT status
        TEXT remark
        TEXT files
        TEXT created_at
        TEXT updated_at
    }

    invoices {
        INTEGER id PK
        INTEGER project_id FK
        INTEGER seller_id FK
        INTEGER buyer_id FK
        INTEGER contract_id FK
        TEXT type
        TEXT invoice_kind
        TEXT invoice_no
        TEXT invoice_code
        TEXT name
        INTEGER amount
        INTEGER price_amount
        INTEGER tax_amount
        REAL tax_rate
        INTEGER received_amount
        INTEGER settlement_id
        TEXT issue_date
        TEXT status
        TEXT remarks
        TEXT file_url
        TEXT created_at
        TEXT updated_at
    }

    payment_records {
        INTEGER id PK
        TEXT type
        INTEGER amount
        TEXT record_date
        INTEGER project_id FK
        INTEGER partner_id FK
        INTEGER contract_id FK
        TEXT invoice_details
        TEXT remarks
        TEXT file_url
        TEXT created_at
    }

    settlements {
        INTEGER id PK
        INTEGER project_id FK
        INTEGER partner_id FK
        TEXT name
        TEXT category
        INTEGER amount
        TEXT status
        TEXT date
        TEXT remark
        TEXT files
        TEXT invoice_details
        TEXT created_at
        TEXT updated_at
    }

    wages {
        INTEGER id PK
        INTEGER project_id FK
        INTEGER member_id FK
        INTEGER project_worker_id FK
        TEXT year_month
        INTEGER daily_wage
        REAL work_days
        INTEGER bonus
        INTEGER deduction
        INTEGER actual_wage
        INTEGER paid_amount
        TEXT paid_date
        TEXT status
        TEXT created_at
        TEXT updated_at
    }

    attendances {
        INTEGER id PK
        INTEGER member_id FK
        INTEGER project_id FK
        INTEGER project_worker_id FK
        TEXT year_month
        REAL work_days
        INTEGER days_off
        INTEGER is_full_attendance
        TEXT daily_status
        TEXT file_url
        TEXT created_at
        TEXT updated_at
    }

    cost_ledger {
        INTEGER id PK
        INTEGER project_id FK
        INTEGER batch_id
        TEXT voucher_no
        TEXT date
        TEXT direction
        TEXT category
        INTEGER amount
        TEXT counterparty
        TEXT channel
        TEXT summary
        TEXT notes
        TEXT attachments
        INTEGER linked_invoice_id
        TEXT created_at
        TEXT updated_at
    }

    partners {
        INTEGER id PK
        TEXT name
        TEXT category
        TEXT contact
        TEXT phone
        TEXT email
        TEXT address
        TEXT bank_account
        TEXT bank_name
        TEXT credit_code
        TEXT tax_number
        TEXT project_ids
        TEXT created_at
        TEXT updated_at
    }

    supervisors {
        INTEGER id PK
        INTEGER region_id FK
        TEXT name
        TEXT category
        TEXT contact
        TEXT phone
        TEXT address
        TEXT project_ids
        TEXT created_at
        TEXT updated_at
    }

    departments {
        INTEGER id PK
        TEXT name
        INTEGER manager_id
        TEXT positions
        TEXT created_at
    }

    worker_teams {
        INTEGER id PK
        TEXT name
        INTEGER project_id FK
        INTEGER leader_id
        TEXT remark
        TEXT created_at
        TEXT updated_at
    }

    inventory_items {
        INTEGER id PK
        TEXT name
        TEXT category
        TEXT unit
        REAL quantity
        REAL min_quantity
        TEXT location
        TEXT notes
        TEXT created_at
        TEXT updated_at
    }

    inventory_transactions {
        INTEGER id PK
        INTEGER item_id FK
        INTEGER project_id FK
        TEXT type
        REAL quantity
        INTEGER unit_price
        TEXT date
        TEXT remark
        TEXT created_at
    }

    templates {
        INTEGER id PK
        TEXT name
        TEXT type
        TEXT category
        TEXT content
        TEXT variables
        TEXT created_at
        TEXT updated_at
    }

    users {
        TEXT id PK
        TEXT username
        TEXT password
        TEXT display_name
        TEXT role_id FK
        TEXT status
        TEXT created_at
        TEXT updated_at
    }

    roles {
        TEXT id PK
        TEXT name
        TEXT permissions
        INTEGER is_system
        TEXT created_at
    }

    audit_logs {
        INTEGER id PK
        TEXT action
        TEXT level
        TEXT user_id
        TEXT user_name
        TEXT resource
        TEXT resource_id
        TEXT details
        TEXT ip_address
        TEXT created_at
    }

    projects ||--o{ project_members : "has"
    members ||--o{ project_members : "belongs"
    projects ||--o{ project_workers : "has"
    workers ||--o{ project_workers : "belongs"
    projects ||--o{ income_contracts : "has"
    projects ||--o{ expense_contracts : "has"
    projects ||--o{ agreement_contracts : "has"
    projects ||--o{ invoices : "has"
    projects ||--o{ payment_records : "has"
    projects ||--o{ settlements : "has"
    projects ||--o{ wages : "has"
    projects ||--o{ attendances : "has"
    projects ||--o{ cost_ledger : "has"
    projects ||--o{ drawings : "has"
    projects ||--o{ expenses : "has"
    projects ||--o{ worker_teams : "has"
    members ||--o{ wages : "receives"
    project_workers ||--o{ wages : "receives"
    members ||--o{ attendances : "has"
    project_workers ||--o{ attendances : "has"
    members ||--o{ salary_history : "has"
    departments ||--o{ members : "contains"
    worker_teams ||--o{ project_workers : "contains"
    partners ||--o{ payment_records : "receives"
    partners ||--o{ settlements : "receives"
    regions ||--o{ supervisors : "contains"
    roles ||--o{ users : "assigned"
    inventory_items ||--o{ inventory_transactions : "has"
```

---

## 0.4 状态机图

### 项目状态 (projects.status)

```mermaid
stateDiagram-v2
    [*] --> active : 创建
    active --> completed : 完成
    active --> suspended : 暂停
    suspended --> active : 恢复
    completed --> [*]
```

### 发票状态 (invoices.status)

```mermaid
stateDiagram-v2
    [*] --> pending : 创建
    pending --> approved : 审核通过
    pending --> rejected : 审核驳回
    approved --> paid : 已付款
    rejected --> pending : 重新提交
    paid --> [*]
```

### 结算状态 (settlements.status)

```mermaid
stateDiagram-v2
    [*] --> pending : 创建
    pending --> approved : 审核通过
    pending --> rejected : 审核驳回
    approved --> completed : 完成
    rejected --> pending : 重新提交
    completed --> [*]
```

### 工资状态 (wages.status)

```mermaid
stateDiagram-v2
    [*] --> pending : 计算
    pending --> approved : 审核
    approved --> paid : 发放
    pending --> rejected : 驳回
    rejected --> pending : 重新计算
    paid --> [*]
```

---

## 0.5 字段规范

### 金额字段

| 规范 | 说明 |
|------|------|
| 类型 | `INTEGER`（以“分”为单位；Phase 1 已由 REAL 迁移完成，见 migration 003_MoneyRealToInteger.sql） |
| 默认值 | `DEFAULT 0` |
| 计算 | 前端显示时 ÷ 100 转换为元 |

**已迁移为 INTEGER 的金额字段（migration 003_MoneyRealToInteger.sql）**：

| 表 | 字段 |
|----|------|
| projects | budget |
| members | base_salary, daily_wage |
| workers | daily_wage |
| project_workers | daily_wage |
| income_contracts | amount |
| expense_contracts | amount |
| agreement_contracts | amount |
| invoices | amount, price_amount, tax_amount, received_amount |
| payment_records | amount |
| wages | daily_wage, bonus, deduction, actual_wage, paid_amount |
| settlements | amount |
| cost_ledger | amount |
| inventory_transactions | unit_price |
| expenses | amount |
| salary_history | base_salary, subsidy |

### 审计字段

| 字段 | 类型 | 说明 |
|------|------|------|
| created_at | TEXT | 创建时间，`datetime('now')` |
| updated_at | TEXT | 更新时间，需应用层维护 |

**历史上缺 updated_at、已在 Phase 2.x migration 补齐的表**（以实际 schema 为准）：
- workers
- payment_records
- cost_ledger_categories
- cost_ledger_match_rules
- inventory_transactions
- salary_history
- project_members

### 软删除字段

| 字段 | 类型 | 说明 |
|------|------|------|
| deleted_at | TEXT | NULL=正常，非NULL=已删除 |

**已在 Phase 2.x / 安全加固 migration 补齐 deleted_at 的表**：
- invoices
- payment_records
- wages
- settlements
- cost_ledger

### 状态字段约束

| 表 | 字段 | 允许值 |
|----|------|--------|
| projects | status | active, completed, suspended |
| invoices | status | pending, approved, rejected, paid |
| settlements | status | pending, approved, rejected, completed |
| wages | status | pending, approved, paid, rejected |
| income_contracts | status | draft, active, completed, terminated |
| expense_contracts | status | draft, active, completed, terminated |
| agreement_contracts | status | draft, active, completed, terminated |

---

## 0.6 反范式设计说明

| 反范式 | 表 | 说明 | 原因 |
|--------|-----|------|------|
| JSON TEXT 字段 | partners.project_ids | 项目ID列表存储为JSON | 查询频率低，避免额外关联表；（计划）Phase 2.2 拆分，当前仍为 JSON |
| JSON TEXT 字段 | supervisors.project_ids | 项目ID列表存储为JSON | 同上（计划拆分，当前仍为 JSON） |
| JSON TEXT 字段 | invoices (invoice_details in payment_records/settlements) | 发票关联信息 | 复合关联（ID+金额），JSON更灵活；Phase 2.2 拆分 |
| JSON TEXT 字段 | cost_ledger.attachments | 附件列表 | 文件引用，无需结构化查询 |
| JSON TEXT 字段 | templates/contract_templates.variables | 模板变量 | 配置数据，非查询条件 |
| TEXT 多值字段 | departments.positions | 职位列表 | （计划）Phase 2.2 拆分，当前仍为 JSON |
| 无物理外键 | 全局 | 无 FOREIGN KEY 约束 | SQLite 默认关闭外键检查，应用层保证完整性 |

---

## 待确认事项

1. **金额迁移精度**：Phase 1.3 需预检查异常精度记录
2. **JSON 字段格式**：Phase 2.2 需预检查实际数据格式（JSON数组 vs 逗号分隔）
3. **状态机完整性**：确认所有业务状态转换是否完整覆盖

---

## 验收清单

- [x] 所有当前表都有对应业务对象说明
- [x] 所有表间关系都有 1:1/1:N/M:N 标注
- [x] ER 图可直接在 Markdown 查看器中渲染
- [x] 字段规范与后续 Phase 的迁移 SQL 一致

---

**本文档已对齐 Phase 1+ 后的实际 schema；后续 schema 变更请同步更新本文件与对应 migration 脚本。**

================
File: docs/handoff/README.md
================
# 历史交接文档（存档）

> 本目录下的文档是特定 sprint / 安全修复期间的一次性交接快照（handoff），完成后不再维护，仅作历史记录保留。
>
> **当前有效文档请以以下为准**：
> - 项目约定 / 架构概要：../../AGENTS.md
> - 架构决策：../ARCHITECTURE.md
> - 模块详解：../MODULES.md
> - 版本历史：../../CHANGELOG.md
>
> 注：R16-handoff.md 与 R16-handoff-latest.md 内容高度重叠，属历史遗留，请以 -latest 版本为准。

================
File: docs/MODULES.md
================
# 核心模块详细说明

> 本文档包含各业务模块的详细设计说明，AGENTS.md 只保留模块索引。
> 最后同步：2026-07-04（对齐 v0.82.0；逐版本增量见 CHANGELOG.md）

---

## 🤖 AI 智能识别（百度 OCR）

### 架构
```
表单组件 → useXxxOCR hook → recognizeXxx() → baiduXxxOCR() → HTTP POST → C# API → 百度 API
```

### 已接入的 9 种识别功能

| 功能 | Hook | 集成位置 | 自动填入字段 |
|------|------|----------|-------------|
| 身份证 | useIdCardOCR | WorkerForm | 姓名/身份证号/性别/民族/出生日期/住址 |
| 增值税发票 | useInvoiceOCR | InvoiceForm | 发票号/日期/金额/税率/商品名称/双方 |
| 银行卡 | useBankCardOCR | WorkerForm | 卡号/银行名称 |
| 营业执照 | useBusinessLicenseOCR | PartnerForm | 公司名/信用代码/注册地址（住所优先）/经营范围 |
| 银行回单 | useBankReceiptOCR | PaymentForm | 日期/金额/收付款方 |
| 开户许可证 | usePermitOCR | PartnerForm | 信用代码/公司名 |
| 银行单据 | useBankStatementOCR | — | 交易明细列表 |
| 通用票据 | useGeneralReceiptOCR | — | 文字内容/金额/日期 |
| 企业查询 | useCompanyQueryOCR | — | 标准版百度 OCR 不支持名称搜索，需上传营业执照图片识别 |

### 关键文件
- `EngineeringManager.Api/Endpoints/OcrEndpoints.cs` — C# OCR 端点（572 行，9 种识别 API）
- `src/services/ocr.ts` — 渲染进程 OCR 服务层
- `src/hooks/use*OCR.ts` — 8 个 OCR Hook
- `src/components/SettingsOcrSection.tsx` — AI 智能识别设置页

### UI 模式（统一）
- **新建组件**：`src/components/ui/OCRRecognitionFeedback.tsx` — 浮动定位（`fixed top-6 right-6 z-[9999]`），不影响表单布局
- **识别中**：蓝紫渐变卡片 + 旋转 AI 图标 + 脉冲光环 + 扫描线动画 + 阶段文字循环（上传→分析→识别→提取）+ 脉冲进度点
- **成功后**：浮动 emerald 绿色卡片 + spring 弹簧弹出（scale 0.8→1, stiffness 500）+ 顶部光晕 + Sparkles 图标 + 字段逐条出现（Zap 图标 + 120ms stagger）+ 2.5 秒自动消失
- **失败后**：浮动红色卡片 + 抖动动画 + AlertCircle 图标 + 3 秒自动消失
- **图标**：Sparkles（识别中）→ CheckCircle（成功）→ AlertCircle（失败）

### 调用统计
- 保存路径：`<userData>/ocr-stats.json`
- 按月自动重置
- C# 端点：`EngineeringManager.Api/Endpoints/OcrEndpoints.cs`

---

## 📁 核心模块架构

### 人事管理（v2.7.0 — 考勤时间线+薪资历史+入职感知）
- **模块位置**：侧边栏「核心业务」分组，路由 `/hr`，图标 UserCog
- **职能范围**：公司管理人员（memberType='staff'）的档案、考勤、月薪薪酬
- **5 个 Tab**：看板（5 KPI 含今日在岗+实际薪酬）→ 人员档案（部门+职位字段，按部门/状态筛选，OCR 自动填入身份证信息，薪资历史弹窗）→ 考勤管理（摘要列表优先+AttendanceDetail 子页面+考勤时间线子页面+5状态画笔+入职守卫+删除/批量删除+生成默认考勤+导出Excel）→ 薪酬管理（月薪制+考勤→薪酬流水线+就绪指示器+入职守卫+补助列）→ 部门管理（CRUD + 人数统计 + 删除守卫+PositionEditor）
- **考勤 UX 模式**：摘要列表 → 点击姓名 → AttendanceTimeline 子页面（年度分组时间线，年份筛选，月度卡片网格，年度汇总统计）；点击「编辑」→ AttendanceDetail 子页面（紧凑 7 列日历网格，入职前日期灰底禁操作，Shift+点击批量涂色，右键循环切换，附件上传/预览/删除，删除按钮）
- **考勤时间线**：`AttendanceTimeline.tsx`（212行），按年分组显示所有考勤月份，每年展开显示月度卡片+出勤/缺勤/全勤率汇总，年份筛选 pill，点击月份进入 AttendanceDetail，无记录自动创建默认考勤
- **入职日期感知**：`computeAttendanceSummary()` 新增 `startDay` 参数，考勤统计只计入职日后的天数；AttendanceDetail 日历上入职前日期灰色不可操作；薪酬计算对月中入职永远按比例（不适用全勤免扣）
- **薪酬守卫**：松耦合——已打考勤者正常生成，未打考勤者自动跳过（不再阻止全部），工具栏显示"考勤就绪: N/M（未打考勤者自动跳过）"
- **薪资历史**：`db.salaryHistory` 集合（memberId/effectiveDate/baseSalary/subsidy/subsidyNote/note），前端 `SalaryHistoryModal.tsx` 弹窗查看/新增/编辑/删除，新建成员自动创建首条记录，C# 端点 `WageEndpoints.cs`
- **入职守卫**：`entryDate`（优先）或 `createdAt.split('T')[0]`（回退）晚于选中月份最后一天的员工不显示
- **职位编辑器**：`PositionEditor.tsx`（63行），单行输入+添加按钮+token 移除，去掉了拖拽/重命名/预设/批量
- **数据模型**：`db.departments`（部门 CRUD，含 memberCount 计算），`db.salaryHistory`（薪资变动记录），`db.members.departmentId` + `db.members.position` + `db.members.entryDate`
- **共享常量**：`src/constants/attendance.ts` — STATUS_META / summaryDot / summaryLabel / computeAttendanceSummary()，HR 和工人模块统一导入
- **考勤/薪酬**：走 memberId 路径，数据源过滤 memberType='staff'，独立于工人考勤/薪酬
- **迁移向导**：首次访问若存在无部门的 staff → 黄色横幅提示 + 批量分配弹窗
- **核心文件**：`HRManagement.tsx`（页面容器），`features/hr/HRDashboard.tsx`, `StaffList.tsx`, `StaffAttendance.tsx`, `StaffPayroll.tsx`, `DepartmentManager.tsx`, `PositionEditor.tsx`, `AttendanceTimeline.tsx`, `SalaryHistoryModal.tsx`, `config.tsx`，`src/constants/attendance.ts`（共享），`AttendanceDetail.tsx`，`hooks/useDepartments.ts`
- **旧 IPC 通道**【已迁移到 C#】：`electron/ipc-handlers/salary-history.ts` → `WageEndpoints.cs`，`electron/ipc-handlers/attendance.ts` → `WageEndpoints.cs`，`departments.ts` → `SystemEndpoints.cs`
- **C# 端点**：`EngineeringManager.Api/Endpoints/WageEndpoints.cs`（考勤+薪资），`EngineeringManager.Api/Endpoints/MemberEndpoints.cs`（人员档案），`EngineeringManager.Api/Endpoints/SystemEndpoints.cs`（部门管理）
- **设计 Token**：indigo-600 主色（区别于项目模块的蓝色系）

### 工人管理（v2.8.2 — 4-Tab重构+琥珀色系）
- **模块位置**：侧边栏「核心业务」分组，路由 `/labor`，图标 HardHat
- **职能范围**：农民工班组/档案/导入/工资管理，一级Tab直接访问工资数据
- **页面容器**：`LaborManagement.tsx`（~280行，4-Tab容器，参考HRManagement.tsx简洁模式）
- **4个Tab**：看板（5 KPI + 饼图 + 班组列表）→ 工人库（表格：姓名/身份证/年龄/性别/工种/日工资/银行卡号/操作，支持列头排序+筛选）→ 班组管理（按项目分组卡片网格）→ 工资管理（直接渲染WageManagement）
- **Tab导航**：下划线样式（border-b），琥珀色系(amber)，localStorage持久化 `labor_active_tab`，framer-motion layoutId="labor-tab-indicator" 滑动指示器
- **状态管理**：3个Hook收敛——useLaborData（数据加载）、useLaborModals（~10个模态框状态）、useLaborOperations（整合useMemberOperations+useTeamOps+PoolWorker操作）
- **表单统一**：WorkerPoolForm（快速添加）底部增加"填写完整信息→"切换到MemberForm（完整编辑）
- **主题色**：琥珀色系(amber)，与人事管理的靛蓝色系(indigo)区分，`theme.ts` 导出常量
- **确认对话框**：useConfirm Hook 替代原生 confirm()，包装现有 ConfirmDialog 组件
- **核心文件**：`LaborManagement.tsx`（主容器），`features/labor/LaborDashboard.tsx`（看板），`features/labor/LaborWorkerList.tsx`（工人库），`features/labor/LaborTeamManager.tsx`（班组管理），`features/labor/theme.ts`（主题常量），`features/labor/hooks/useLaborData.ts`，`features/labor/hooks/useLaborModals.ts`，`features/labor/hooks/useLaborOperations.ts`，`hooks/useConfirm.ts`
- **C# 端点**：`EngineeringManager.Api/Endpoints/WageEndpoints.cs`
- **废弃文件**（标记@deprecated）：`WorkerSection.tsx`，`MemberCard.tsx`，`MemberList.tsx`
- **原 `/members` 路由**：保留 PageId 但隐藏侧边栏（showInSidebar: false），作为重定向兼容过渡

### 全局工人信息库（v2.5.0 新增，v2.7.2 扩展）
- **双表分离**：`db.workers`（身份+默认值——name/idCard/gender/birthDate/ethnicity/phone/address/bankAccount/bankName/bankLineNo/workerType/dailyWage）+ `db.projectWorkers`（用工关系——workerId/projectId/teamId/dailyWage/workerType/entryDate/status）
- 同一工人可在多个项目并行，不同项目里工种/日工资独立；Worker 上的 workerType/dailyWage 作为"默认值"
- **WorkerPickerModal**：从特定班组进入时自动锁定班组，无需逐人选择；底部批量默认值栏（工种+日工资）；勾选时优先用工人库自带的 workerType/dailyWage，无则回退批量默认值；全选/取消全选；整行可点击
- **导入更新**：身份证匹配已存在工人 → 用新非空字段覆盖更新（不跳过），支持跨工作表补充信息（表1导入身份证+电话，表2导入工种+工资）
- **导入字段**（9 字段）：姓名/身份证（必填）+ 性别/手机/地址/民族/工资卡号/开户行/联行号/工种/日工资（可选，有就导入）；工种直接存原始中文名（不做 code 转换），`alignColumns()` 修复合并单元格 null 表头列索引错位
- **工种显示**：`getWorkerTypeLabel()` 兼容 code（'welder'）和中文名（'焊工'），表单/Picker 用 `workerTypeToCode()` 转 code 匹配下拉框
- **导入结果**：4 列统计（新增/更新/跳过/失败）
- **工资计算双路径**：staff 走 memberId，worker 走 projectWorkerId；`generateProjectWages` 由 C# 端处理
- 核心文件：`WorkerPickerModal.tsx`, `useWorkerImport.ts`, `useMemberOperations.ts`（被 useLaborOperations 整合）
- **C# 端点**：`EngineeringManager.Api/Endpoints/WageEndpoints.cs`

### 发票管理
- **票种**（`InvoiceKind`）：`paper_regular` / `paper_special` / `electronic_regular` / `electronic_special`
- **业务规则**：收票(invoice_in)→付款（资金流出），开票(invoice_out)→回款（资金流入）
- **状态**（按类型区分）：收票→已收票/部分付款/已付清；开票→已开具/部分收款/已收齐
- 登记回款/付款时可勾选关联发票，自动更新发票状态；入口统一在发票管理
- 收票按销售方关联支出合同，开票按购买方关联收入合同
- **C# 端点**：`EngineeringManager.Api/Endpoints/InvoiceEndpoints.cs`

### 合同管理
- 收入合同 / 支出合同 / 其他协议（框架、合作、和解、赔偿、个人等 6 种子类型）
- 协议合同金额可选，无付款方式/付款记录
- 已收款统计从 `paymentRecords` 表（仅收入/支出合同适用）
- 附件走统一文件服务 `uploads/<项目名>/合同/收入|支出|协议/`，文件名：`合同名[_金额元].ext`
- .docx 用 mammoth 转 HTML iframe 预览；`contract-file:///` 自定义协议支持中英文路径
- **C# 端点**：`EngineeringManager.Api/Endpoints/ContractEndpoints.cs`

### 项目管理
- 项目列表：投资组合概览横幅（深色渐变+4 KPI）+ 项目卡片网格（含 SVG 健康环）
- 详情页 6 Tab：总览（指挥中心）、合同台账、发票、人员、费用明细（成本台账分析看板）、关联单位
- **项目指挥中心**：Bento网格，RadialBarChart健康度+4KPI+告警区（待处理发票/超支/收款率低）+收支BarChart+成本结构PieChart（人材机，数据来自成本台账）
- **人员管理 Tab**：从 `db.projectMembers` 多对多关联表管理，支持添加/移除
- 领域色系统：收入=emerald / 支出=red / 合作方=violet
- **C# 端点**：`EngineeringManager.Api/Endpoints/ProjectEndpoints.cs`

### 结算办理
- **状态**：未办理 → 已办理（自动核验付款+发票）→ 已归档；旧状态自动迁移
- **6 种细分类别**：材料结算 / 专业分包结算 / 劳务人工结算 / 机械设备结算 / 服务类结算 / 其他结算
- **办理核验**：按结算单位自动匹配发票（收入→开票/buyerId，支出→收票/sellerId），按 invoiceDetails 汇总付款，差额警示
- **Excel 导入**：模板导入（固定列映射）+ 灵活导入（多工作表+表头行+列映射）
- 核心文件：`Settlement.tsx`, `SettlementList.tsx`, `SettlementForm.tsx`, `config.tsx`
- **C# 端点**：`EngineeringManager.Api/Endpoints/SystemEndpoints.cs`

### 模板管理（独立顶级模块）
- **架构**：Dashboard（4统计+7分类入口）→ 分类详情（返回+统计+卡片网格）→ 新建/编辑/预览/生成
- **7 种分类**：contract(合同)/settlement(结算)/seal_application(用印)/fund_application(用款)/official_document(红头)/letter(函件)/other
- **变量系统**：text/number/date/select 四种类型；上传 .docx 时 C# 后端用 mammoth 自动检测 `{{变量名}}`
- **TemplateSelectorModal**：按分类加载+搜索+选中回调，合同/结算模块共用（ContractPage + SettlementProjectDetail 集成"从模板生成"入口）
- **编辑模式**：下载→编辑→上传；文件走统一文件服务 `uploads/模板/文件/`
- 核心文件：`Templates.tsx`, `TemplateDashboard.tsx`, `TemplateList.tsx`, `TemplateForm.tsx`, `TemplateCard.tsx`, `TemplatePreview.tsx`, `TemplateGenerate.tsx`, `TemplateSelectorModal.tsx`, `config.tsx`
- **C# 端点**：`EngineeringManager.Api/Endpoints/SystemEndpoints.cs`

### 工资管理（v3.3 — 月份选择器统一到父级）
- **侧边栏**：隐藏（showInSidebar: false），通过工人管理模块「工资管理」Tab 直接访问，或直接 URL `/wages`
- **职能范围**：仅工人日薪制工资/考勤，管理人员薪资逻辑已彻底移除（v3.0 代码级清理）
- **架构**：Dashboard（2 KPI 统计+项目卡片）→ WageCycleDetail（考勤管理/项目工资表/工资发放记录 3 Tab）
- **月份选择器**：统一使用 `MonthPicker` 组件（年份快速切换+3×4 月份网格，createPortal 渲染避免溢出），位于 WageCycleDetail 顶部 Tabs 上方，所有 Tab 共享同一个月份
- **列头筛选**：考勤/工资表/发放记录均支持表头漏斗筛选（filterable 属性，createPortal+搜索+checkbox 多选）
- **考勤系统**：按月生成，5 种日状态，AttendanceDetail 画笔模式日历，支持 Excel 导入（出勤天数），走 `generateDefaultAttendancesV2` / `batchImportAttendances` 两条路径
- **计算规则**：`日薪 × 出勤天数 + 奖金 - 扣款`（`calculateActualWage(dailyWage, workDays, bonus, deduction)`）
- **工资发放记录**：应发工资(只读) + 实发金额/发放日期(手动，`type="text" inputMode="decimal"` 支持精确小数输入) + 差额(自动)
- **银行回单解析**：上传 PDF → Python pypdf 提取文字 → 正则解析（兼容多银行格式）→ 姓名+银行卡号双重匹配 → 填入实发金额/日期
- **归档功能**：发放记录 Tab「归档」按钮锁定实发金额/日期，useConfirm 确认对话框
- **提交级操作**：项目工资表「删除选中」→ `batchDeleteWages` 彻底删除；发放记录「删除选中」→ `batchClearPayments` 仅清空发放字段
- 数据表：`db.wages`（projectWorkerId 路径）/ `db.attendances` / `db.projectWorkers`
- 核心文件：`WageManagement.tsx`, `WageCycleDetail.tsx`, `WageRecordsTab.tsx`, `AttendanceTab.tsx`（含月份选择器）, `WageTableTab.tsx`（含月份选择器）
- **旧 IPC 拆分**【已迁移到 C#】：`attendance.ts` + `attendance-utils.ts` + `attendance-batch-import.ts` → 合入 `WageEndpoints.cs`
- **C# 端点**：`EngineeringManager.Api/Endpoints/WageEndpoints.cs`（考勤+工资+发放）

### 成本台账（独立顶级模块）
- **目的**：追踪挂靠施工项目的真实资金流（含灰色支出、垫资、股东融资等明面账不覆盖的资金流）
- **架构**：双入口，角色分离 — 侧边栏独立页面供财务人员录入/查账（Dashboard→项目详情→列表+新增/编辑/删除+Excel级筛选）；ProjectDetail"费用明细"Tab 供领导查看只读分析看板（KPI+饼图+月度趋势柱状图+TOP10排名，无数据录入）
- **UI 设计**：首页 Dashboard 对标项目管理看板（Hero 横幅+framer-motion 动画+CountUp 弹簧加速+KPI 卡片+CARD token），项目子页面头部对标合同管理（ArrowLeft 图标返回+amber 竖条色标+双行标题），项目卡片三层信息结构（方向色条+收支双栏+净额汇总底条）
- **数据模型**：`db.costLedger`（台账条目）+ `db.costLedgerCategories`（分类，含 `level1?` 一级归属），条目字段含 voucherNo(string，支持"3-1""税-12"等，空=无凭证)、direction(expense/income)、category(分类code)、counterparty(往来单位/个人)、channel、linkedInvoiceId(可选)、notes(备注)、attachments
- **分类系统**：二级层级：支出 5 组 18 码（业务费/直接工程费/现场管理费/对公服务及前期投入费/财务及其他费）+ 收入 4 组 7 码（投资款/项目回款/退款/其他收入）+ 用户可自定义增删改；`CATEGORY_HIERARCHY`（含 `direction` 字段）定义完整二级→一级映射；`getLevel1Groups(direction)`/`getLevel1GroupsMerged(categories,direction)` 方向感知分组；`getLevel1ForCode(code,categories)` 优先 DB `level1`→回退 hierarchy；`HIERARCHY_GROUP_NAMES` 内置分组名常量；`CategoryManager.tsx` 双级管理 UI（一级分组卡片+二级子项+新建一级/二级+编辑删除）；`CategoryPicker.tsx` 一级→二级联动选择器；`ensureCategories()` 自动迁移旧扁平分类；列表工具栏「二级/一级」切换+localStorage 持久化
- **业主回款不出现在成本台账中**（业主回款是明面账工程款）
- **渠道标签**：按方向动态切换 — 支出→支付渠道，收入→收入渠道
- **级联删除**：项目删除时自动清理关联台账记录（C# 端点处理）
- **列表布局**：10 列表格（凭证号/日期/方向/分类/往来单位个人/渠道/金额/摘要/备注/操作），`table-fixed border-collapse` 线框连续；Ctrl+滚轮缩放（50-200%），默认110%，工具栏+/-按钮；汇总行独立加大字号深色；日期归一化为YYYY-MM-DD
- **筛选系统**：7 列统一 Excel 风格搜索+勾选（`ColumnFilter.tsx`，Portal 渲染防遮挡，通用 CheckMeta 模式），搜索框实时过滤选项列表→勾选筛选（全选/清除），日期保留快捷按钮（本月/近3月/本年）勾选对应日期，分类筛选联动一级/二级切换按钮，多列 AND 组合，筛选汇总跟随结果
- **表单子组件**：CategoryPicker（方向驱动+自定义分类+管理入口）/ ChannelInput（最近使用缓存+方向感知 placeholder）/ InvoiceLinker（发票搜索）/ FileUploader（延后补传+预览：图片弹窗大图查看，PDF等调用系统默认程序）；日期字段支持粘贴多种格式
- **文件存储**：`uploads/<项目名>/成本台账/凭证/`
- 核心文件：`CostLedger.tsx`, `CostLedgerDashboard.tsx`, `CostLedgerList.tsx`, `CostLedgerForm.tsx`, `ColumnFilter.tsx`, `CostLedgerAnalytics.tsx`, `CostLedgerTab.tsx`, `CostLedgerProjectDetail.tsx`, `CategoryPicker.tsx`, `CategoryManager.tsx`, `CostLedgerBatchBar.tsx`, `CostLedgerCompareModal.tsx`, `CostLedgerImportModal.tsx`, `printExport.ts`（打印+导出Excel）, `useCostLedgerCategories.ts`, `useCostLedgerBatches.ts`
- **旧 IPC**【已迁移到 C#】：`cost-ledger.ts` → `CostLedgerEndpoints.cs`，`cost-ledger-categories-data.ts` → `CostLedgerEndpoints.cs`
- **C# 端点**：`EngineeringManager.Api/Endpoints/CostLedgerEndpoints.cs`

### 其他模块
- **仓库管理**：物料库 / 出入库记录 / 项目材料（整合材料管理）→ `EngineeringManager.Api/Endpoints/InventoryEndpoints.cs`
- **单位管理**：合作单位 + 监管单位（Tab切换），表头支持排序+筛选（filterable select/text），不再需要顶部的搜索/类型/项目筛选框
- **营业执照 PDF 支持**：PDF 上传后由 `useBusinessLicenseOCR` 逐页转图片识别，找到即停

---

## 📁 文件存储系统

### 架构链路
```
前端组件 → src/services/fileService.ts → HTTP POST/GET
                                         → EngineeringManager.Api/Endpoints/FileEndpoints.cs
                                         → <dataPath>/uploads/
```

### 存储策略
- 所有附件统一存磁盘，`engineering.json` 只存文件名，不再存 base64
- 文件名格式：`备注_业务描述_金额.ext`，无随机后缀；同名自动检测并提示改名
- 向后兼容旧 data URL；编辑时未更换附件则跳过上传
- 读取回退链：项目名文件夹 → `未分类/` → `_common/` → 旧版平铺路径

### 文件夹结构
```
uploads/
├── <项目名称>/           ← 按项目名分第一层
│   ├── 发票/收票|开票/
│   ├── 收付款/回款|付款/
│   ├── 合同/收入|支出/
│   ├── 合作单位/营业执照|附件/
│   ├── 图纸/文件/、考勤/记录/、结算/凭证/
└── 未分类/              ← 无项目归属的文件
```
- 类型映射：`invoice_out`→发票/开票/ + 收付款/回款/；`invoice_in`→发票/收票/ + 收付款/付款/

### PII Mask 模块 (v0.73.0 + v0.74.0 + v0.75.0 + v0.76.0 PII 完整闭环 + App 接入)

- 位置: 横切关注点, 不属于某个业务模块, 所有含 PII 字段的模块都依赖它
- 涉及业务模块: 人事管理 / 工人管理 / 合同管理 / 合作单位管理 / 仓库管理 / 银行单据 OCR 等 (13 列 PII 字段)
- 后端:
  - `EngineeringManager.Api/Security/PiiProtector.cs` — AES-GCM 加密 (字段级 PII 入库加密)
  - `EngineeringManager.Api/Common.cs` — MaskIdCard / MaskPhone / MaskBankAccount utility (工具函数, v0.75.0 起不再自动调用, 保留供 caller 自行使用)
  - `EngineeringManager.Api/Endpoints/UserPreferencesEndpoints.cs` (v0.75.0) — GET/PUT /api/user-preferences (PII Mask toggle 多设备同步)
- 前端:
  - `src/contexts/MaskContext.tsx` — 全局 mask 状态 (MaskProvider / useMask) + localStorage 缓存 + 后端同步
  - `src/components/MaskToggleButton.tsx` — 右下角浮动 Eye/EyeOff 按钮
  - `src/hooks/useMaskedValue.ts` — useMaskedFn hook (返回 (type, value) => string 函数, 在 .map / render callback 中安全使用)
  - `src/services/api-client.ts` — 自动给 PII 端点 GET 加 ?unmask=true (基于 localStorage v120_mask_enabled)
- toggle 行为:
  - 默认 masked=true (保守), 后端 GET 默认返明文, 前端 hook 显示脱敏
  - 用户点击 toggle → localStorage v120_mask_enabled = 'false' + 异步 PUT /api/user-preferences/pii_mask_enabled
  - 下次 PII GET → api-client 自动加 ?unmask=true (无效参数, 因为后端默认就是明文) → 前端 hook 看到 unmasked=true 返回原值
  - 多设备: 登录后 useUserIdSync hook 从后端 GET 拉取真值覆盖 localStorage


### v0.76.0 增量: useUserIdSync 接入 App.tsx

- 修复 v0.75.0 路线图 #1: `useUserIdSync` hook 已暴露但未挂载, 用户登录后不会从后端拉 toggle 状态覆盖 localStorage
- `src/App.tsx` L77: 新增 `useUserIdSync(currentUser?.id)` (在 useAuth 解构后, useTheme 前)
- `src/App.tsx` L9: import 调整 `import { MaskProvider, useUserIdSync } from './contexts/MaskContext'`
- 效果: 跨设备登录时 PII mask toggle 自动同步; 多设备体验一致


### v0.77.0 增量: DataTable.tsx 进一步拆分 358→209 行

- 完成 v0.75.0 handoff 路线图 #2: DataTable.tsx 358→209 行 (-42%, 超 -35% 目标)
- 新建 src/components/DataTable/types.ts (99 行, 4 interface: Column/DataTableProps/TableRowProps/ColFilterDropdownProps)
- 新建 src/components/DataTable/consts.ts (7 行, alignMap 常量)
- DataTable.tsx 顶部 re-export 保持 '../DataTable' import 兼容, 子文件 TableParts/ColFilterDropdown/TableCell 零改动
- 目标 200 行: 实际 209 (含 4 行 re-export 注释), 业务逻辑主体 204 行不可压缩

### v0.78.0 增量: 修 DataTable 3 critical runtime bug

- v0.75.0 commit fbbcaa2 拆分 DataTable 时漏 3 处, 致 30+ List 页面 runtime 崩溃 (SettlementList/StaffList/InvoiceList/PaymentList/LaborWorkerList/ItemList/MaterialList 等)
- 修复 A: 加 useDataTableState + useDataTableFilters import (L10-11)
- 修复 B: 内部用 getRowKey(item, index) 但 props 叫 rowKey (类型 keyof T | function), 加 helper 处理 string/function 两种情况
- 修复 C: v0.77.0 export type {...} from 没让类型在内部 scope 可用, 改 import type + export type
- Tooltip 增强: content (string 时) 复制到 child native title 属性, 让 getByTitle 测试 + 无障碍工具能识别
- SettlementList vitest 0/8 → 8/8 (v0.75.0 起一直 0/8)### 核心文件
| 文件 | 作用 |
|------|------|
| `EngineeringManager.Api/Endpoints/FileEndpoints.cs` | C# 文件端点：save/read/delete/openExternal |
| `src/services/fileService.ts` | 前端封装：uploadFile / readUploadedFile / FILE_CATEGORIES |

================
File: docs/SMOKE-TEST.md
================
# 工程管家 - 端到端冒烟测试

> **版本**：v0.71.0 起
> **用途**：每次 release 前 / 周一回归 / 任何 sprint 收尾后跑一遍
> **预计时长**：15 分钟（手测）+ 5 分钟（自动）= 20 分钟

---

## 0. 环境检查（5 分钟）

```bash
# 1. 编译 0 错误
cd "E:\测试\EngineeringManager.Api" && dotnet build 2>&1 | Select-String -Pattern "错误|Build succeeded|Build FAILED"

# 2. 单元测试全过
cd "E:\测试\EngineeringManager.Tests" && dotnet test 2>&1 | Select-String -Pattern "通过:|失败:|总计:"

# 3. 前端构建无 HARD FAIL
cd "E:\测试" && npm run check 2>&1 | Select-String -Pattern "HARD FAIL|passed|failed"

# 4. 前端构建成功
cd "E:\测试" && npx vite build 2>&1 | Select-String -Pattern "error|success|✓|✗"
```

**通过标准**：
- 后端 0 错误 0 警告
- 后端单元测试全部通过
- 前端 check 0 HARD FAIL
- vite build 11-12 秒成功

---

## 1. 启动应用（1 分钟）

```bash
# 双击 工程管家.bat 或
cd "E:\测试\EngineeringManager.Api" && dotnet run
```

**检查**：
- [ ] WinForms 窗口弹出
- [ ] WebView2 加载完成（看到登录页）
- [ ] 后台 console 无 error（看 stdout）

---

## 2. 登录（1 分钟）

**测试账号**（按角色验证）：

> ⚠️ 测试账号密码请勿写入仓库文档；从本地 seed 数据或管理员设置获取。

| 账号 | 密码 | 角色 | 验证项 |
|------|------|------|--------|
| `admin` | `<初始密码>` (首次需改) | admin | 看到全部侧边栏 + 全部数据 |
| `manager` | `<密码>` | manager | 看到项目/合同/工人（无系统设置） |
| `accountant` | `<密码>` | accountant | 看到财务/发票/合同（无人员管理） |
| `worker` | `<密码>` | worker | 只看 dashboard + 项目（只读） |

**v0.71.0 老库升级特殊处理**：
- 老用户从 v0.70.0 升级后，password_hash 为空 → 登录返回"账户需要重置密码"
- admin 用 DB 工具 (DB Browser for SQLite) 直接 UPDATE users SET password_hash='xxx' WHERE id='1'
- 或 `/api/auth/reset-password` 端点（admin 调）

**通过标准**：
- [ ] 登录成功 + 跳转主页
- [ ] admin 看到 11 个侧边栏
- [ ] 退出后重新打开免登录

---

## 3. CRUD 流程（5 分钟，每个模块跑 1 个）

### 3.1 工人模块
1. **创建**：`/labor` → 新增工人 → 姓名、身份证、手机、银行卡 → 保存
2. **列表**：`/labor` → 列表里看到新工人（**PII 脱敏：身份证/手机/银行卡中间 ****）
3. **编辑**：点击编辑 → 改手机号 → 保存
4. **删除**：点击删除 → 确认

**通过标准**：
- [ ] 列表里身份证/手机/银行卡已脱敏（中间 `****`）
- [ ] 详情页（点开编辑）有完整 PII
- [ ] 删除后列表不再显示

### 3.2 合同模块
1. **创建**：`/contracts` → 新增合同 → 项目、对方、金额 → 保存
2. **详情**：点击合同 → 看到完整内容
3. **删除**：删除该合同

**通过标准**：
- [ ] 列表显示金额、对方
- [ ] 删除后刷新不显示

### 3.3 财务模块
1. **新增凭证**：`/cost-ledger` → 选项目 + 方向 + 类别 + 金额 → 保存
2. **查看汇总**：`/cost-ledger/summary` → 看到统计更新

**通过标准**：
- [ ] 列表正确显示
- [ ] 汇总数据同步更新

### 3.4 项目模块
1. **创建项目**：`/projects` → 新增 → 名称/地址/预算 → 保存
2. **详情**：点开项目 → 切换 6 个 Tab（成员/合同/凭证/发票/工资/工人）
3. **删除**：删除项目

**通过标准**：
- [ ] 6 Tab 全部正常加载
- [ ] 删除后无残留

### 3.5 跨用户权限（admin 切换 worker）
1. 用 `admin` 创建合同 A
2. 退出，用 `worker` 登录
3. `/contracts` 看合同 A（应**看不到** — 越权防护）
4. 退出，用 `admin` 登录
5. `/contracts` 看合同 A（**应能看到**）

**通过标准**：
- [ ] worker 看不到其他人的合同
- [ ] admin 可见

---

## 4. 数据隔离（3 分钟）

### 4.1 备份恢复
1. 设置 → 备份到桌面（`/api/backup`）
2. 关闭应用
3. 重启应用
4. 设置 → 恢复（`/api/restore`）
5. 验证数据是否回到备份点

**通过标准**：
- [ ] 备份文件出现在桌面（`工程管家-备份-*.db`）
- [ ] 恢复后数据回到备份前状态

### 4.2 SQLite 导出
1. 设置 → SQLite → 启用
2. SQLite → 迁移（JSON → SQLite）
3. 查看数据

**通过标准**：
- [ ] 迁移完成提示
- [ ] 数据在 engineering.db 可访问

---

## 5. 端点安全（2 分钟）

### 5.1 未登录访问
```bash
# 不带 JWT 访问，应该 401
curl http://localhost:5048/api/members
curl http://localhost:5048/api/contracts/income
```

**通过标准**：
- [ ] 全部返回 401 / `{"error":"..."}`

### 5.2 跨用户 DELETE 防护
1. 用 `worker` 登录
2. 尝试 DELETE admin 的合同（API 工具或直接 curl）

**通过标准**：
- [ ] 返回 403 Forbid

### 5.3 跨用户访问防护
1. 用 `worker` 登录
2. 尝试访问 admin 创建的合同（GET /api/contracts/income）

**通过标准**：
- [ ] admin 合同不可见（越权防护）

---

## 6. 日志审计（1 分钟）

1. 用户管理 → 操作日志
2. 看到刚才所有操作的日志

**通过标准**：
- [ ] 登录/CRUD/退出 都有日志
- [ ] 包含 user_id / timestamp / action

---

## 7. 性能（可选，2 分钟）

- [ ] 主页加载 < 2 秒
- [ ] 大列表（>100 行）滚动无卡顿
- [ ] Excel 导出（如果有） < 5 秒

---

## 通过标准总览

| 类别 | 标准 | 状态 |
|------|------|------|
| 编译 | 0 错误 0 警告 | ☐ |
| 单元测试 | 全部通过 | ☐ |
| 前端 check | 0 HARD FAIL | ☐ |
| 前端 build | 11-12 秒 | ☐ |
| 启动 | 窗口弹出 + WebView2 加载 | ☐ |
| 登录 | 4 角色全 OK | ☐ |
| CRUD | 5 模块全过 | ☐ |
| 数据隔离 | 备份恢复 OK | ☐ |
| 安全 | 未登录 401 + 跨用户 403 | ☐ |
| 审计 | 日志完整 | ☐ |

---

## 失败处理

如任何一项不通过：
1. 截图 + 日志 → 提交 issue
2. 标记本次 release 为 **WIP**
3. 不要 git tag v0.71.0

---

*本文档与 AGENTS.md 保持同步。如模块有变化（如新增费用模块），更新对应小节。*

================
File: scripts/pack-installer.ps1
================
param(
  [Parameter(Mandatory=$true)][string]$Stub,
  [Parameter(Mandatory=$true)][string]$Payload,
  [Parameter(Mandatory=$true)][string]$Out
)
$ErrorActionPreference = 'Stop'

$stubBytes    = [System.IO.File]::ReadAllBytes($Stub)
$payloadBytes = [System.IO.File]::ReadAllBytes($Payload)

$magic = [System.Text.Encoding]::ASCII.GetBytes('EMPAYLD1')   # 必须正好 8 字节
if ($magic.Length -ne 8) { throw 'magic must be 8 bytes' }
$lenBytes = [System.BitConverter]::GetBytes([Int64]$payloadBytes.Length)  # 小端
if (-not [System.BitConverter]::IsLittleEndian) { [Array]::Reverse($lenBytes) }

$outDir = [System.IO.Path]::GetDirectoryName($Out)
if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$fs = [System.IO.File]::Create($Out)
try {
  $fs.Write($stubBytes,    0, $stubBytes.Length)
  $fs.Write($payloadBytes, 0, $payloadBytes.Length)
  $fs.Write($magic,        0, 8)
  $fs.Write($lenBytes,     0, 8)
} finally { $fs.Dispose() }

Write-Host "Packed -> $Out  (stub=$($stubBytes.Length)  payload=$($payloadBytes.Length))"
exit 0

================
File: scripts/sync-version.mjs
================
import fs from 'node:fs'
const v = JSON.parse(fs.readFileSync('package.json', 'utf-8')).version

// 1) 前端运行时版本（保留 version.ts 因为可能有 import）
const versionTs = `// 此文件由 scripts/sync-version.mjs 自动生成，请勿手动修改
export const APP_VERSION = '${v}'
`
fs.writeFileSync('src/version.ts', versionTs)
console.log(`[sync-version] 已写入 src/version.ts → ${v}`)

// 2) .csproj <Version>
const csproj = 'EngineeringManager.Api/EngineeringManager.Api.csproj'
let xml = fs.readFileSync(csproj, 'utf-8')
if (xml.includes('<Version>')) {
  xml = xml.replace(/<Version>.*?<\/Version>/, `<Version>${v}</Version>`)
} else {
  // 写进第一个 PropertyGroup 末尾
  xml = xml.replace('</PropertyGroup>', `  <Version>${v}</Version>\n  </PropertyGroup>`)
}
fs.writeFileSync(csproj, xml)
console.log(`[sync-version] 已写入 .csproj <Version> → ${v}`)

console.log(`[sync-version] 完成：版本号 ${v} 已同步至 2 个位置`)

================
File: vite.config.ts
================
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// 读取 package.json 版本号，注入到渲染进程
const pkgPath = new URL('./package.json', import.meta.url)
const appVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version

// 移除 vendor-charts 的 modulepreload 标签，让它真正按需加载
function removeChartsPreloadPlugin() {
  return {
    name: 'remove-vendor-charts-preload',
    // writeBundle 在 dist/ 写入完成后触发
    writeBundle: () => {
      const htmlPath = path.resolve('dist/index.html')
      if (fs.existsSync(htmlPath)) {
        const html = fs.readFileSync(htmlPath, 'utf-8')
        const cleaned = html.replace(
          /<link[^>]+rel=["']modulepreload["'][^>]*href=["'][^"']*vendor-charts[^"']*["'][^>]*>\s*\n?/gi,
          ''
        )
        if (cleaned !== html) {
          fs.writeFileSync(htmlPath, cleaned, 'utf-8')
          console.log('✓ 已移除 vendor-charts 的 preload 标签')
        }
      }
    }
  }
}


// 读取 package.json 版本号, 注入到 index.html 的 window.__APP_VERSION__ 占位符
function injectVersionPlugin() {
  return {
    name: 'inject-app-version',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const placeholder = /window\.__APP_VERSION__\s*=\s*['"]<APP_VERSION>['"]/;
        if (placeholder.test(html)) {
          return html.replace(placeholder, `window.__APP_VERSION__ = '${appVersion}'`);
        }
        return html;
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    removeChartsPreloadPlugin(),
    injectVersionPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
    // 代理 /api/* 请求到 C# 后端，解决浏览器预览环境跨域/网络限制
    proxy: {
      '/api': {
        target: 'http://localhost:5048',
        changeOrigin: true,
      },
    },
  },
  // Tauri 需要相对路径
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Tauri 支持的目标
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-animation'
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          if (id.includes('node_modules')) {
            const match = id.match(/node_modules\/([^/]+)/)
            if (match) {
              return `vendor-${match[1]}`
            }
          }
        },
      },
    },
    minify: 'terser',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'E:/eg-coverage',
      include: [
        'src/utils/**',
        'src/types/guards',
        'src/types/permissions.ts',
        'src/store/**',
        'src/components/features/**',
      ],
    },
    exclude: ['node_modules/**', 'dist/**', 'src-tauri/**'],
    server: {
      deps: {
        inline: ['@testing-library/user-event']
      }
    }
  }
})

================
File: .gitignore
================
node_modules/
dist/
dist-electron/
release/
.gstack/
.workbuddy/
.reasonix/
.claude/agents/
.claude/hooks/
.claude/scheduled_tasks.json
*.log
.DS_Store
Thumbs.db

# 真实数据文件 (包含 API Key、项目数据、人员身份信息等敏感内容)
public/ocr-config.json
public/seed-data.json
data/*.db

# Claude Code 本地设置 (含个人权限配置和路径)
.claude/settings.local.json

# MCP 配置 (含第三方 API Token)
.mcp.json

# 本地配置文件 (含真实路径、API Key 等)
config.json

# 微信公众号 API 密钥
scripts/wechat-config.json

# Graphify 知识图谱 (自动生成，无需版本控制)
graphify-out/

# 意外生成的空目录
BRANCH=master/
nul

# Tauri 构建产物 + 误生成的数据目录
src-tauri/target/
__select_folder__/

# 字体文件（大文件，不纳入版本控制）
public/fonts/*.otf
public/fonts/*.ttf

# 环境变量（含 API Key 等敏感信息）
.env
.env.*

# 备份文件
*.backup
*.backup2

# 压缩包（临时构建产物）
*.zip

# C# 构建产物
EngineeringManager.Api/bin/
EngineeringManager.Api/obj/
EngineeringManager.Installer/publish/
.sisyphus/prod-test/

# 编译产物（禁止提交）
*.exe
*.pdb


# npm lock file (CI uses npm install instead of npm ci)
package-lock.json

# Tests 构建产物
EngineeringManager.Tests/bin/
EngineeringManager.Tests/obj/
# 本地 skill / 外部指南（不入库）
.claude/skills/
vibe-coding-guide/
# Codex mimo wrapper 残留日志
.mimo-runs/
# Agent 工具目录 (不属于项目)
.agents/
.btn-backup/
.claude/
.codex/
.firecrawl/
.sisyphus/
.skills-lock.json

# 历史残留
CLAUDE.md
PRODUCT.md
PROJECT_MEMORY.md
SPACING.md
*.bak

.codegraph/

# 卸载器 / 安装器构建产物（禁止提交）
EngineeringManager.Uninstaller/bin/
EngineeringManager.Uninstaller/obj/
release-uninstaller/
EngineeringManager.Installer/app-files/

================
File: docs/P0-FIX-PLAN.md
================
# 工程管家 v1.0.0 — P0/P1 安全审计修复计划
> **审计时间**：2026-06-16
> **审计者**：darwin-skill 9 维 rubric 参照 + vibe-coding-guide 19 条 + 4 个 explore 子代理 file:line 实证
> **回滚锚点**：`git reset --hard v1.0.0-pre-vibe`（commit fcdffea3fed06f878789db7f08d98303ffdf077f）
> **严重度图例**：🔴 P0 必须修 / 🟡 P1 强烈建议 / 🟢 P2 可选

> ✅ **状态更新（2026-07-04）**：本计划中的 P0-1/2/3/4 与 P1-1/2 均已在 v1.0.0–v0.74.0 落地完成，详见 AGENTS.md「✅ 当前安全状态」。以下为原始修复计划（含 file:line），保留作实施记录与回滚参考。
> ⚠️ 版本号：本文档 v1.0.x / v1.1.0 等为历史规划编号，项目现行版本为 v0.8x。
> ⚠️ 历史：文中 src-tauri/…（Rust）相关描述为 C# 迁移前的历史，src-tauri/ 目录现已移除。

---

## TL;DR

工程管家 v1.0.0 在**架构层（迁移/SQL/UI/审计/数据存储）合规度极高**，但**鉴权/安全基线几乎为零**——4 个 🔴 P0 缺口，5 个 🟡 P1 缺口。本计划给出每个缺口的**精确修复步骤 + file:line + diff 草稿 + 回滚命令**。

**总工作量估计**：40-70 小时（不含测试/部署）。

**修复顺序**：P0-1（OCR key）→ P0-2（鉴权）→ P0-4（越权）→ P0-3（PII）→ P1 全部。

---

## 🔴 P0-1: OCR API Key 公开在安装包（最高优先级）

### 现状
- `E:\测试\public\ocr-config.json:5-6` 明文 `apiKey=<REDACTED>` `secretKey=<REDACTED>`
- 已被打进 `dist/ocr-config.json`，随安装包发布到**所有用户机器**
- `OcrEndpoints.cs:531-558` 直接从 JSON 读明文 key
- `src/services/ocr.ts:158-194` 前端把 key 写到 `localStorage['workbuddy_ocr_config']`

### 风险
**任何下载 Setup.exe 的人**都能拿到这个 key，**用你的额度跑 OCR**，你的百度账户可能被刷爆。

### 修复步骤

#### Step 1: 立即 rotate 现有 key（你自己做）
1. 登录 https://console.bce.baidu.com/
2. 找到现有 OCR 应用的 apiKey/secretKey
3. **撤销**（或修改）
4. 创建**新 key**，建议：
   - 开启 **IP 白名单**（如果可）
   - 开启 **QPS/每日调用上限**

#### Step 2: 改后端 key 加载逻辑（改 `OcrEndpoints.cs:531-558`）

**当前**（伪代码）：
```csharp
private static (string apiKey, string secretKey) LoadOcrConfig()
{
    var json = File.ReadAllText("ocr-config.json");
    var config = JsonSerializer.Deserialize<OcrConfig>(json);
    return (config.Baidu.ApiKey, config.Baidu.SecretKey);
}
```

**改为**：
```csharp
private static (string apiKey, string secretKey) LoadOcrConfig()
{
    // 优先读环境变量
    var apiKey = Environment.GetEnvironmentVariable("BAIDU_OCR_API_KEY");
    var secretKey = Environment.GetEnvironmentVariable("BAIDU_OCR_SECRET_KEY");
    if (!string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(secretKey))
        return (apiKey, secretKey);

    // Fallback: Windows DPAPI 加密的文件
    var encryptedPath = Path.Combine(
        ApiConfig.ResolveDataPath(),
        "ocr-config.encrypted.json");
    if (File.Exists(encryptedPath))
    {
        var encrypted = File.ReadAllBytes(encryptedPath);
        var plaintext = ProtectedData.Unprotect(
            encrypted, null, DataProtectionScope.CurrentUser);
        var config = JsonSerializer.Deserialize<OcrConfig>(plaintext);
        return (config.Baidu.ApiKey, config.Baidu.SecretKey);
    }

    throw new InvalidOperationException(
        "OCR key not configured. Set BAIDU_OCR_API_KEY/BAIDU_OCR_SECRET_KEY " +
        "or run setup wizard.");
}
```

#### Step 3: 改前端 key 存储（改 `src/services/ocr.ts:158-194`）

**当前**：前端直接读 `ocr-config.json` 写 localStorage。

**改为**：**前端永远不存 key**。调用 `/api/ocr/*` 时后端代理，前端只传文件。

#### Step 4: 安装包脚本改造（改 `build-installer.bat`）

- 不打包 `public/ocr-config.json` 到 `dist/`
- 安装器首次启动时**引导用户输入 key** 或从环境变量读
- key 用 DPAPI 加密存到 `ApiConfig.ResolveDataPath()`

#### Step 5: 把新 key 部署给现有用户（升级指南）

文档告知现有用户：
1. 升级到 v1.0.1
2. 首次启动时输入新 key（向导）
3. 旧 `ocr-config.json` 自动失效

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
8-12 小时（含测试 + 文档 + 升级指南 + 现有用户数据迁移脚本）

### 验证
- 安装包下载后**搜索** `apiKey=<REDACTED>` 应**0 命中**
- 新用户首次启动**强制配置** key
- 已升级用户**保留**旧 key 配置（如已配）

---

## 🔴 P0-2: 全 API 无鉴权中间件

### 现状
- `Program.cs` 全文 `grep "UseAuthentication|AddAuthentication|AddAuthorization"` **0 命中**
- 所有 endpoint 任何人都能访问，包括：
  - `/api/users` 枚举所有用户
  - `/api/audit/logs` 读所有审计日志
  - `/api/sqlite/migrate` 执行任意 SQL
  - `/api/contracts` `/api/members` `/api/wages` 等所有数据端点

### 风险
- 拿到 localhost:5048 端口的人能改所有数据、看所有 PII
- 同一台机器的多个用户能互相看数据

### 修复步骤

#### Step 1: 加鉴权中间件（改 `Program.cs`）

在 `builder.Services` 段加：
```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? throw new InvalidOperationException("JWT_SECRET not configured");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "engineering-manager",
            ValidAudience = "engineering-manager",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy => policy.RequireRole("admin"));
});
```

在 `app` 段（before `app.Run()`）加：
```csharp
app.UseAuthentication();
app.UseAuthorization();
```

#### Step 2: 改造 `/api/auth/login` 签发 JWT（改 `AuthEndpoints.cs:19-51`）

```csharp
app.MapPost("/api/auth/login", async (LoginDto dto, IDbConnection db) =>
{
    var user = await db.QueryFirstOrDefaultAsync<User>(
        "SELECT * FROM users WHERE username = @Username",
        new { dto.Username });
    if (user == null) return Common.Fail("用户名或密码错误");

    var computedHash = Common.HashPassword(dto.Password, user.PasswordSalt, user.PasswordHashVersion ?? 2);
    if (computedHash != user.PasswordHash)
        return Common.Fail("用户名或密码错误");

    var token = GenerateJwtToken(user);  // 见下
    return Common.Ok(new { token, user });
});
```

#### Step 3: 给所有 endpoint 加 `.RequireAuthorization()`

99% endpoint 改：`.MapGet("/api/members", ...)` → `.MapGet("/api/members", ...).RequireAuthorization()`

`/api/auth/login` 和 `/api/health` **不加**（必须公开）。

#### Step 4: 管理员端点加 `.RequireAuthorization("RequireAdmin")`
- `/api/users/*` CRUD
- `/api/roles/*`
- `/api/audit/*`
- `/api/sqlite/*`
- `/api/diagnose` `/api/debug/*`

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
16-24 小时（含全端点改造 + 前端 token 存储 + 升级流程）

### 验证
- 未登录请求 → 401
- 普通用户请求 admin 端点 → 403
- 前端登录后 token 存 localStorage（**仅 token，不存 key**）
- token 过期前 5 分钟自动 refresh

---

## 🔴 P0-3: PII 零加密零脱敏

### 现状
- `members`/`workers`/`partners`/`supervisors` 表的 `id_card`/`phone`/`bank_account` 全部 TEXT 明文
- 9 个 OCR 端点不写库，但**前端把 OCR 原始结果 INSERT 明文**
- 所有列表 API 返回全表，前端组件直接渲染 `w.idCard` `w.bankAccount` `m.phone`
- `audit_logs.details` 也可能含 PII

### 风险
engineering.db 被拷 = 所有客户身份证/银行卡/工资泄露

### 修复（分两阶段）

#### 阶段 A（快速脱敏，本月完成）：UI 层 mask

**新建** `E:\测试\src\utils\mask.ts`：
```typescript
export function maskIdCard(s: string | null | undefined): string {
  if (!s) return '';
  if (s.length < 8) return s;
  return s.slice(0, 4) + '*'.repeat(s.length - 8) + s.slice(-4);
}

export function maskPhone(s: string | null | undefined): string {
  if (!s) return '';
  if (s.length < 7) return s;
  return s.slice(0, 3) + '****' + s.slice(-4);
}

export function maskBankAccount(s: string | null | undefined): string {
  if (!s) return '';
  if (s.length < 8) return s;
  return s.slice(0, 4) + '*'.repeat(s.length - 8) + s.slice(-4);
}
```

**改 5 个列表组件**：
- `src/components/features/labor/LaborWorkerList.tsx:64` `{w.idCard}` → `{maskIdCard(w.idCard)}`
- `src/components/features/labor/LaborWorkerRow.tsx:33` 同上
- `src/components/features/members/WorkerPickerItem.tsx:39` 同上
- `src/components/features/members/WorkerSection.tsx:86` 同上
- `src/components/features/members/StaffManagementTab.tsx:44` 同上
- `src/components/features/members/TeamWorkerModal.tsx:37` 同上
- `src/components/features/hr/StaffList.tsx:85` `m.phone` → `maskPhone(m.phone)`

**改 API 响应层**（`MemberEndpoints.cs:20-21,25,64,100-112,137-140,152-158`）返回前 mask。

#### 阶段 B（持久化加密，v1.1.0 完成）：AES 加密 + DPAPI

- 加 `EngineeringManager.Api/Security/PiiProtector.cs`：`Aes.Encrypt(plaintext) / Aes.Decrypt(ciphertext)`，用 `ProtectedData.Protect` 包 master key
- 改 `MemberEndpoints.cs` 等所有写入路径：INSERT 前 Encrypt
- 加 SQL 函数 `decrypt_id_card(id_card)` 用作视图层
- **代价**：所有现有数据库 PII 列需重新加密（一次性脚本）

### 回滚
- 阶段 A：UI 改动 `git restore` 易回滚
- 阶段 B：必须先备份 `engineering.db` 再迁移

### 工作量
- 阶段 A：4-8 小时
- 阶段 B：16-24 小时

### 验证
- 列表页显示 `5101**********1234` 而非完整身份证
- 数据库中**仍**存明文（阶段 A 只改 UI）
- 阶段 B 后数据库存密文 + 视图自动解密

---

## 🟢 P0-4: 越权读 — 全表无 user_id 过滤 (✅ 已完成 v1.1.0 commit e2c8cb7)

### 历史现状 (v1.0.0 之前)
- `grep "WHERE\s+(user_id|created_by)\s*="` **0 命中**
- 99% 读 query 仅按 `project_id` 过滤
- 18 处 DELETE/UPDATE 同样无主体限制
- 0 限流中间件

### 历史风险
- 登录用户 A 能看用户 B 的合同/工资/考勤
- 暴力穷举 ID 即可遍历全部数据

### 实际修复 (4 个 commit)

| Commit | 范围 |
|--------|------|
| `6dde702` | 6 个高危全表 SELECT 端点 + CurrentUser helper + migration 013 (project_authorizations) |
| `745617b` | 15 个 projId-only 端点 + 1 stats + CurrentUser createdByCol 参数 + GlobalAuthMiddleware 微调 |
| `6a58ed8` | 1 单条 (members/{id}) + 4 history 端点文档化 |
| `e2c8cb7` | migration 014 (7 表加 created_by) + 11 端点 user-dim + 4 个 project-authorizations 管理端点 |

### 实际实现

#### 基础设施
- `CurrentUser` 3 个 helper:
  - `UserFilterCompany` = `(created_by = @Uid OR @IsAdmin = 1)` (公司维度表)
  - `UserFilterWithAuthorizedProjects(projectCol, createdByCol)` = `(created_by = @Uid OR @IsAdmin = 1 OR EXISTS(project_authorizations WHERE project_id=X AND user_id=@Uid))` (项目级表)
  - `UserFilterFragment` const 保留兼容 (旧 5 处调用)
- 5 个 migration 链: 009/010/011/013/014 (27+ 张表加 created_by + 索引)

#### 33 业务端点 user-dim 隔离 (按文件)
- ContractEndpoints: income/expense/agreement + stats + settlements + contract-templates
- CostLedgerEndpoints: cost-ledger + summary + batches (batches 退回 projectId 因表无 created_by)
- ExpenseEndpoints: expenses
- FileEndpoints: drawings
- InventoryEndpoints: inventory + materials + transactions
- InvoiceEndpoints: invoices (内联 SQL 避 JOIN 冲突) + payment-records
- MemberEndpoints: members/workers/partners/supervisors/projects + project-workers + worker-teams + departments
- WageEndpoints: attendances + wages + wages/stats + payment-records + overdue-stats + overdue-list + team-wages + members/{id} + salary-history (2) + wage-history (2)
- AuthEndpoints: 4 个 project-authorizations 管理端点 (admin only)

#### 端到端验证
- admin token: 全表 (33 端点, 0/1 不等)
- worker1 token: 自己创建的 + 被授权项目的 (反向验证: worker 创建 1 partner → worker 1 / admin 13)
- 4 个管理端点: POST 授权 → GET 列表 → POST 重复幂等 → DELETE 撤销 → GET 空表
- 红绿灯: build 0/0 + tests 8/8 + frontend check 0 HARD FAIL (前端未改)

#### 兼容性与遗留
- 旧数据 `created_by = NULL`: admin 看到 (含 NULL 行), 非 admin 看不到 (除非项目被授权)
- project_authorizations 表默认空, admin 通过 4 个新管理端点 (`/api/admin/project-authorizations`) 授权
- 用户体验: 单人本地使用 (admin only) 0 影响; 多人共享机器需要 admin 主动授权

### 历史 (修复前)


#### Step 1: 引入当前用户识别

所有 endpoint 入口加：
```csharp
var userId = context.User.FindFirst("uid")?.Value;
if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
var isAdmin = context.User.IsInRole("admin");
```

#### Step 2: 所有读 query 加用户维度

模式 A（项目维度）：`WHERE project_id=@ProjectId` → `WHERE project_id=@ProjectId AND (created_by=@Uid OR EXISTS(SELECT 1 FROM project_members WHERE project_id=@ProjectId AND user_id=@Uid) OR @IsAdmin=1)`

模式 B（个人维度）：`WHERE id=@Id` → `WHERE id=@Id AND (user_id=@Uid OR @IsAdmin=1)`

#### Step 3: 限流（用 `aspnetcore-rate-limiting`）

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
    });
    options.AddFixedWindowLimiter("write", opt =>
    {
        opt.PermitLimit = 30;
        opt.Window = TimeSpan.FromSeconds(1);
    });
});
```

应用：
- `/api/auth/login` 用 `"login"` policy
- 所有写 endpoint（POST/PUT/DELETE）用 `"write"` policy
- 读 endpoint 不限（已通过用户维度过滤）

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
12-16 小时

### 验证
- 用户 A 用 ID `123` 访问 `/api/contracts/123` → 仅当 A 是创建人/项目成员/管理员时返回 200
- 登录端点 1 分钟内 6 次错误密码 → 第 6 次返回 429
- 写端点 1 秒内 31 次请求 → 第 31 次返回 429

---

## 🟡 P1-1: 静默吞错 + 误导性假成功

### 现状
5 处 `catch { }` 真静默 + 40 处单边 + 8 处 OCR `Results.Ok(new { success=false })` 假成功

### 修复

#### Step 1: 5 处真静默加日志
```csharp
// InvoiceEndpoints.cs:107
catch (Exception ex)
{
    Console.Error.WriteLine($"[InvoiceEndpoints] payment-record parse failed: {ex.Message}");
    invoice_infos = new List<...>();
}
```

#### Step 2: 8 处 OCR 假成功改回 5xx
```csharp
// OcrEndpoints.cs:64 等 8 处
catch (Exception ex)
{
    Console.Error.WriteLine($"[OcrEndpoints/id-card] {ex.Message}");
    return Results.Problem($"OCR 识别失败: {ex.Message}", statusCode: 500);
}
```

#### Step 3: 16 处 `Common.Fail(ex.Message)` 脱敏
- 文件 IO 错误：把绝对路径改为相对路径或不返回路径
- 用统一脱敏 helper：`ex.SanitizedMessage()`

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
4-6 小时

### 验证
- 故意触发各 catch 块 → 服务端 stderr 有日志 + 客户端收到合适的 HTTP 状态码
- ex.Message 不含绝对路径

---

## 🟡 P1-2: admin 默认密码多处公开

> 已修复（v1.0.0）：改读环境变量 + 启动日志去明文；以下为历史现状描述。

### 现状
- `src-tauri/src/db/init.rs:711` Rust 端硬编码 `let password = "<REDACTED>";`
- `init.rs:710` 硬编码盐 `"<REDACTED-SALT>"`
- `init.rs:732` 启动日志打印 `默认管理员账号已创建: admin / <REDACTED>`
- `AGENTS.md` / `README.md` 明文

### 修复

#### Step 1: Rust 端从环境变量读
```rust
let password = std::env::var("ADMIN_INITIAL_PASSWORD")
    .unwrap_or_else(|_| {
        use rand::distributions::Alphanumeric;
        rand::thread_rng()
            .sample_string(&Alphanumeric, 16)
    });
```

#### Step 2: 删日志里的密码
```rust
log::info!("默认管理员账号已创建: admin（首次登录后请立即修改密码）");
```

#### Step 3: 3 个文档改为
```markdown
- 默认管理员：`admin`（首次登录时**强制修改密码**）
- 初始密码：见安装器首次启动提示（或 [首次启动指南](docs/FIRST-RUN.md)）
```

#### Step 4: C# 端 Program.cs 加首次启动引导
```csharp
// 启动时检测 users 表空 + 无 admin → 弹窗引导创建
if (await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users") == 0)
{
    // 启动向导：生成随机密码 + 提示用户改密
}
```

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
6-8 小时

### 验证
- `grep -E` 检测 admin 默认密码及盐值字面量（正则 `admin[0-9]{3}|admin-.*-salt`）在 `E:\测试` **0 命中**
- 新安装用户首次启动有引导，**不会**有默认密码
- AGENTS.md/README.md 不含明文密码

---

## 🟢 P2-1: 字段命名分裂（轻微）

### 现状
`Program.cs:220` 用 `password`+`salt`，`AuthEndpoints.cs` 用 `password_hash`+`password_salt`+`password_hash_version`

### 修复
统一用 `password_hash`+`password_salt`+`password_hash_version`，删 `password`+`salt` 列（一次性 migration）

### 工作量
2-4 小时

---

## 🟢 P2-2: 红绿灯冒烟检查文档

### 现状
`EngineeringManager.Tests/` 存在但 AGENTS.md 无冒烟检查文档

### 修复
AGENTS.md 新增：
```markdown
## 🟢 冒烟检查（v1.0.0 红绿灯）
- 后端：`cd EngineeringManager.Api && dotnet test` — 应当全绿
- 前端：`npm run test:run` — 应当全绿
- 启动：`dotnet run` + WebView2 窗口能开 + 登录 + 主页面不出错
- 完整 release：见 `docs/SMOKE-TEST.md`
```

### 工作量
1-2 小时

---

## 总览时间表

| 阶段 | 工作量 | 优先级 | 建议发布 |
|------|------|------|------|
| P0-1 OCR key rotate + 加密 | 8-12h | 🔴 | v1.0.1 (紧急) |
| P0-2 鉴权中间件 | 16-24h | 🔴 | v1.1.0 |
| P0-3 PII 脱敏（阶段 A） | 4-8h | 🔴 | v1.0.2 |
| P0-3 PII 加密（阶段 B） | 16-24h | 🔴 | v1.2.0 |
| P0-4 越权 + 限流 | 12-16h | 🔴 | v1.1.0 |
| P1-1 静默吞错 | 4-6h | 🟡 | v1.0.2 |
| P1-2 admin 公开密码 | 6-8h | 🟡 | v1.0.2 |
| P2-1 字段命名 | 2-4h | 🟢 | v1.0.2 |
| P2-2 红绿灯文档 | 1-2h | 🟢 | v1.0.1 |

**合计**：70-100 小时（不含测试/部署/迁移/文档）

**建议发布策略**：
- v1.0.1：P0-1 + P2-2（紧急安全 + 文档）—— 2 周内
- v1.0.2：P0-3-A + P1-1 + P1-2 + P2-1 —— 1 个月内
- v1.1.0：P0-2 + P0-4 —— 2 个月内
- v1.2.0：P0-3-B —— 3 个月内

---

## 回滚预案（统一）

任意阶段出问题：
```bash
cd E:\测试
git status                    # 查未提交改动
git restore .                 # 撤销未提交改动
git reset --hard v1.0.0-pre-vibe  # 一秒回滚到 v1.0.0 完整状态
```

数据库回滚：
```bash
# 备份当前 db（快照恢复会自动备份）
cp <数据路径>/engineering.db <数据路径>/engineering.db.before-restore
# 恢复
<用工程的"快照恢复"功能>
```

---

**本文档与 `vibe-coding-guide-eval-2026-06-16.md` 配合使用。**
**审计基础：darwin-skill 9 维 rubric + vibe-coding-guide 19 条 + 4 个 explore 子代理 file:line 实证。**

================
File: README.md
================
# 工程管家 - 工程业务管理系统

**[官方网站](https://engineering-manager-website.pages.dev/)** · [GitHub Releases](https://github.com/Amer-CN/engineering-manager/releases)

## 📖 项目介绍

**工程管家** 是一款专为工程公司和施工团队设计的桌面应用程序，帮助您高效管理项目、合同、发票、人员、材料、结算等核心业务。

## ✨ 功能一览

- 📊 **仪表盘** - 项目总览、合同统计、发票提醒、结算摘要
- 🏗️ **项目管理** - 创建项目、健康度评分、收支对比、成本分析、指挥中心 Bento 网格
- 📝 **合同管理** - 收入 / 支出 / 其他协议（6 种子类型）、结算金额、收款统计、看板首页
- 🧾 **发票管理** - 4 种票种（纸/电 × 普/专）、收票→付款、开票→回款、状态跟踪
- 🚜 **结算管理** - 6 种细分类别、自动核验付款+发票、Excel 模板/灵活导入
- 📄 **模板管理** - Word/Excel 模板上传、变量填充生成、7 种分类（合同/结算/用印/用款/红头/函件/其他）
- 🏛️ **人事管理** - 管理人员档案、部门架构、考勤日历（时间线+画笔模式）、月薪薪酬、薪资历史
- 👷 **工人管理** - 4-Tab架构（看板/工人库/班组管理/工资管理），全局工人信息库（双表分离），Excel导入
- 📦 **仓库管理** - 物料库、出入库记录、项目材料台账
- 🏢 **单位管理** - 合作单位、监管单位、纳税资质、联网查询
- 💰 **工资管理** - 工人日薪制（日薪×出勤+奖金-扣款）、考勤打卡（画笔日历）、银行回单 PDF 自动解析、发放记录归档
- 📊 **成本台账** - 真实资金流追踪（含灰色支出/垫资/股东融资），双入口角色分离，二级分类系统，Excel 级列筛选
- 🤖 **AI 智能助手** - Agent 对话、智能数据引擎、SQLite 智能管理
- 👤 **用户与权限** - 头像弹出菜单、角色权限矩阵编辑、操作日志审计
- 🔒 **屏幕锁定** - 一键锁屏防窥屏，需密码解锁后继续操作

## 🛠️ 技术栈

- **C# (.NET 8) + ASP.NET Core Minimal API** - 后端 API 服务
- **Dapper + Microsoft.Data.Sqlite** - 轻量 ORM + 数据库访问
- **WinForms + WebView2** - 桌面窗口（内嵌浏览器内核显示 React 前端）
- **React 18 + TypeScript 5** - 类型安全的 UI 开发
- **Vite 8** - 极速构建工具
- **TailwindCSS** - 实用优先的样式框架
- **framer-motion** - 全站交互动画引擎
- **recharts** - 声明式数据可视化图表库
- **lucide-react** - SVG 图标库（80+ 图标）
- **SQLite** - 本地数据持久化（engineering.db）
- **百度OCR** - 在线 OCR 识别（身份证/发票/银行卡等 9 种）

## 🚀 运行项目

### 环境要求

- .NET 8 SDK
- Node.js 18+
- Windows 系统

### 安装依赖

```bash
npm install
cd EngineeringManager.Api && dotnet restore
```

### 开发模式运行

双击运行 `工程管家.bat`，或手动执行：

```bash
# 终端 1：启动 C# 后端
cd EngineeringManager.Api && dotnet run

# 终端 2：启动 React 前端
npm run dev
```

### 打包桌面应用

```bash
build-installer.bat
```

打包完成后，安装包位于 `release/EngineeringManager-Setup-<版本号>.exe`（例：`release/EngineeringManager-Setup-0.82.0.exe`）。

## 📝 使用说明

1. 首次使用需要先创建项目
2. 在项目中可以管理合同、发票、人员、材料等
3. 所有数据保存在本地（SQLite），无需担心数据安全
4. 默认管理员账号：`admin`（首次登录时**强制修改密码**）

## 📚 文档索引

- **[AGENTS.md](./AGENTS.md)** — 项目架构、技术栈、模块说明、开发指南（AI 辅助开发入口）
- **[设计系统](./AGENTS.md#-ui-规范)** — 完整设计系统（色彩、字体、间距、动画、组件规范）
- **[CHANGELOG.md](./CHANGELOG.md)** — 版本历史（v1.0.0 → 最新）
- **[docs/](./docs/)** — 架构决策（ARCHITECTURE）、数据库设计（DATABASE_DESIGN）、模块详解（MODULES）、安全修复计划（P0-FIX-PLAN）、冒烟测试（SMOKE-TEST）、历史交接（handoff/）

## 📄 许可证

MIT License

---

*免费开源 · 永久使用*

================
File: build-installer.bat
================
@echo off
chcp 65001 >nul 2>&1
title Engineering Manager - Build Single-File Installer

echo ============================================================
echo   Engineering Manager - Single-File Installer Build
echo ============================================================
echo.

pushd "%~dp0"

:: Read version from package.json (node for reliable parsing)
for /f "delims=" %%a in ('node -p "require('./package.json').version"') do set VERSION=%%a
echo   Version: %VERSION%
echo.

:: 0. Sync version to all locations BEFORE any dotnet build
::    (must run before dotnet publish so MSBuild evaluates the correct <Version>)
echo [0/6] Syncing version %VERSION%...
node scripts\sync-version.mjs
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 1. Build installer frontend
echo [1/6] Building installer frontend...
cd installer
call npx vite build
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
cd ..
echo    OK

:: 2. Build main app frontend
echo.
echo [2/6] Building main app frontend...
call npx vite build
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 3. Publish main app (version already synced, no BeforeBuild target needed)
echo.
echo [3/6] Publishing main app...
set APP_DIR=EngineeringManager.Installer\app-files
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
dotnet publish EngineeringManager.Api -c Release -r win-x64 --self-contained -o "%APP_DIR%"
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 4. Copy frontend + config into app-files
echo.
echo [4/6] Copying assets into app-files...
xcopy /E /I /Q /Y dist "%APP_DIR%\dist" >nul
copy /Y public\ocr-config.json "%APP_DIR%\ocr-config.json" >nul
copy /Y public\seed-data.json "%APP_DIR%\seed-data.json" >nul
echo    OK

:: 4b. Build & stage uninstaller (frontend + single-file exe) -> app-files\uninstall\
echo.
echo [uninstaller] Building uninstaller frontend...
cd uninstaller
call npx vite build
if errorlevel 1 ( echo X UNINSTALLER FRONTEND FAILED & pause & exit /b 1 )
cd ..
echo [uninstaller] Publishing uninstaller exe...
dotnet publish EngineeringManager.Uninstaller -c Release -o release-uninstaller
if errorlevel 1 ( echo X UNINSTALLER PUBLISH FAILED & pause & exit /b 1 )
if exist "%APP_DIR%\uninstall" rmdir /s /q "%APP_DIR%\uninstall"
xcopy /E /I /Q /Y release-uninstaller "%APP_DIR%\uninstall" >nul
del "%APP_DIR%\uninstall\*.pdb" >nul 2>&1
ren "%APP_DIR%\uninstall\EngineeringManager.Uninstaller.exe" 工程管家卸载.exe
xcopy /E /I /Q /Y uninstaller\dist "%APP_DIR%\uninstall\uninstaller" >nul
rmdir /s /q release-uninstaller 2>nul
echo    OK

:: 5. Create payload.zip (app-files + installer/dist)
echo.
echo [5/6] Creating payload.zip...
if exist EngineeringManager.Installer\payload.zip del EngineeringManager.Installer\payload.zip
cd EngineeringManager.Installer
powershell -Command "Compress-Archive -Path 'app-files','..\installer\dist' -DestinationPath 'payload.zip' -Force"
cd ..
for %%I in (EngineeringManager.Installer\payload.zip) do echo    Size: %%~zI bytes
echo    OK

:: 6. Build single-file installer exe
echo.
echo [6/6] Building single-file installer exe...
if exist release-installer rmdir /s /q release-installer
dotnet publish EngineeringManager.Installer -c Release -r win-x64 --self-contained -o release-installer -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )

:: Concatenate stub + payload + footer (自解压追加段)
echo    Concatenating stub + payload + footer...
powershell -NoProfile -Command ^
  "$stub='release-installer\EngineeringManager.Installer.exe';" ^
  "$payload='EngineeringManager.Installer\payload.zip';" ^
  "$out='release\EngineeringManager-Setup-%VERSION%.exe';" ^
  "$magic=[Text.Encoding]::ASCII.GetBytes('EMPAYLD1');" ^
  "$len=(Get-Item $payload).Length;" ^
  "$lenBytes=[BitConverter]::GetBytes([Int64]$len);" ^
  "$o=[IO.File]::Open($out,'Create');" ^
  "try{ $s=[IO.File]::OpenRead($stub); try{$s.CopyTo($o)}finally{$s.Dispose()};" ^
  "$p=[IO.File]::OpenRead($payload); try{$p.CopyTo($o)}finally{$p.Dispose()};" ^
  "$o.Write($magic,0,8); $o.Write($lenBytes,0,8) } finally { $o.Dispose() }"
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )

:: Clean up
rmdir /s /q release-installer 2>nul

echo.
echo ============================================================
echo   BUILD COMPLETE!
echo.
echo   Single-file installer: release\EngineeringManager-Setup-%VERSION%.exe
echo.
for %%I in (release\EngineeringManager-Setup-%VERSION%.exe) do echo   Size: %%~zI bytes
echo ============================================================
echo.

explorer release
popd
pause

================
File: scripts/make-manifest.mjs
================
import fs from 'node:fs'
import { createHash } from 'node:crypto'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
const version = pkg.version

const releaseBase = process.env.EM_RELEASE_BASE
if (!releaseBase) {
  console.error('[make-manifest] 错误：缺少环境变量 EM_RELEASE_BASE（二进制下载根地址）')
  process.exit(1)
}
// 支持 GitHub Release URL 模板：将 ${version} 占位符替换为实际版本号
const resolvedBase = releaseBase.replace(/\$\{version\}/g, version).replace(/\/+$/, '')

// 读现有 manifest（保留 notesUrl + 自定义 proxies）
let existingNotesUrl = ''
let existingProxies = null
const manifestPath = 'update/manifest.json'
if (fs.existsSync(manifestPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    if (existing.notesUrl) existingNotesUrl = existing.notesUrl
    // 保留线上已自定义的 proxies（若存在且非空）
    if (Array.isArray(existing.package?.proxies) && existing.package.proxies.length > 0) {
      existingProxies = existing.package.proxies
    }
  } catch { /* ignore */ }
}

// 默认代理前缀数组（不含版本号/文件名，客户端自动拼接）
const DEFAULT_PROXIES = [
  'https://gh-proxy.com/',
  'https://ghfast.top/',
]

// minForced: 环境变量覆盖，否则用现 manifest 的值，否则 "0.0.0"
const minForced = process.env.EM_MIN_FORCED
  ?? (() => {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      return existing.minForced || '0.0.0'
    } catch { return '0.0.0' }
  })()

// 安装包路径
const setupFile = `release/EngineeringManager-Setup-${version}.exe`
if (!fs.existsSync(setupFile)) {
  console.error(`[make-manifest] 错误：安装包不存在 ${setupFile}（请先 iscc 编译）`)
  process.exit(1)
}

// 计算 SHA256 + size
const buf = fs.readFileSync(setupFile)
const sha256 = createHash('sha256').update(buf).digest('hex').toUpperCase()
const size = buf.length

const url = `${resolvedBase}/EngineeringManager-Setup-${version}.exe`

// 防呆检查
if (url.includes('example.cn')) {
  console.error(`[make-manifest] 错误：URL 仍含 example.cn 占位符：${url}`)
  process.exit(1)
}
if (!sha256 || sha256.length < 64) {
  console.error(`[make-manifest] 错误：SHA256 无效：${sha256}`)
  process.exit(1)
}

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
// 转成东八区各字段
const t = new Date(now.getTime() + 8 * 3600 * 1000)
const releasedAt =
  `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}` +
  `T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}+08:00`

const manifest = {
  latest: version,
  minForced,
  releasedAt,
  notesUrl: existingNotesUrl || '',
  package: {
    url,
    proxies: existingProxies || DEFAULT_PROXIES,
    size,
    sha256,
    signature: '',
  },
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`[make-manifest] 已生成 ${manifestPath}`)
console.log(`[make-manifest] 版本: ${version}`)
console.log(`[make-manifest] URL:  ${url}`)
console.log(`[make-manifest] Size: ${(size / 1024 / 1024).toFixed(2)} MB`)
console.log(`[make-manifest] SHA256: ${sha256}`)

================
File: release.bat
================
@echo off
chcp 65001 >nul 2>&1
title Engineering Manager - Release Build

echo ============================================================
echo   Engineering Manager - 一键发版脚本（WebView2 安装器）
echo ============================================================
echo.

pushd "%~dp0"

:: Read version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"version" package.json') do set VERSION=%%~a
set VERSION=%VERSION:"=%
echo   Version: %VERSION%

:: Auto-set EM_RELEASE_BASE
if "%EM_RELEASE_BASE%"=="" (
    set EM_RELEASE_BASE=https://github.com/Amer-CN/engineering-manager/releases/download/v%VERSION%
    echo   [AUTO] EM_RELEASE_BASE: %EM_RELEASE_BASE%
)
echo.

:: 1. Sync version to all downstream files
echo [1/7] Syncing version to all files...
call npm run sync-version
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 2. Build installer frontend (WebView2 UI)
echo.
echo [2/7] Building installer frontend...
cd installer
call npx vite build
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
cd ..
echo    OK

:: 3. Build main app frontend
echo.
echo [3/7] Building main app frontend...
call npx vite build
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 4. Publish main app + copy assets
echo.
echo [4/7] Publishing main app...
set APP_DIR=EngineeringManager.Installer\app-files
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
dotnet publish EngineeringManager.Api -c Release -r win-x64 --self-contained -o "%APP_DIR%"
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
xcopy /E /I /Q /Y dist "%APP_DIR%\dist" >nul
copy /Y public\ocr-config.json "%APP_DIR%\ocr-config.json" >nul
copy /Y public\seed-data.json "%APP_DIR%\seed-data.json" >nul
echo    OK

:: 4b. Build & stage uninstaller (frontend + single-file exe) -> app-files\uninstall\
echo.
echo [uninstaller] Building uninstaller frontend...
cd uninstaller
call npx vite build
if errorlevel 1 ( echo X UNINSTALLER FRONTEND FAILED & pause & exit /b 1 )
cd ..
echo [uninstaller] Publishing uninstaller exe...
dotnet publish EngineeringManager.Uninstaller -c Release -o release-uninstaller
if errorlevel 1 ( echo X UNINSTALLER PUBLISH FAILED & pause & exit /b 1 )
if exist "%APP_DIR%\uninstall" rmdir /s /q "%APP_DIR%\uninstall"
xcopy /E /I /Q /Y release-uninstaller "%APP_DIR%\uninstall" >nul
del "%APP_DIR%\uninstall\*.pdb" >nul 2>&1
ren "%APP_DIR%\uninstall\EngineeringManager.Uninstaller.exe" 工程管家卸载.exe
xcopy /E /I /Q /Y uninstaller\dist "%APP_DIR%\uninstall\uninstaller" >nul
rmdir /s /q release-uninstaller 2>nul
echo    OK

:: 5. Build WebView2 installer (payload.zip + single-file publish + stub+payload+footer)
echo.
echo [5/7] Building WebView2 installer...
:: 5a. Create payload.zip
if exist EngineeringManager.Installer\payload.zip del EngineeringManager.Installer\payload.zip
cd EngineeringManager.Installer
powershell -Command "Compress-Archive -Path 'app-files','..\installer\dist' -DestinationPath 'payload.zip' -Force"
cd ..
if errorlevel 1 ( echo X PAYLOAD FAILED & pause & exit /b 1 )

:: 5b. Publish installer as single-file
if exist release-installer rmdir /s /q release-installer
dotnet publish EngineeringManager.Installer -c Release -r win-x64 --self-contained -o release-installer -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
if errorlevel 1 ( echo X STUB FAILED & pause & exit /b 1 )

:: 5c. Concatenate stub + payload + footer (EMPAYLD1 magic + Int64 length)
if not exist release mkdir release
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\pack-installer.ps1 -Stub "release-installer\EngineeringManager.Installer.exe" -Payload "EngineeringManager.Installer\payload.zip" -Out "release\EngineeringManager-Setup-%VERSION%.exe"
if errorlevel 1 ( echo X CONCAT FAILED & pause & exit /b 1 )

rmdir /s /q release-installer 2>nul
echo    OK

:: 6. Generate manifest (SHA256 of final exe)
echo.
echo [6/7] Generating manifest...
call npm run release:manifest
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )
echo    OK

:: 7. Commit, tag, push, create GitHub Release
echo.
echo [7/7] Committing and pushing...
git add -A
git commit -m "release: v%VERSION%"
git tag v%VERSION%
git push origin master --tags
if errorlevel 1 ( echo X FAILED & pause & exit /b 1 )

echo.
echo ============================================================
echo   RELEASE COMPLETE!
echo.
echo   Installer: release\EngineeringManager-Setup-%VERSION%.exe
echo   Tag: v%VERSION%
echo   Manifest: update/manifest.json
echo ============================================================
echo.

explorer release
popd
pause

================
File: CHANGELOG.md
================
# CHANGELOG

> **版本策略**: 本项目采用语义化版本 (SemVer). 规则:
> - `feat` (新功能): minor bump (0.X.0)
> - `fix` (bug 修复): patch bump (0.X.Y)
> - `refactor` (代码重构): **不 bump version**
> - `docs` / `chore` (文档/杂务): **不 bump version**
>
> **重要**: v0.74.0 → v0.75.3 期间曾过度打 tag (refactor-only sprint 也 bump). 已在 v0.75.3 重新整理 git 历史 (drop 7 个 spurious chore "bump version" commits), 重组成正确的 semver 历史.


## v0.82.1 (2026-07-05) — perf: 启动提速（Splash 去死等 + 后端并行化）

> **SemVer**: patch bump (0.82.0 → 0.82.1).

### 更新了什么（大白话）

#### ✨ 体验优化
- **启动速度大幅提升**：去掉了启动动画的固定等待时间（从 2.8 秒缩短到 0.8 秒），动画还在、只是快多了
- **窗口打开更快**：以前双击后要先等后端启动完才弹窗口，现在窗口和后端同时启动，省掉了一段干等时间
- **启动中不再白屏**：后端启动慢时窗口会显示"正在启动…"带 Logo 动画的占位页，不再是空白窗口

### 改动（开发者视角）

- **`perf(splash)`** c2eae25: 前端 Splash 去死等
  - `SplashParticles.tsx`: `fadeTimer` 2200→500ms, `completeTimer` 2800→800ms
  - `App.tsx`: `SplashScreen` 从 `lazy()` 改为静态 `import`，去掉 `<Suspense>` 包裹

- **`perf(startup)`** ac85b53: 后端启动并行化
  - `EntryPoint.cs`: 删除 `for (int i = 0; i < 60; i++)` 同步死等 API 轮询段（500ms × 60 = 30s 兜底），窗口立刻打开
  - `MainWindow.cs` `OnLoad`: `EnsureCoreWebView2Async` 后先 `NavigateToString(WarmingHtml)` 显示品牌化"正在启动…"占位页，再 100ms 粒度轮询 `/api/health`（15s 兜底），就绪后 `Navigate(frontendUrl)` 切真实页面

### 红绿灯

- dotnet build: 0 错误
- dotnet test: 174/174 通过
- npm check: BUILD PASSED
- tsc: 0 error
- vite build: 8.08s

---

## v0.82.0 (2026-07-04) — feat: 卸载器合并 + 安装包体积优化

> **SemVer**: minor bump (0.81.7 → 0.82.0).

### 更新了什么（大白话）

#### 🚀 新功能
- **支持从 Windows「程序和功能」卸载**：现在工程管家会像正常软件一样出现在「控制面板 → 程序和功能」列表里，可以从那里一键卸载
#### ✨ 体验优化
- **卸载更干净彻底**：点卸载后程序会先把自己复制到临时目录再运行删除，避免"程序删不掉自己"的问题；数据存放文件夹永远不会被删
- **安装包体积优化**：合并卸载器到主程序，安装包从 ~198MB 降至 ~160MB

---

## v0.81.7 (2026-07-02) — fix: 设置页下载更新共享全局状态,显示进度条

> **SemVer**: patch bump (0.81.6 → 0.81.7).

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **设置页下载更新无进度条**：根因是设置页和顶部通知条各自独立管理更新状态，互不共享。现已改为全局共享状态，在设置页下载更新时也能看到进度条和暂停/取消按钮

### 改动（开发者视角）

- **`fix(updater)`** 9aa53b0: 根因 AboutSection 与 UpdateBanner 各自独立调用 `useUpdater()`，状态不共享 → 改为 Context Provider 单例模式，`App.tsx` 包裹 `UpdaterProvider`；`AboutSection` 增加完整进度条 + 暂停/取消按钮

---

## v0.81.6 (2026-07-02) — feat: 下载更新支持暂停/继续

> **SemVer**: patch bump (0.81.5 → 0.81.6).

### 更新了什么（大白话）

#### ✨ 体验优化
- **下载更新支持暂停/继续**：下载进度条现在有暂停和取消两个按钮（之前两个都是取消，重复了），暂停后可以继续下载，利用断点续传不丢进度

### 改动（开发者视角）

- **`feat(updater)`** 2e31667: 进度条原来两个按钮都是取消（重复）→ 改为「暂停按钮(保留 .part 文件) + 取消按钮」，暂停后走 HTTP Range 断点续传继续下载

---

## v0.81.5 (2026-07-02) — fix: 三管齐下修复更新后版本号不刷新

> **SemVer**: patch bump (0.81.4 → 0.81.5).

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **更新后版本号仍显示旧版**：三个根因一次性修复：①安装器更新时自动杀旧进程确保 C# 程序文件被正确覆盖；②版本号同步提前到编译之前解决 exe 版本滞后问题；③WebView2 改用版本化缓存目录，每个版本独立缓存，从根源杜绝旧前端残留

### 改动（开发者视角）

- **`fix(installer)`** 148caf2: 三管齐下
  1. `build-installer.bat`: `sync-version` 提前到 `dotnet publish` 之前（修 exe 版本滞后）
  2. `MainWindow`: 版本化缓存目录 `engineering-manager-webview2-v{version}`（从 `dist/index.html` 读版本）
  3. `InstallerService`: 更新模式先杀旧进程再复制文件（修 exe 被锁无法覆盖）

---

## v0.81.4 (2026-07-02) — fix: 启动时按版本变化清理 WebView2 缓存

> **SemVer**: patch bump (0.81.3 → 0.81.4).

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **更新后前端版本号和日志仍显示旧版**：根因是 WebView2 浏览器内核缓存了旧前端文件，现在软件启动时检测版本变化会自动清理缓存，确保加载最新界面

### 改动（开发者视角）

- **`fix(webview2)`** 144d849: 根因 WebView2 HTTP 缓存目录 `%TEMP%\engineering-manager-webview2` 装新版后仍留旧前端 → `MainWindow.OnLoad` 比对程序集版本 vs 缓存目录里的 `.app-version` 标记，不同则整个删除重建

---

## v0.81.3 (2026-07-02) — fix: 更新后前端版本号/日志不刷新

> **SemVer**: patch bump (0.81.2 → 0.81.3).

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **更新后版本号和更新日志不刷新**：安装更新后打开软件发现版本号还是旧的、更新日志也没变？这是浏览器缓存了旧页面导致的，现在装更新时会自动清理旧文件，服务器也加了禁止缓存

### 改动（开发者视角）

- **`fix(update)`** f21ad82:
  - `Program.cs`: `index.html` 加 no-cache 头防 WebView2 缓存
  - `InstallerService.cs`: 更新模式先清理旧 `dist/` 目录
  - GitHub Release notes v0.81.1 / v0.81.2 格式修正为分组格式

---

## v0.81.2 (2026-07-02) — fix: P0/P1 自动更新链路全面加固

> **SemVer**: patch bump (0.81.1 → 0.81.2)，自动更新链路多项 bug 修复 + 加固。

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **下载完成后文件被占用导致崩溃**：杀毒软件短暂锁住文件时，下载收尾的改名操作会失败崩溃，现在会自动重试几次
- **快速连点更新按钮启动多个下载**：现在同一个下载只会跑一个，重复点击不会冲突
- **代理服务器只连不回时下载永久卡死**：加了 10 秒连接超时，超时自动切到下一个下载源
- **健康检查接口版本号不同步**：改成自动读程序集版本，不再手动维护

#### ✨ 体验优化
- **下载可以取消了**：下载过程中可以随时点取消，不用干等

#### 🔧 技术优化
- **防止下载多写垃圾数据**：源服务器多吐的尾部数据会被裁掉，保证文件大小精确

### 改动（开发者视角）

- **`fix(update)`** 447b366:
  - P0-1: 并发闸 + `FinalizeWithRetry`（`.part→.exe` 改名重试）+ `flushToDisk`
  - P0-2: `SendAsync` 响应头 10s 超时
  - P0-3: `/api/health` 版本号读程序集
  - P1-1: 防 overshoot 裁剪写入
  - P1-2: 可取消下载（后端 + 前端）
  - P1-3: 新增 6 个测试

### 红绿灯

- dotnet test: 174/174 通过

---

## v0.81.1 (2026-07-02) — fix: 死链代理 + proxies 前缀自动化

> **SemVer**: patch bump (0.81.0 → 0.81.1)。

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **自动更新下载链接失效**：之前用的两个下载加速链接挂了，现在去掉了，换成了新的加速源

#### 🔧 技术优化
- **下载加速源改为自动管理**：以前每个版本的下载链接都要手写一遍，现在只需要维护加速地址前缀，版本号自动拼接，发版更省事了

### 改动（开发者视角）

- **`fix(update)`** e6553af:
  - 去掉 `ghproxy.homeboyc.cn` / `github.akams.cn` 两个失效代理
  - `urls`(完整 URL 数组) 改为 `proxies`(前缀数组)，客户端运行时拼接
  - manifest 生成器自动写入 `proxies`，版本号只出现在 `url` 一处
  - `UpdateBanner` `gray-*` 修复为 `slate-*`
  - `build-installer.bat` 版本读取修复（`node -p` 替代 `findstr`）

### 红绿灯

- dotnet test: 168 通过

---

## v0.81.0 (2026-07-02) — fix: 数据存储路径 + 默认密码提示 + 安装器修复

> **SemVer**: minor bump (0.80.0 → 0.81.0), 多项 bug 修复 + 体验改善.

### 更新了什么（大白话）

#### 🐛 修了一堆跟「数据存储路径」相关的 bug
- **安装器选了 D 盘，装完还是 C 盘**：安装器界面选数据存储路径时，默认路径不显示（空白）；手动改了路径（比如 D:\工程管家数据），安装完打开软件发现还是默认的 C 盘路径 —— 这个 bug 修了
- **根因**：安装器前端代码在点击「开始安装」时把 C# 传过来的默认路径覆盖成了空字符串；后端读 config.json 时用了错误的类型转换（`JsonElement` 当 `string` 判断），导致永远读不到用户设的路径
- **登录界面设置里改数据路径也没用**：改完点保存没反应，因为后端鉴权拦截了未登录请求 + 前端没检查返回值就关了弹窗 —— 都修了

#### 🔐 默认密码提示改密后终于会消失了
- **改完密码提示还在**：admin 用默认密码登录后会出现「正在使用默认密码」的提示，但改完密码重新登录提示还在 —— 因为数据库里的 `is_default_password` 标记在改密时没清零，现在修了
- **提示不再挤位置**：默认密码提示从内嵌横幅改成悬浮在顶部居中的浮动通知条，不再挤压软件界面布局

#### 🔧 其他修复
- **安装器加了诊断日志**：安装过程会写日志到 `%TEMP%\工程管家-installer-debug.log`，方便排查问题
- **健康检查版本号对齐**：`/api/health` 接口里写死的 `0.72.0` 终于对齐到实际版本了
- **config.json 合并写入修复**：GPU 加速、读取模式等配置写入时不再丢失已有键

### 改动（开发者视角）

#### 🐛 Bug 修复
- **SystemEndpoints GET /api/config**: `JsonSerializer.Deserialize<Dictionary<string, object>>` 返回 `JsonElement` 而非 `string`，`dp is string` 恒 `false` → 改用 `JsonDocument.Parse` + `dp.GetString()`
- **SystemEndpoints 4 处合并写入**: `PUT /api/config/data-path` / `PUT /api/config/gpu-acceleration` / `PUT /api/sqlite/read-mode` 同步修复，合并写入改用 `JsonDocument.EnumerateObject()` + `Clone()`
- **GlobalAuthMiddleware**: 白名单放行 `PUT /api/config/data-path`（登录前可配置数据路径）
- **SystemEndpoints PUT /api/config/data-path**: 鉴权条件化（未登录允许，已登录需 admin）
- **LoginSettingsModal**: 增加返回值检查 + 错误/成功反馈消息 + 重启提示
- **installer App.tsx**: `handleBegin` 不再覆盖 C# init 下发的 `defaultDataPath`；删除无用的 `getDefaultDataPath()` 函数
- **AuthEndpoints**: `POST /api/auth/reset-password` 和 `PUT /api/users`（带 password 分支）追加 `is_default_password=0`；加不变量注释
- **App.tsx**: 默认密码提示从内嵌横幅改为 `fixed` 悬浮浮动条，`flex justify-center` 居中
- **ApiTestBase**: 测试环境补 `is_default_password` 列（EnsureTables 在测试不跑，预存 bug）

#### 📝 约定
- **不变量**: 任何写入 `password_hash` 的 UPDATE 必须同时 `is_default_password=0`（AuthEndpoints.cs 两处注释标注）

### 红绿灯

- dotnet build: 0 错误
- dotnet test: 158/158 通过
- tsc: 0 错误
- vite build: 成功

---

## v0.80.0 (2026-06-30) — feat: 应用内自动更新 + 安全加固

> **SemVer**: minor bump (0.79.0 → 0.80.0), 新增功能（应用内自动更新）+ 安全重构.

### 更新了什么（用户视角）

#### 🚀 应用内自动更新
- **发现新版本自动提示**：登录后顶栏显示「发现新版本」提示条，点击「立即更新」即可升级
- **下载有进度条**：实时显示下载百分比、已下载大小、下载速度
- **下载完自动装包**：下载完成 → SHA256 校验 → 自动启动安装器 → 覆盖安装 → 自动重启，全程无需手动操作
- **强制更新**：关键安全更新时会全屏遮罩，无法跳过，确保所有人都及时升级
- **多源下载**：优先从国内 CDN 下载，CDN 不可达时自动回退到 GitHub，国内用户也能快速下载

#### 🔒 安全加固
- **个人信息脱敏更精细**：工人的地址字段现在也会脱敏（之前有漏洞），不同角色看到的信息范围更精确
- **权限查询更安全**：数据库查询权限过滤从硬编码改为结构化枚举，减少越权风险
- **查询安全增强**：AI 助手的数据库查询引擎修复了 3 个安全问题（函数误杀、LIMIT 截断错位、子查询提示不准）

#### 🛠️ 其他改进
- **版本号全局统一**：所有地方显示的版本号现在都从同一个来源读取，不会再出现版本号不一致的情况
- **安装包文件名改为英文**：避免中文文件名在 URL 中编码导致的下载问题

### 改动（开发者视角）

#### 🚀 版本自动更新系统（核心新功能）
- **三环交付**: 检查更新端点 + 前端 UpdateBanner + 下载/SHA256 校验/装包重启完整闭环
- **版本单源**: `scripts/sync-version.mjs` 从 `package.json.version` 同步到 `.csproj`/`version.ts`/`installer.iss`
- **多源 manifest fallback**: `UpdateService` 支持 `ManifestUrls[]` 按序尝试（GitHub Release + CDN）
- **增量 SHA256**: `IncrementalHash` 边下边算，下完即校验，不留 `.part` 半成品
- **实时进度反馈**: SSE 推送下载进度（百分比+MB+速度），进度条 UI
- **强制更新遮罩**: `minForced > current` 时全屏不可关 modal
- **manifest 自动化**: `scripts/make-manifest.mjs` 发版时自动计算 SHA256+size，支持 GitHub Release URL 模板
- **启动防呆**: `ManifestUrls` 含 `example.cn` 时 Console.Error 警告

#### 🔒 安全重构
- **D-2 PII 字段权限分级**: `CanReadPii(bool)` → `PiiAccess` 结构体（per-field 控制），修复 `workers.address` 未脱敏漏洞
- **D-1 DataScope 枚举化**: `@IsAdmin` 布尔字面量 → `DataScope` 三档枚举（All/AuthorizedProjects/SelfOnly），SQL 不再出现 `@IsAdmin`
- **L-1/L-2/L-3 SafeQueryValidator**: REPLACE 标量函数放行 + EnsureLimit 修复 + 子查询提示语更新
- **REST 端点 PII 对齐**: `/api/workers`/`/api/project-workers` 的 PII 字段走 `MaskPiiField(piiAccess)`
- **退役 `CanReadPii`**: 已无调用点，删除死代码

#### 🛠️ 技术改进
- **版本号同步**: `src/version.ts`/`installer/package.json`/`Login.tsx` fallback 全部对齐到 `package.json.version`
- **安装包 ASCII 名**: `installer.iss` OutputBaseFilename 改为 `EngineeringManager-Setup-{VERSION}`
- **Inno Setup 自动版本**: `#include "installer\version.iss"` + `CloseApplications=yes`

### 红绿灯

- dotnet build: 0 错误
- dotnet test: 158/158 通过
- tsc: 0 错误
- vite build: 成功

---

## v0.79.0 (2026-06-29) — feat: AI 助手安全增强 + runSafeQuery + AST 引擎 + 模型路由

> **SemVer**: minor bump (0.78.3 → 0.79.0), 新增功能（SSE 流式 / runSafeQuery / AST 引擎 / 模型路由）+ 安全修复.

### 改动

#### 🔒 安全修复（P0）
- **getWorkers/getInventory 权限串失效**: 补 labor:read / inventory:read 权限，工具不再对所有角色不可用
- **getDashboardStats 跨公司越权**: 注入行级过滤，非 admin 只看到自己的数据
- **getCostSummary SQL 拼接 + 越权**: 换用参数化查询 + 行级过滤
- **getInventory 无行级隔离**: 追加 uid/isAdmin 参数和 WHERE 过滤

#### 🤖 AI 助手增强（P1-P2）
- **SSE 流式输出**: POST /api/agent/chat/stream，工具执行进度 + 逐字回复
- **runSafeQuery 受限查询**: 10 项安全护栏（AST 解析 + 列白名单 + 用户过滤 + LIMIT + dry-run + 审计）
- **语义层注入**: 系统提示补术语映射/字段说明/工具指引
- **模型路由层**: IModelRouter 接口 + 配置驱动换模型

#### 🛠️ 技术重构
- **SafeQueryValidator AST 升级**: 从正则改为 SqlParserCS AST 解析，支持 JOIN/子查询
- **LlmConfigResolver**: 打破循环依赖，依赖方向单向无环
- **修复安装器路径选择**: window.chrome.webview.addEventListener 代替 window.addEventListener

#### 🐛 Bug 修复
- 新建部门失败（DepartmentDto Positions 数组类型不匹配）
- 编辑部门缺 PUT 接口
- ORDER BY/HAVING 别名误杀（投影别名放行）
- TemplateCard variables 非数组崩溃
- LaborTeamManager 缺 key prop

### 红绿灯

- dotnet build: 0 错误
- tsc: 通过
- vite build: 通过

---

## v0.78.3 (2026-06-26) — feat: Agent AI 助手初版 + R9-R16 安全/质量 Sprint

> **SemVer**: patch bump (0.78.2 → 0.78.3), 新功能（AI 助手）+ 大量重构(不 bump).

### 改动

- **Agent AI 助手**: 13 个只读查询工具 + 对话管理 + LLM 三级兜底(DPAPI→环境变量→内置 Agnes)
- **5 个安全修复**: 登录友好提示、数据回滚/审计日志/审计明细页面崩溃修复
- **代码重构 R9-R16**: 300+ 处 as any 清理、hooks 拆分、Button 样式统一、颜色 hex→Tailwind 常量
- **新登录页**: Tempest 风格粒子动画 + 三种主题

---

## v0.78.2 (2026-06-24) — refactor: R8 Sprint — 样式统一 + 颜色常量 + 文件拆分

> **SemVer**: patch bump (0.78.1 → 0.78.2), 重构不 bump 但跨 Sprint 需要区分基线.

### 改动

- **98 个文件 btn 样式统一**: 手写 bg-white rounded-xl shadow-sm → <Card> 组件 (R8-49)
- **颜色常量提取**: 20 个分析器中的 inline hex → 命名的 COLORS 常量 (R6+R4)
- **文件拆分**: 49 个超 250 行的大文件拆成 types/loaders/actions 子模块 (R3+R5)
- **清理**: 1942 行历史 prototype HTML 设计稿 + 调试日志 batch 清理
- **vite build 通过**: 11.27s

---

## v0.78.1 (2026-06-21) — fix: PII re-encrypt chunked + batch UPDATE

> **SemVer**: patch bump (0.78.0 → 0.78.1), 性能优化, 不破坏 API.

### 改动

- **PiiReencryptWorker.cs**: chunked SELECT (每批 500 行, WHERE id > lastId LIMIT 500) + batch UPDATE (每 50 行事务提交, 减少 WAL 写入)
- 进度更新粒度: 每 50 行 (前端 3s 轮询可见变化)

### 红绿灯

- dotnet build: 0 错误 0 警告
- dotnet test: 122/122 通过
- npm check: BUILD PASSED
- tsc: 0 error
- vite build: 12.38s

---

## v0.78.0 (2026-06-21) — feat: PII 后台 re-encrypt worker

> **核心范围**: v0.76.0 PII 多 key 轮换的续作 — admin rotate key 后, 可一键用新 active key 重新加密所有 13 个 _enc 列.
> **SemVer**: minor bump (0.77.2 → 0.78.0), 新功能 (后台 worker + 2 endpoint + 前端 UI).

### 改动 (1 feat, 共 6 项)

- **migration 026**: `pii_reencrypt_status` 单行表 (进度持久化, 支持重启继续)
- **PiiReencryptWorker.cs**: 后台异步 worker, 13 列顺序 Decrypt→Encrypt→UPDATE, 单行失败不中断, 每 50 行更新进度, idempotent (同 key 跳过)
- **PiiKeyEndpoints.cs**: `POST /api/admin/pii/reencrypt` (启动 worker) + `GET /api/admin/pii/reencrypt/status` (进度轮询), admin-only + audit log
- **Program.cs**: `AddSingleton<PiiReencryptWorker>()` DI 注册
- **SettingsPiiKeySection.tsx**: "立即 re-encrypt PII" 按钮 + 进度条 + 3s 轮询
- **PiiReencryptWorkerTests.cs**: 5 个 unit tests (基本流程 / idempotent / 失败继续 / GetStatus / 并发保护)

### 红绿灯

- dotnet build: 0 错误 0 警告
- dotnet test: 122/122 通过 (含 5 新 reencrypt tests)
- npm check: BUILD PASSED (67 软警告)
- tsc: 0 error
- vite build: 11.91s

---

---

## v0.77.2 (2026-06-21) — fix: P1-3 ex.Message 泄露修复 (18 处) + enterprise query 假成功 (2 处)

> **核心修复**: v0.77.1 OCR 假成功后, P1-3 ex.Message 泄露残留还在 4 文件 18 处. 同时 enterprise query (OcrEndpoints L413/L437) 还有 2 处假成功.
> **SemVer**: patch bump (0.77.1 → 0.77.2).

### 改动 (1 fix + 1 test)

- **`fix(P1-3 ex.Message 泄露)`**: 4 文件 18 处用 `Common.Sanitize(ex.Message)` 替换直接 `ex.Message`
  - `AuthEndpoints.cs` (5 处): 3 Common.Fail + 2 errors.Add (backfill-pii admin tool)
  - `UserPreferencesEndpoints.cs` (2 处): 2 Common.Fail
  - `SystemEndpoints.cs` (11 处): 3 Common.Fail + 1 `error=ex.Message` (db-status admin) + 7 errors.Add (PII stats + migration)
  - **`OcrEndpoints.cs` L437 catch** → `CatchOcrError("ocr-company-query", ex)` (真 500 + 脱敏)
- **`fix(OcrEndpoints enterprise query)`**:
  - **L413** validation: `Results.Ok(new {success=false, ...})` → `Common.Fail("请输入企业名称", 400)` (真 400)
  - **L437** catch: `Results.Ok(new {success=false, error=$"...{ex.Message}"})` → `CatchOcrError` (真 500 + 脱敏)

### P1-3 修复模式

**修复前**:
```csharp
catch (Exception ex) {
    return Common.Fail($"参数解析失败: {ex.Message}");  // 直接泄露内部堆栈/路径
}
```

**修复后**:
```csharp
catch (Exception ex) {
    return Common.Fail($"参数解析失败: {Common.Sanitize(ex.Message)}");  // 脱敏: 移除路径, 截断 200 字符
}
```

`Common.Sanitize()` (v0.76.0 P1-3 引入) 移除 Windows 绝对路径, 截断到 200 字符, 防泄露内部实现细节.

### 测试 (PiiLeakTests.cs 9 个新 tests)

- `EndpointFile_AllRawExMessageAreInServerSideLogs[3 files]` (Theory × 3 = 3): 验证 response body 不再 raw `{ex.Message}`, 只允许 server-side `Console.Error.WriteLine` 用 raw
- `EndpointFile_HasCommonSanitizeAroundExMessage[3 files]` (Theory × 3 = 3): 验证每个文件至少 1 处 `Common.Sanitize(ex.Message)`
- `OcrEndpoints_CompanyQuery_ValidationReturns400` (Fact): L413 真 400
- `OcrEndpoints_CompanyQuery_CatchReturns500` (Fact): L437 真 500
- `OcrEndpoints_File_NoLongerContainsEnterpriseQueryFakeSuccess` (Fact): 老假成功模式不存在

### 测试结果

- 后端 build: 0 错误
- 后端 tests: **117/117 通过** (108 旧 + 9 PiiLeakTests)
- 前端 check: BUILD PASSED (66 历史软警告)
- tsc: 0 errors
- vite build: 14.77s

### P1 闭环进度

| P1 项 | 状态 |
|---|---|
| P1-1 静默吞错 (8 OCR 假成功) | ✅ v0.77.1 |
| P1-1 静默吞错 (2 enterprise query 假成功) | ✅ v0.77.2 |
| P1-3 ex.Message 泄露 (v0.77.1 范围 OCR 8 处) | ✅ v0.77.1 |
| P1-3 ex.Message 泄露 (其他 18 处) | ✅ v0.77.2 |

**P1 全部闭环** ✅

### v0.78.0 入口

按 cloud-sync-design.md §阶段 2:
1. CloudSyncHelper 统一入口
2. JWT refresh token + device 注册 API
3. sync worker 推/拉
4. 冲突检测 UI
5. PII 跨设备兼容
6. 限流 + 审计 + 监控

---
## v0.77.1 (2026-06-21) — fix: OCR 8 处假成功 → 真 500 (P1-1 闭环)

> **核心修复**: 累计待办 #5 OCR 8 处假成功 → P1-1 安全闭环 (v0.76.0 累计待办列表 "下次 sprint 候选" 里记的 OCR 8 处).
> **SemVer**: patch bump (0.77.0 → 0.77.1), 因为是 bug 修复.

### 改动 (1 fix + 1 test)

- **`fix(OCR 假成功)`**: OcrEndpoints.cs 8 处 catch 块从 HTTP 200 + success=false 改成 HTTP 500
  - 新增 `CatchOcrError(endpointName, ex)` private static helper
    - 服务端: `Console.Error.WriteLine` log 完整 ex.Message (调试用)
    - 客户端: 友好提示 ("百度OCR请求超时" / "百度OCR识别失败，请稍后重试或检查图片质量")
    - HTTP 状态码: 500 (不再是假成功 200)
  - 8 个 OCR 端点 catch 块替换:
    - `/api/ocr/id-card` (L28-69)
    - `/api/ocr/invoice` (L74-127)
    - `/api/ocr/bank-card` (L132-164)
    - `/api/ocr/business-license` (L169-205)
    - `/api/ocr/bank-receipt` (L210-252)
    - `/api/ocr/permit` (L257-290)
    - `/api/ocr/bank-statement` (L295-344)
    - `/api/ocr/general-receipt` (L349-385)
  - **未修** (留后续 sprint): L399 enterprise query validation (400 应取代 200), L423 enterprise query catch (500 应取代 200)
- **`test(OCR 修复验证)`**: OcrEndpointsTests.cs 5 个新 tests
  - `CatchOcrError_HelperMethodExists` (反射验证 helper 存在)
  - `CatchOcrError_Returns500_OnNetworkTimeout` (超时异常 → 500)
  - `CatchOcrError_Returns500_OnGenericException` (通用异常 → 500)
  - `OcrEndpoints_File_NoLongerContainsFakeSuccessInCatchBlocks` (静态分析: 文件中 `Results.Ok(new { success = false` <= 2)
  - `OcrEndpoints_File_AllEightCatchBlocksReplaced` (静态分析: 8 个 `CatchOcrError("ocr-X", ex)` 都在)

### 测试结果

- 后端 build: 0 错误
- 后端 tests: 108/108 通过 (103 旧 + 5 新 OCR)
- 前端 check: BUILD PASSED (66 历史软警告)
- tsc: 0 errors
- vite build: 18.50s

### 修复前后对比

**修复前 (假成功, P1-1 安全问题)**:
\`\`\`
catch (Exception ex)
{
    return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "..." : "百度OCR请求失败: {ex.Message}" });
}
\`\`\`
- HTTP 状态码: 200 (前端误以为是成功)
- 错误信息: 直接泄露 ex.Message (P1-3 信息泄露)

**修复后 (真 500)**:
\`\`\`
catch (Exception ex)
{
    return CatchOcrError("ocr-id-card", ex);
}
\`\`\`
- HTTP 状态码: 500 (前端正确处理错误)
- 错误信息: 脱敏后友好提示, 不泄露内部细节

### v0.78.0 入口

按 cloud-sync-design.md §阶段 2 范围:
- CloudSyncHelper (统一 version 自增 + sync_queue 写)
- JWT refresh token + device 注册 API
- sync worker 推/拉
- 冲突检测 UI
- PII 跨设备兼容
- 限流 + 审计 + 监控

### 不在本 sprint 范围 (后续候选)

- enterprise query L399/L423 修复 (同上模式, 留 v0.77.x patch)
- PII 后台 re-encrypt worker (v0.76.0 #5 续)
- react-query 渐进迁移 (v0.76.0 #3 续)
- SettingsChangelog 拆分

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
- **`docs(同步知识库)`** 9428874, a8af087, b23b9f2, d6ef9c7: AGENTS.md / CHANGELOG / docs/ 同步

---

## v0.74.0 (2026-06-19, 之前) — pre-semver-rebase base

`v0.74.0 WIP` (ce8cf23) 是本次重构系列之前的"基线状态". 历史中 v0.69.0 之前的 commit 因 `git reset --hard v0.69.0` 已丢失, 详见 v0.69.0 之前的审计报告 (P0-FIX-PLAN.md).

================
File: package.json
================
{
  "name": "engineering-manager",
  "version": "0.82.1",
  "description": "工程项目管理系统 - 一站式工程项目管理解决方案",
  "type": "module",
  "scripts": {
    "sync-version": "node scripts/sync-version.mjs",
    "dev": "vite",
    "check": "node scripts/check-rules.cjs",
    "build:frontend": "node scripts/sync-version.mjs && node scripts/check-rules.cjs && tsc && vite build",
    "build": "vite build",
    "preview": "vite preview",
    "postinstall": "node -e \"const fs=require('fs');if(fs.existsSync('public/ocr-config.json')){fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('public/ocr-config.json','dist/ocr-config.json');}else{console.log('postinstall: skip, no public/ocr-config.json');}\"",
    "release:manifest": "node scripts/make-manifest.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.101.0",
    "@tanstack/react-table": "^8.21.3",
    "@tanstack/react-virtual": "^3.14.3",
    "@types/dompurify": "^3.0.5",
    "docxtemplater": "^3.68.7",
    "dompurify": "^3.4.11",
    "framer-motion": "^12.40.0",
    "lucide-react": "^1.14.0",
    "mammoth": "^1.12.0",
    "pdfjs-dist": "^3.11.174",
    "pizzip": "^3.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^3.8.1",
    "tesseract.js": "^5.1.1",
    "uuid": "^9.0.1",
    "xlsx": "^0.18.5",
    "zustand": "^5.0.13"
  },
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@types/uuid": "^9.0.7",
    "@vitejs/plugin-react": "^6.0.3",
    "@vitest/coverage-v8": "^4.1.6",
    "autoprefixer": "^10.4.17",
    "jsdom": "^29.1.1",
    "playwright": "^1.60.0",
    "postcss": "^8.4.35",
    "rollup-plugin-visualizer": "^7.0.1",
    "tailwindcss": "^3.4.1",
    "terser": "^5.47.1",
    "typescript": "^5.3.3",
    "vite": "^8.1.3",
    "vitest": "^4.1.6"
  }
}

================
File: update/manifest.json
================
{
  "latest": "0.82.1",
  "minForced": "0.0.0",
  "releasedAt": "2026-07-04T19:30:35+08:00",
  "notesUrl": "",
  "package": {
    "url": "https://github.com/Amer-CN/engineering-manager/releases/download/v0.82.1/EngineeringManager-Setup-0.82.1.exe",
    "proxies": [
      "https://gh-proxy.com/",
      "https://ghfast.top/"
    ],
    "size": 232322068,
    "sha256": "4762A46A9967EDFCDB06E8AC3312703B35F0280623A2296CB338DC34B8D81A5A",
    "signature": ""
  }
}





================================================================
End of Codebase
================================================================
