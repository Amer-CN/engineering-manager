# WRITE-AUTH-MATRIX.md — 后端写操作端点权限盘点（窗口 C 产出）

> 生成：2026-08-05 · HEAD：ddedc19（工作区干净）· 提取方式：本地 grep `app.(MapPost|MapPut|MapPatch|MapDelete)` 于 `EngineeringManager.Api/Endpoints/` 全部 22 个文件
> 哨兵：**提取总数 169 ≥ 40 ✓**（提取器未失效，逐条人工复核 handler 后分类）
> 状态：C-1 完成 · C-2 待拍板。本文所有结论可据 file:line 复核。

## 0. 执行状态（2026-08-05 拍板后更新 · 审查整改后 v2）

- **拍板**：Q1 认可（037+GetDefaultPermissions+permissions.ts 同 commit）· Q2 选 C（G2 暂缓，本轮 = G1 + T1 高危 + T3 迁移）
- **Q3 终裁（2026-08-07）**：角色授予矩阵维持现状已拍板——不新增/不调整角色-权限授予关系（窗口 K 记档）
- **C-3 已完成**：`037_AppendPermissionCodesToRoles.sql`（21 条 UPDATE：9 缺码 + drawings:read，幂等 append + JSON 守卫：旧格式 'all'/逗号串跳过、NULL/[] 重建——sqlite 四种形态验证通过）；Common.cs GetDefaultPermissions 同步 10 码；permissions.ts 静态 SYSTEM_ROLES 核对一致（无改动）；门禁1 LEGACY_EXEMPT 删除（B−C 0 违反）；Issue #5 已回帖（issuecomment-5190187160）
- **C-4 已完成（T1+T2 共 20 端点）**：G1 12 + users/roles 5 + **T1 破坏性 3（sqlite/migrate、restore、cost-ledger/categories/reset → settings:update）**，保留 created_by/IsAdmin SQL 第二道防线
- **C-5 已完成**：scripts/check-write-permission.cjs（哨兵 ≥40；合规 = HasPermission / !IsAdmin / !isAdmin / isAdmin==0；豁免清单 46 设计 + 84 G2 暂缓带理由）；接入 npm run check；反自检通过（临时无检查端点 → exit 1）
- **C-6 已完成**：WritePermissionTests 12/12（worker 403×7 / admin 200×5 含库验证 / 旧格式 fail-closed）；全量验收：dotnet build 0 错 0 警 · dotnet test 692 通过 / 2 跳过（基线实测 680/2/682 + 12 新增）· npm run check ✓ · check:version ✓ · tsc --noEmit ✓ · vite build ✓
- **基线修正**：任务书基线「672 通过 / 2 跳过 / 674」与 ddedc19 实测（680/2/682，stash 后全量复跑）不符——差 8，非本窗口测试所致，以实测为准
- **数字勘误**：C-1「E 32」为汇总节手误（矩阵表逐行 E 实为 19，门禁5 机器提取 36 = 17 新 + 19 原）；「G2 约 79」为手算误差（精确值 84 端点，门禁5 豁免口径）；「9 个新码」应为 **10 个**（含 drawings:read）
- **遗留**：G2 约 84 端点暂缓（门禁5 豁免清单带理由记录），待前端补 can() 后二期执行；Issue #5 costLedger 静态展示偏离仍在（不影响实际权限）

## 1. 防线分类定义

| 分类 | 含义 | 判据 |
|------|------|------|
| A | 无防线 | 无 uid 获取，仅依赖中间件（仅白名单端点，或匿名可达） |
| B | 仅登录 | handler 内有 `GetUserId ?? throw` / `未登录` 检查；无权限码、无数据归属 SQL 兜底 |
| C | created_by 弱兜底 | 写 SQL 带 `(created_by=@Uid OR @IsAdmin=1)` 或 `UserFilterFragmentForProject`（第二道防线，非权限码） |
| D | DataScope 过滤 | 写 SQL 带 `UserFilterWithAuthorizedProjects` / `UserFilterCompany`（数据范围过滤） |
| E | 权限码 / 角色硬校验 | handler 内 `CurrentUser.HasPermission(...)` 或 `!IsAdmin → Forbid/403` |

> 注：所有非白名单端点都过 `GlobalAuthMiddleware`（仅登录校验，无权限码）。B 类 = 登录即可写。

## 2. 全量矩阵（22 文件 · 169 端点）

