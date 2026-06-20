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