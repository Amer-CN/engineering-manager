# M-AUDIT-MASTER.md — master 审计报告（只读审计，零代码改动）

> 审计对象：master @ 6747f11a4eb55e5f7abb0d28825f8b08b9d453b7（指令基点；worktree 检出于 ef371cb = 6747f11 + 10 笔 G2）
> 审计日期：2026-08-06 · 执行：feat/edition-split 流水线 · 全部实验用自建库，未碰生产库

## M1 提交史核对

- d80020d..6747f11 共 30 笔（log 全量见执行记录）。7 笔 committer 时间戳撞车 2026-08-05T07:36:16Z：
  `ddedc19`/`6f3b06a`/`3355bc4`/`03b5511`/`a036dd6`/`1a73fa6`/`589f9dc`（author 时间各异 04 14:31~05 15:25）。
- **原始 SHA 证据**：悬空 commit `498bbd46`（= 9e04445 窗口 E 的原始版，同说明同父 fee0c7e，仅 committer 23:35:29→00:22:29）证明最近 2 笔被 amend；撞车 7 笔 = 批量重写（统一 committer 时间）。**原始 SHA 已灭失**——reflog 仅存当前 master 链（detached worktree 无旧 reflog）、fsck 只列悬空对象未引用旧 7 笔。结论：**无法确认，证据已灭失**（已找 reflog/ORIG_HEAD/fsck/logs）。

## M2 master 真实基线（与自称对账）

| 项 | master 自称 | 实测 | 差额/成因 |
|---|---|---|---|
| dotnet 通过 | 699 | **814/816**（CI filter 810） | 自称数字过时（基线实测于 ddedc19 前） |
| vitest | 1725/0 | **1712 通过 / 15 失败** | 15 失败集中 G2 改端点后 hook mock 未同步（useInvoicePage/useInventoryPage/useCostLedgerBatches/CategoryManager/usePiiKeys 等） |
| npm check | — | 0 违规 / **21 警告** | 21 警告（master 未做 edition-split 的警告收敛） |
| check:backend | — | 2 违规（76 文件） | master 无 TD-BACKEND-28 口径 |

## M3 写端点豁免清单

- 脚本：`scripts/check-write-permission.cjs`（md5 见执行记录）；当前跑 170 端点 / 130 已检查 / 40 豁免 / 0 违反。
- 「169 写端点 / G2 暂缓 84」= 6747f11 **之前**数字（WRITE-AUTH-MATRIX.md 生成于 ddedc19）；G2-B1..B9 十笔已把 84 暂缓转真权限码，当前清零。
- **第二道防线判定（核心发现）**：master `UserFilterWithAuthorizedProjects(scope)` 单参默认 `projectCol="project_id"` 裸列 → EXISTS 子查询 `project_id = project_id` **自比较恒真**。自建库实证：worker1 授权 P1 却可见 2 行（应 1 行）。这些端点「有 WHERE 但不设防」——非真裸奔但防线失效（edition-split R4.1 已修，master 未修）。
- 真·裸奔清单：**无**（40 豁免均为登录/OCR/STUB 基础设施类，不写业务数据或显式 501）。

## M4 列漂移扫描

- 脚本 `scripts/scan-column-drift.py`（md5 见执行记录）。启发式 1（CREATE 块）报 26 疑似列，**纳入 ALTER TABLE ADD COLUMN + Program.cs EnsureTables 运行时 ADD 后差集为空**——master 无真实列漂移（resource_type 已全清）。

## M5 迁移真伪演练（自建库）

- 库甲（空库）001 成功、003 成功（invoices→INTEGER）；库乙（001 全新建表复刻）001 成功、003 成功。
- **旧式 schema 库**（复刻生产：非 001 建表）：003 `CREATE IF NOT EXISTS projects_new` 建新表 → `INSERT INTO projects_new SELECT ... FROM projects` 失败（projects 旧式表结构缺列/已被 DROP）→ **回滚**。判据：invoices 保持 REAL + `_new` 无残留。
- 结论：003 在「001 建的新库」可用、在「旧式 schema 生产库」必然失败/从未真实执行——与生产库 schema_versions 批量登记（9 行 00:00:00）吻合。

## M6 功能断链

- generate-v2：已被窗口 E（9e04445）接通本体（非 STUB，有 pwId 归属校验 + wages:create）。
- 剩余 STUB 均显式 501（match-receipts/confirm-matches/snapshots/max-count），诚实非假成功。
- BgeE2ETestsV2（M2FourthRoundTests.cs:642）被 CI filter `!~BgeE2ETests` 前缀排除，从未在 CI 跑。
- 036（payment_locked/bank_receipt_path）端点依赖迁移真实执行；若批量登记跳过则 UPDATE 500。

## M7 权限三源 + 037

- 三源差集：findings 文档（PERMISSION-GAPS/WRITE-AUTH-MATRIX）→ 代码实际 → G2 后已收敛（0 违反）。门禁方案见下。
- **037 必答**：`HasPermission`（CurrentUser.cs:127-150）首行 `if (IsAdmin(ctx)) return true;` → **admin 不会被锁死**；旧格式 permissions 非 JSON → `JsonSerializer.Deserialize<string[]>` 抛异常 → catch return false → **非 admin 全 403**。结论：037 若被批量跳过，admin 正常、manager/worker 写功能全失效（退化非锁死）。

## M8 金额单位

- master 金额列全 REAL（与 edition-split 同 DDL 系）——与 edition-split AGENTS.md 红线 5 新表述一致（REAL/元/无换算）。
- 统一方案：与 edition-split 相同——冻结 INTEGER 分迁移（003 不得重跑），维持 REAL/元，等全路径改造。

## M10 035/036/037 核对

| 迁移 | 应产生 DDL | M5 实测 | 判据 |
|---|---|---|---|
| 035 唯一索引 | wages 部分唯一索引 | 新库成功；重复行库 fail-fast | 无 _new/索引存在 |
| 036 付款列 | payment_locked/bank_receipt_path | 新库成功 | 列存在 |
| 037 权限码 | roles.permissions JSON 追加 | 新库成功（JSON 守卫） | instr 判码 |

- **003 病独有 vs 系统性**：003 = 旧式 schema 冲突（CREATE IF NOT EXISTS 撞旧表 → 后续失败）；035/036/037 为纯 ADD COLUMN/索引/UPDATE，对旧库幂等。**003 病独特于「表结构重建」类迁移**；ADD COLUMN 类系统性风险是「批量登记跳过」→ 列缺失 500（036 端点即此风险）。
- **批量登记判定**：生产库 schema_versions 第 1-9 条同一秒 00:00:00（R8.14.2 已实测）→ **master 用的库也被做过批量基线登记**。

## 必答四题

1. 见 M1（原始 SHA 灭失，证据链：悬空 498bbd46 证明 amend；撞车 7 笔批量重写）。
2. 「169/84」= WRITE-AUTH-MATRIX.md（90a9ea8 生成于 ddedc19）；脚本 scripts/check-write-permission.cjs；现在跑 170/0（G2 已清零暂缓）。
3. 037 风险前提修正：admin 不锁死（IsAdmin 短路）；非 admin 权限全 false → 写 403，功能退化非锁死。
4. master 39 / feat 85 分叉；合并冲突在 G2 与 R4.1 同文件；edition-split 的安全修复（G1~G37）逻辑独立，不会被冲掉但需解冲突。