### 2.1 AgentEndpoints.cs（10）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 26 | POST /api/agent/chat | B（对话/消息按 uid 隔离在 service） | 无 | 豁免（用户自助·自属数据） |
| 197 | POST /api/agent/chat/stream | B（同上） | 无 | 豁免（用户自助·自属数据） |
| 465 | DELETE /api/agent/conversations/{id} | B（service 内 uid 校验） | 无 | 豁免（用户自助·自属数据） |
| 491 | PUT /api/agent/conversations/{id} | B（同上） | 无 | 豁免（用户自助·自属数据） |
| 533 | PATCH /api/agent/conversations/{id}/archive | B（同上） | 无 | 豁免（用户自助·自属数据） |
| 555 | PATCH /api/agent/conversations/{id}/unarchive | B（同上） | 无 | 豁免（用户自助·自属数据） |
| 577 | PATCH /api/agent/conversations/{id}/restore | B（同上） | 无 | 豁免（用户自助·自属数据） |
| 631 | POST /api/agent/setup/test | A（白名单 /api/agent/setup） | 无 | 豁免（首次启动引导） |
| 667 | POST /api/agent/setup/save | E（L674-675 IsAdmin → 403） | 无 | 维持 E |
| 738 | POST /api/agent/config/reload | E（L745-746 IsAdmin → 403） | 无 | 维持 E |

### 2.2 AuthEndpoints.cs（13）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 20 | POST /api/auth/login | A（白名单） | 无 | 豁免（登录） |
| 60 | POST /api/auth/reset-password | E（L65-66 IsAdmin） | 无 | 维持 E |
| 88 | POST /api/auth/change-password | B（uid 取自 JWT，只能改自己） | 无 | 豁免（用户自助） |
| 197 | PUT /api/roles | B + EditionFeatures ⚠️ **任何登录用户可改写任意角色权限 JSON** | 无（roles:update 码存在但前端角色页未用 can） | `roles:update`（G2） |
| 205 | POST /api/roles/{id}/reset | B + EditionFeatures ⚠️ 同上（角色重置路径） | 无 | `roles:update`（G2） |
| 232 | POST /api/users | B + EditionFeatures ⚠️ **任何登录用户可建用户（含 admin 角色）** | 无 | `users:create`（G2） |
| 244 | PUT /api/users | B + EditionFeatures ⚠️ **任何登录用户可改任意用户（角色/密码）** | 无 | `users:update`（G2） |
| 264 | DELETE /api/users/{id} | B + EditionFeatures ⚠️ 任何登录用户可删任意用户 | 无 | `users:delete`（G2） |
| 273 | POST /api/admin/backfill-pii | E（L277 IsAdmin） | 无 | 维持 E |
| 382 | POST /api/admin/project-authorizations | E（L387 IsAdmin） | 无 | 维持 E |
| 411 | DELETE /api/admin/project-authorizations/{projectId}/{userId} | E（L416 IsAdmin） | 无 | 维持 E |
| 427 | POST /api/admin/unmask-pii | E（L431 IsAdmin） | 无 | 维持 E |
| 497 | PUT /api/user-profile | B（uid 取自 JWT，只改自己） | 无 | 豁免（用户自助） |

> ⚠️ 2.2 的 users/roles 四个端点（197/205/232/244/264）当前**仅登录即可调用**，是 C-4 最高优先批次。

### 2.3 ContractEndpoints.cs（17）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 75 | POST /api/contracts/income | B（created_by 写入） | 无 | `contracts:create`（G2） |
| 119 | POST /api/contracts/expense | B | 无 | `contracts:create`（G2） |
| 162 | POST /api/contracts/agreement | B | 无 | `contracts:create`（G2） |
| 187 | PUT /api/contracts/income | C（UserFilterFragmentForProject） | `contracts:update`（ContractPage:99,293） | `contracts:update`（G1） |
| 229 | PUT /api/contracts/expense | C（同上） | `contracts:update` | `contracts:update`（G1） |
| 269 | PUT /api/contracts/agreement | C（created_by OR IsAdmin） | `contracts:update` | `contracts:update`（G1） |
| 289 | DELETE /api/contracts/income/{id} | C | `contracts:delete`（ContractPage:124） | `contracts:delete`（G1） |
| 297 | DELETE /api/contracts/expense/{id} | C | `contracts:delete` | `contracts:delete`（G1） |
| 305 | DELETE /api/contracts/agreement/{id} | C | `contracts:delete` | `contracts:delete`（G1） |
| 326 | POST /api/contract-templates | B | 无 | `contracts:update`（G2，模板属合同模块） |
| 334 | PUT /api/contract-templates | C | 无 | `contracts:update`（G2） |
| 344 | DELETE /api/contract-templates/{id} | C | 无 | `contracts:update`（G2） |
| 370 | POST /api/settlements | B | 无 | `settlement:create`（G2） |
| 414 | PUT /api/settlements | C | 无 | `settlement:update`（G2） |
| 457 | DELETE /api/settlements/{id} | C | `settlement:delete`（SettlementProjectActions:92 / useSettlementHandlers:103） | `settlement:delete`（G1） |
| 464 | PUT /api/settlements/{id}/process | C | `settlement:approve`（SettlementProjectActions:116 / useSettlementHandlers:127） | `settlement:approve`（G1+G3：码不存在） |
| 474 | PUT /api/settlements/{id}/unarchive | C | 无 | `settlement:update`（G2） |

### 2.4 CostLedgerEndpoints.cs（14）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 49 | POST /api/cost-ledger | B | 无 | `costLedger:create`（G2） |
| 60 | PUT /api/cost-ledger | D（UserFilterWithAuthorizedProjects） | 无 | `costLedger:update`（G2） |
| 73 | DELETE /api/cost-ledger/{id} | D | 无 | `costLedger:delete`（G2） |
| 81 | POST /api/cost-ledger/batch | B | 无 | `costLedger:create`（G2） |
| 116 | POST /api/cost-ledger/categories | B | 无 | `costLedger:update`（G2，分类属配置） |
| 126 | PUT /api/cost-ledger/categories | B（无任何归属过滤） | 无 | `costLedger:update`（G2） |
| 135 | DELETE /api/cost-ledger/categories/{id} | B（无归属过滤） | 无 | `costLedger:update`（G2） |
| 142 | POST /api/cost-ledger/categories/reset | B ⚠️ **全表清空分类** | 无 | `costLedger:update`（G2） |
| 163 | POST /api/cost-ledger/batches | B | 无 | `costLedger:create`（G2） |
| 172 | POST /api/cost-ledger/batches/{id}/copy | B | 无 | `costLedger:create`（G2） |
| 183 | PUT /api/cost-ledger/batches/{id} | D | 无 | `costLedger:update`（G2） |
| 193 | DELETE /api/cost-ledger/batches/{id} | D | 无 | `costLedger:delete`（G2） |
| 212 | POST /api/cost-ledger/match-rules | B | 无 | `costLedger:update`（G2） |
| 239 | POST /api/cost-ledger/{batchId}/sheet | D（批次归属校验 + UserFilter，L249-253 返回 403） | 无 | `costLedger:update`（G2） |

### 2.5 FileEndpoints.cs（8）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 48 | POST /api/files/save | B（IsPathSafe 防穿越） | 无 | 豁免（通用文件基础设施）⚠️ 见观察项 O2 |
| 120 | DELETE /api/drawings/{id} | C | 无 | `drawings:delete`（G2+G3：码不存在） |
| 131 | POST /api/drawings | B | 无 | `drawings:create`（G2+G3） |
| 168 | PUT /api/drawings | C | 无 | `drawings:update`（G2+G3） |
| 188 | POST /api/inventory/transactions | B | 无 | `inventory:create`（G2+G3：码不存在） |
| 218 | POST /api/files/delete | B（IsPathSafe） | 无 | 豁免（通用文件基础设施）⚠️ 见观察项 O2 |
| 238 | POST /api/files/open-external | B（扩展名白名单） | 无 | 豁免（文件查看基础设施） |
| 288 | POST /api/contracts/save-file | B | 无 | `contracts:update`（G2，合同附件） |

### 2.6 InventoryEndpoints.cs（6）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 30 | POST /api/inventory | B | 无 | `inventory:create`（G2+G3：码不存在） |
| 42 | PUT /api/inventory | C | 无 | `inventory:update`（G2+G3） |
| 55 | DELETE /api/inventory/{id} | C | `inventory:delete`（useInventoryPage:75） | `inventory:delete`（G1+G3：码不存在） |
| 89 | POST /api/materials | B | 无 | `inventory:create`（G2+G3） |
| 100 | PUT /api/materials | C | 无 | `inventory:update`（G2+G3） |
| 112 | DELETE /api/materials/{id} | C | `inventory:delete`（useInventoryPage:124） | `inventory:delete`（G1+G3） |

### 2.7 InvoiceEndpoints.cs（6）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 41 | POST /api/invoices | B | 无 | `invoices:create`（G2） |
| 71 | PUT /api/invoices | C | 无 | `invoices:update`（G2） |
| 106 | DELETE /api/invoices/{id} | C（软删） | 无 | `invoices:delete`（G2） |
| 173 | POST /api/payment-records | B | 无 | `invoices:create`（G2，收付款记录） |
| 198 | PUT /api/payment-records | C | 无 | `invoices:update`（G2） |
| 226 | DELETE /api/payment-records/{id} | C（软删） | 无 | `invoices:delete`（G2） |

### 2.8 KnowledgeEndpoints.cs（3）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 29 | POST /api/knowledge/documents | E（HasPermission `knowledge:read` L38） | 路由级 `knowledge:read`（App.tsx:303） | 维持 E（注：写操作用 read 码，既有设计） |
| 204 | DELETE /api/knowledge/documents/{id} | E（HasPermission `knowledge:read` L213） | 无 | 维持 E |
| 354 | POST /api/knowledge/seed-entities | E（IsAdmin L361） | 无 | 维持 E |

### 2.9 MemberEndpoints.cs（14）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 67 | POST /api/members | B | 无 | `members:create`（G2） |
| 86 | PUT /api/members | C | 无 | `members:update`（G2） |
| 106 | DELETE /api/members/{id} | C | 无 | `members:delete`（G2） |
| 154 | POST /api/workers | B | 无 | `members:create`（G2，工人档案） |
| 170 | PUT /api/workers | C | 无 | `members:update`（G2） |
| 188 | DELETE /api/workers/{id} | C | 无 | `members:delete`（G2） |
| 235 | POST /api/project-workers | B | 无 | `members:create`（G2） |
| 245 | DELETE /api/project-workers/{id} | C | 无 | `members:delete`（G2） |
| 277 | POST /api/departments | B | 无 | `members:create`（G2） |
| 286 | PUT /api/departments | C | 无 | `members:update`（G2） |
| 301 | DELETE /api/departments/{id} | C | 无 | `members:delete`（G2） |
| 331 | POST /api/worker-teams | B | 无 | `members:create`（G2） |
| 339 | PUT /api/worker-teams | B ⚠️ **无归属过滤（唯一一个）** | 无 | `members:update`（G2） |
| 348 | DELETE /api/worker-teams/{id} | C | 无 | `members:delete`（G2） |

### 2.10 OcrEndpoints.cs（10）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 44 | POST /api/ocr/id-card | B（无状态，调百度 API，不写业务库） | 无 | 豁免（无状态识别服务） |
| 90 | POST /api/ocr/invoice | B（同上） | 无 | 豁免 |
| 148 | POST /api/ocr/bank-card | B | 无 | 豁免 |
| 185 | POST /api/ocr/business-license | B | 无 | 豁免 |
| 226 | POST /api/ocr/bank-receipt | B | 无 | 豁免 |
| 273 | POST /api/ocr/permit | B | 无 | 豁免 |
| 311 | POST /api/ocr/bank-statement | B | 无 | 豁免 |
| 365 | POST /api/ocr/general-receipt | B | 无 | 豁免 |
| 406 | POST /api/ocr/company-query | B | 无 | 豁免 |
| 471 | POST /api/ocr/clear-token-cache | E（L473 IsAdmin） | 无 | 维持 E |

### 2.11 PartnerEndpoints.cs（6）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 47 | POST /api/partners | B | 无 | `partners:create`（G2） |
| 82 | PUT /api/partners | C | 无 | `partners:update`（G2） |
| 122 | DELETE /api/partners/{id} | C | 无 | `partners:delete`（G2） |
| 148 | POST /api/supervisors | B | 无 | `partners:create`（G2，监管单位） |
| 163 | PUT /api/supervisors | C | 无 | `partners:update`（G2） |
| 179 | DELETE /api/supervisors/{id} | C | 无 | `partners:delete`（G2） |

### 2.12 PiiKeyEndpoints.cs（2）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 39 | POST /api/admin/pii/rotate | E（IsAdmin L43） | 无 | 维持 E |
| 88 | POST /api/admin/pii/reencrypt | E（IsAdmin L92） | 无 | 维持 E |

### 2.13 ProjectEndpoints.cs（5）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 106 | POST /api/projects | B | `projects:create`（ProjectFilters:66 按钮渲染） | `projects:create`（G1） |
| 116 | PUT /api/projects/{id} | C | 无（前端无 projects:update 门控） | `projects:update`（G2） |
| 129 | DELETE /api/projects/{id} | C | `projects:delete`（Projects:43） | `projects:delete`（G1） |
| 149 | POST /api/project-members | B | 无 | `projects:update`（G2，项目成员） |
| 160 | DELETE /api/project-members/{id} | C | 无 | `projects:update`（G2） |

### 2.14 ProjectWorkerMiscEndpoints.cs（3）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 14 | POST /api/project-workers/batch | B | 无 | `members:create`（G2） |
| 27 | PUT /api/project-workers | C | 无 | `members:update`（G2） |
| 36 | PUT /api/invoices/{id}/status | C | 无 | `invoices:update`（G2） |

### 2.15 RegionEndpoints.cs（2）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 20 | POST /api/regions | B | 无 | 豁免（基础字典）或 `settings:update` |
| 28 | DELETE /api/regions/{id} | B | 无 | 豁免（基础字典）或 `settings:update` |

### 2.16 ReportEndpoints.cs（1）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 15 | POST /api/reports/generate | E（HasPermission `reports:create` L26） | 路由级 `reports:create`（App.tsx:304） | 维持 E |

### 2.17 SttEndpoints.cs（3）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 31 | POST /api/stt/upload | B（路径按 uid 隔离） | 无 | 豁免（用户自助·自属数据） |
| 105 | POST /api/stt/transcribe | B（job created_by=uid） | 无 | 豁免（用户自助·自属数据） |
| 324 | POST /api/stt/jobs/{id}/ingest | E（HasPermission `knowledge:read` L334） | 无 | 维持 E |

### 2.18 SystemEndpoints.cs（17）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 24 | POST /api/admin/db-checkpoint | E（IsAdmin L28） | 无 | 维持 E |
| 113 | POST /api/audit/logs | B ⚠️ 见观察项 O1 | 无 | 豁免（审计写入）或 `settings:update` |
| 153 | POST /api/audit/clear | E（isAdmin==0 → Forbid L158） | 无 | 维持 E |
| 195 | POST /api/snapshots | B | 无 | `settings:update`（G2）或豁免（备份基础设施） |
| 207 | DELETE /api/snapshots/{id} | B | 无 | `settings:update`（G2）⚠️ 删备份文件 |
| 222 | POST /api/snapshots/{id}/restore | E（IsAdmin L225） | 无 | 维持 E |
| 240 | PUT /api/snapshots/max-count | B（STUB：no-op 返回 Ok） | 无 | 豁免（STUB 空操作） |
| 283 | PUT /api/config/data-path | E（IsAdmin L287） | 无 | 维持 E |
| 382 | PUT /api/config/gpu-acceleration | B | 无 | `settings:update`（G2） |
| 498 | POST /api/health/export-json | B（STUB：返回 exported=0） | 无 | 豁免（STUB） |
| 503 | POST /api/health/reconcile | B（STUB：返回 true） | 无 | 豁免（STUB） |
| 513 | POST /api/backup | B | 无 | `settings:update`（G2）或豁免（前端已 isAdmin 隐藏） |
| 530 | POST /api/restore | B ⚠️ **从桌面备份覆盖生产库** | 无 | `settings:update`（G2）⚠️ 前端已 isAdmin 隐藏（DataStorageSection:22） |
| 552 | POST /api/diagnose | B（只读 PRAGMA） | 无 | 豁免（只读诊断） |
| 568 | POST /api/sqlite/enable | B（STUB：返回就绪） | 无 | 豁免（STUB） |
| 579 | POST /api/sqlite/migrate | B ⚠️ **DELETE FROM 全表 + JSON 重灌** | 无 | `settings:update`（G2）⚠️ 高危 |
| 630 | PUT /api/sqlite/read-mode | B | 无 | `settings:update`（G2） |

### 2.19 TemplateEndpoints.cs（3）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 21 | DELETE /api/templates/{id} | B（无归属过滤） | 无 | `settings:update`（G2）※ templates 非 PermissionResource |
| 38 | POST /api/templates | B | 无 | `settings:update`（G2） |
| 60 | PUT /api/templates | B | 无 | `settings:update`（G2） |

### 2.20 UpdateEndpoints.cs（3）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 17 | POST /api/update/download | A（白名单 /api/update/download） | 无 | 豁免（更新基础设施） |
| 34 | POST /api/update/download/cancel | A（白名单前缀匹配） | 无 | 豁免（更新基础设施） |
| 67 | POST /api/update/apply | B（非白名单，需登录） | 无 | 豁免（更新基础设施，需登录） |

### 2.21 UserPreferencesEndpoints.cs（2）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 42 | PUT /api/user-preferences | B（uid 取自 JWT） | 无 | 豁免（用户自助） |
| 94 | PUT /api/user-preferences/{key} | B（同上） | 无 | 豁免（用户自助） |

### 2.22 WageEndpoints.cs（21）

| 行 | 方法+路径 | 防线 | 前端码 | 建议码 |
|----|-----------|------|--------|--------|
| 57 | POST /api/attendances | B | 无 | `wages:create`（G2） |
| 71 | PUT /api/attendances | C | 无 | `wages:update`（G2） |
| 84 | DELETE /api/attendances/{id} | C | 无 | `wages:delete`（G2） |
| 92 | POST /api/attendances/batch-delete | C | 无 | `wages:delete`（G2） |
| 103 | POST /api/attendances/batch-create | B | 无 | `wages:create`（G2） |
| 119 | POST /api/attendances/generate | B（STUB：count=0） | 无 | `wages:create`（G2，STUB） |
| 126 | POST /api/attendances/generate-v2 | B（STUB） | 无 | `wages:create`（G2，STUB） |
| 133 | POST /api/attendances/batch-import | B（STUB） | 无 | `wages:create`（G2，STUB） |
| 186 | POST /api/wages | B | 无 | `wages:create`（G2） |
| 227 | PUT /api/wages | C | 无 | `wages:update`（G2） |
| 271 | DELETE /api/wages/{id} | C（软删） | 无 | `wages:delete`（G2） |
| 279 | POST /api/wages/batch-delete | C（软删） | 无 | `wages:delete`（G2） |
| 290 | POST /api/wages/batch-clear-payments | C | 无 | `wages:update`（G2） |
| 302 | POST /api/wages/archive | C | 无 | `wages:update`（G2，归档） |
| 315 | POST /api/wages/batch-unarchive | C | 无 | `wages:update`（G2） |
| 327 | POST /api/wages/match-receipts | B（STUB） | 无 | `wages:update`（G2，STUB） |
| 334 | POST /api/wages/confirm-matches | B（STUB） | 无 | `wages:update`（G2，STUB） |
| 399 | POST /api/wages/batch-save | B ⚠️ **upsert DO UPDATE 无 created_by 守卫**（INSERT 写 created_by 但冲突更新路径不校验归属） | 无 | `wages:update`（G2） |
| 470 | POST /api/wages/batch-payment | C（L499 created_by OR IsAdmin + payment_locked 守卫） | 无 | `wages:update`（G2）※ 或 `wages:approve`（码不存在，G3，拍板点） |
| 527 | DELETE /api/salary-history/{id} | C | 无 | `wages:delete`（G2） |
| 535 | POST /api/salary-history | B | 无 | `wages:create`（G2） |

## 3. 汇总统计

**按防线分类**（169 端点）：

| 防线 | 计数 | 说明 |
|------|------|------|
| A（无/白名单） | 5 | login、agent/setup/test、update/download×2（白名单） |
| B（仅登录） | 66 | 含 12 个 STUB/无状态、15 个用户自助豁免候选 |
| C（created_by 弱兜底） | 59 | 数据归属第二道防线，但**无权限码** |
| D（DataScope 过滤） | 7 | costLedger 写端点（P0-4 成果，不许动） |
| E（HasPermission/IsAdmin） | 32 | 含 14 个 admin-only（IsAdmin 硬校验，无需再码） |

**按建议动作**：

| 动作 | 计数 |
|------|------|
| 维持 E（已硬校验） | 32 |
| 豁免候选（自助/无状态/STUB/基础设施/白名单） | 46 |
| 需加权限码（G1+G2+G3 执行候选） | 91 |

## 4. 前端门禁1 权限码 ↔ 后端端点映射（B 集合 12 码）

| 前端码 | 调用点 | 后端对应端点 | 后端现状 |
|--------|--------|--------------|----------|
| `projects:create` | ProjectFilters.tsx:66（按钮渲染） | POST /api/projects | B → G1 |
| `projects:delete` | Projects.tsx:43（守卫） | DELETE /api/projects/{id} | C → G1 |
| `projects:update` | 前端未使用 | PUT /api/projects/{id} | C → G2（码存在，未接执行） |
| `projects:export` | Projects.tsx:67 / ProjectFilters.tsx:61 | **无后端端点**（纯前端工具） | G3（码缺失，无需 C-4） |
| `contracts:update` | ContractPage.tsx:99,293 | PUT /api/contracts/income·expense·agreement | C → G1 |
| `contracts:delete` | ContractPage.tsx:124 | DELETE /api/contracts/*/{id} | C → G1 |
| `contracts:export` | ContractPage.tsx:111,273 | **无后端端点**（纯前端工具） | G3（码缺失，无需 C-4） |
| `settlement:delete` | SettlementProjectActions.tsx:92 / useSettlementHandlers.ts:103 | DELETE /api/settlements/{id} | C → G1 |
| `settlement:approve` | SettlementProjectActions.tsx:116 / useSettlementHandlers.ts:127 | PUT /api/settlements/{id}/process | C → G1+G3（码缺失） |
| `inventory:delete` | useInventoryPage.ts:75,124 | DELETE /api/inventory/{id} + /api/materials/{id} | C → G1+G3（码缺失） |
| `knowledge:read` | App.tsx:303（路由级） | knowledge/* 全部 + stt/jobs/{id}/ingest | E ✓ |
| `reports:create` | App.tsx:304（路由级） | POST /api/reports/generate | E ✓ |
| `settings:read` | App.tsx:306（路由级） | （读端点，无写对应） | — |

## 5. 观察项（不属本轮范围，供记录）

- **O1**：POST /api/audit/logs（SystemEndpoints.cs:113）的 `user_id`/`user_name` 仍取 DTO 字段（L121 `entry.UserId`），与 SECURITY-AUDIT.md「P1-4 已修复（改从 JWT uid claim）」的声称不符——修复可能在旧 AuditEndpoints.cs，迁移到 SystemEndpoints.cs 时带回 DTO 取值。建议后续核。
- **O2**：files/save 与 files/delete 无业务归属校验（任何登录用户可删任意上传附件），IsPathSafe 只防路径穿越。若豁免清单采纳，建议在门禁5 豁免理由中显式记录该风险。
- **O3**：wages/batch-save（WageEndpoints.cs:399）upsert 的 DO UPDATE 分支无 created_by 归属校验（INSERT 路径有，冲突更新路径没有）——C 类防线不完整，若加 `wages:update` 权限码可覆盖该缺口。
- **O4**：member 写端点（members/workers/departments/worker-teams）无前端权限码，执行后端码后需确认各角色授予矩阵（见 C-2 拍板点）。

## 6. C-2 缺口分类与分配方案（待拍板）

### 6.1 分类定义（按任务口径）

- **G1 前端有码后端未执行**：前端 can() 门控存在，后端端点无 HasPermission。
- **G2 前后端都无码**：需造新码（资源不在 17 资源表）或接执行已有码。
- **G3 码不在任何角色**：GetDefaultPermissions + roles 表均无此码，需迁移 037 追加。

### 6.2 G1：前端有码、后端未执行（7 码 → 12 端点）

| 权限码 | 端点（文件:行） | 现状防线 | 说明 |
|--------|-----------------|----------|------|
| `projects:create` | ProjectEndpoints.cs:106 | B | 按钮渲染已按码 |
| `projects:delete` | ProjectEndpoints.cs:129 | C | 守卫已按码 |
| `contracts:update` | ContractEndpoints.cs:187/229/269 | C | 守卫已按码 |
| `contracts:delete` | ContractEndpoints.cs:289/297/305 | C | 守卫已按码 |
| `settlement:delete` | ContractEndpoints.cs:457 | C | 守卫已按码 |
| `settlement:approve` | ContractEndpoints.cs:464 | C | 守卫已按码；**码同时在 G3** |
| `inventory:delete` | InventoryEndpoints.cs:55/112 | C | 守卫已按码；**码同时在 G3** |

> G1 执行后**零行为突变**（前端码与后端码同源，同一次登录响应下发）。

### 6.3 G3：码不在任何角色（9 码，需迁移 037 追加）

| 权限码 | 涉及端点 | 前端现状 | 建议授予（对齐 src/types/permissions.ts 静态 SYSTEM_ROLES） |
|--------|----------|----------|--------------------------------------------------------------|
| `settlement:approve` | ContractEndpoints.cs:464 | 已用（守卫，当前全角色被拦 = 功能失效） | admin + accountant |
| `inventory:delete` | InventoryEndpoints.cs:55/112 | 已用（守卫，当前功能失效） | admin |
| `projects:export` | 无后端端点（纯前端工具） | 已用（按钮隐藏，当前功能失效） | admin + manager + worker |
| `contracts:export` | 无后端端点（纯前端工具） | 已用（按钮隐藏，当前功能失效） | admin + manager + accountant + worker |
| `inventory:create` | InventoryEndpoints.cs:30、FileEndpoints.cs:188、InventoryEndpoints.cs:89 | 前端未用 | admin + manager |
| `inventory:update` | InventoryEndpoints.cs:42/100 | 前端未用 | admin + manager |
| `drawings:create` | FileEndpoints.cs:131 | 前端未用 | admin + manager |
| `drawings:update` | FileEndpoints.cs:168 | 前端未用 | admin + manager |
| `drawings:delete` | FileEndpoints.cs:120 | 前端未用 | admin |

### 6.4 G2：码存在但前后端未接通（约 30 码 → 79 端点）

码在 GetDefaultPermissions 中存在（roles 种子有），前端未用 can()，后端未执行。建议授予矩阵（对齐静态 SYSTEM_ROLES 中同码授予）：

| 权限码 | 端点组 | admin | manager | accountant | worker | 执行后行为 |
|--------|--------|:-----:|:-------:|:----------:|:------:|------------|
| `projects:update` | ProjectEndpoints.cs:116 | ✓ | ✓ | ✗ | ✗ | **突变**：按钮前端无码，当前全角色可见 |
| `contracts:create` | ContractEndpoints.cs:75/119/162 | ✓ | ✓ | ✗ | ✗ | 突变 |
| `contract-templates`（复用 `contracts:update`） | ContractEndpoints.cs:326/334/344 | ✓ | ✓ | ✗ | ✗ | 突变 |
| `settlement:create` | ContractEndpoints.cs:370 | ✓ | ✓ | ✓ | ✗ | 突变 |
| `settlement:update` | ContractEndpoints.cs:414/474 | ✓ | ✓ | ✓ | ✗ | 突变 |
| `partners:create` | PartnerEndpoints.cs:47/148 | ✓ | ✓ | ✗ | ✗ | 突变 |
| `partners:update` | PartnerEndpoints.cs:82/163 | ✓ | ✓ | ✗ | ✗ | 突变 |
| `partners:delete` | PartnerEndpoints.cs:122/179 | ✓ | ✗ | ✗ | ✗ | 突变 |
| `members:create` | MemberEndpoints.cs:67/154/235/277/331、ProjectWorkerMiscEndpoints.cs:14 | ✓ | ✓ | ✗ | ✗ | 突变 |
| `members:update` | MemberEndpoints.cs:86/170/286/339、ProjectWorkerMiscEndpoints.cs:27 | ✓ | ✓ | ✗ | ✗ | 突变 |
| `members:delete` | MemberEndpoints.cs:106/188/245/301/348 | ✓ | ✗ | ✗ | ✗ | 突变 |
| `wages:create` | WageEndpoints.cs:57/103/119/126/133/186/535 | ✓ | ✗ | ✓ | ✗ | **突变**（manager 当前可点）※拍板点 |
| `wages:update` | WageEndpoints.cs:71/227/290/302/315/327/334/399/470 | ✓ | ✗ | ✓ | ✗ | 突变 ※拍板点 |
| `wages:delete` | WageEndpoints.cs:84/92/271/279/527 | ✓ | ✗ | ✗ | ✗ | 突变 |
| `invoices:create` | InvoiceEndpoints.cs:41/173 | ✓ | ✗ | ✓ | ✗ | 突变 ※拍板点 |
| `invoices:update` | InvoiceEndpoints.cs:71/198、ProjectWorkerMiscEndpoints.cs:36 | ✓ | ✗ | ✓ | ✗ | 突变 ※拍板点 |
| `invoices:delete` | InvoiceEndpoints.cs:106/226 | ✓ | ✗ | ✓ | ✗ | 突变 |
| `costLedger:create` | CostLedgerEndpoints.cs:49/81/163/172 | ✓ | ✗ | ✓ | ✗ | 突变 |
| `costLedger:update` | CostLedgerEndpoints.cs:60/116/126/142/183/212/239 | ✓ | ✗ | ✓ | ✗ | 突变 |
| `costLedger:delete` | CostLedgerEndpoints.cs:73/135/193 | ✓ | ✗ | ✗ | ✗ | 突变 |
| `users:create` | AuthEndpoints.cs:232 | ✓ | ✗ | ✗ | ✗ | **无突变**（Users.tsx 整页 RequireAdmin） |
| `users:update` | AuthEndpoints.cs:244 | ✓ | ✗ | ✗ | ✗ | 无突变 |
| `users:delete` | AuthEndpoints.cs:264 | ✓ | ✗ | ✗ | ✗ | 无突变 |
| `roles:update` | AuthEndpoints.cs:197/205 | ✓ | ✗ | ✗ | ✗ | 无突变（角色页在 Users 内） |
| `settings:update` | SystemEndpoints.cs:382/513/530/579/630、TemplateEndpoints.cs:21/38/60 | ✓ | ✗ | ✗ | ✗ | 部分突变（备份/恢复前端已 isAdmin 隐藏；gpu/模板未隐藏） |

> 「突变」= 按钮前端未用码 → 今天所有登录角色可见可点；执行后端码后，非授予角色点击 403（按钮仍在）。users/roles 无突变（页面级 RequireAdmin 已挡），且是**最高风险**（当前仅登录即可改用户/角色/全表重灌）——建议第一梯队执行。

### 6.5 豁免清单（46 端点，门禁5 用）

login（Auth:20）、agent/setup/test（Agent:631）、update/download×2（Update:17/34，白名单）、change-password（Auth:88）、user-profile（Auth:497）、user-preferences×2（UserPrefs:42/94）、agent 自助 7 端点（Agent:26/197/465/491/533/555/577）、stt 自助 2 端点（Stt:31/105）、ocr 无状态 9 端点（Ocr:44/90/148/185/226/273/311/365/406）、STUB 7 端点（Wage:119/126/133/327/334、System:240/498/503/568）、diagnose（System:552）、files 基础设施 3 端点（File:48/218/238）、regions 字典 2 端点（Region:20/28）、audit/logs 写入（System:113）、snapshots 创建（System:195）、update/apply（Update:67）——合计 46。

### 6.6 执行批次建议（拍板后按序实施）

- **T1（无突变 + 最高危）**：users:create/update/delete、roles:update（5 端点）—— 当前仅登录可越权建 admin/改任意用户，必须最先堵。
- **T2（无突变）**：G1 全部 12 端点 + 已 E 端点不动。
- **T3（迁移先行）**：037 追加 G3 的 9 码（含 4 个前端在用码，恢复失效功能）→ 同步 permissions.ts → 删除门禁1 LEGACY_EXEMPT → 回帖 Issue #5。
- **T4（有突变，需拍板）**：G2 业务端点按 6.4 授予矩阵分批执行；每批前前端同步补 can() 按钮渲染（或接受一次突变）。

## 7. 方法备注

- 计数一律 `array.length`（grep -c 汇总 = 169，与逐条提取一致）。
- 行号 = 源文件真实行号（`app.MapXxx` 所在行）。
- 前端码调用点行号为剥离注释后行号（门禁1 报告口径），本表已换算为真实行号。
