# M-AUDIT-MASTER.md — master 审计报告（只读审计，零代码改动）

> 审计对象：master @ 6747f11a4eb55e5f7abb0d28825f8b08b9d453b7（指令基点；worktree 检出于 ef371cb = 6747f11 + 10 笔 G2）
> 审计日期：2026-08-06 · 执行：feat/edition-split 流水线 · 全部实验用自建库，未碰生产库

## M1 提交史核对

- d80020d..6747f11 共 29 笔（M-FIX2 X1 实测 rev-list --count，原报告误写 30）。7 笔 committer 时间戳撞车 2026-08-05T07:36:16Z：
  `ddedc19`/`6f3b06a`/`3355bc4`/`03b5511`/`a036dd6`/`1a73fa6`/`589f9dc`（author 时间各异 04 14:31~05 15:25）。
- **原始 SHA 证据**：悬空 commit `498bbd46`（= 9e04445 窗口 E 的原始版，同说明同父 fee0c7e，仅 committer 23:35:29→00:22:29）证明最近 2 笔被 amend；撞车 7 笔 = 批量重写（统一 committer 时间）。**原始 SHA 已灭失**——reflog 仅存当前 master 链（detached worktree 无旧 reflog）、fsck 只列悬空对象未引用旧 7 笔。结论：**无法确认，证据已灭失**（已找 reflog/ORIG_HEAD/fsck/logs）。

## M2 master 真实基线（与自称对账）

| 项 | master 自称 | 实测 | 差额/成因 |
|---|---|---|---|
| dotnet 通过 | 699 | **814/816**（CI filter 810） | 基准 699 出自 fee0c7e；6747f11 提交说明白纸黑字写 713 通过/2 跳过/0 失败。真实链条（M-FIX2 X1 补正，G2-B1..B9 逐笔 commit message）：699 →（窗口 E）713 → 728 → 747 → 763 → 773 → 783 → 790 → 795 → 804 → 814。不是「自称数字过时」。 |
| vitest | 1725/0 | **1712 通过 / 15 失败** | 15 失败集中 G2 改端点后 hook mock 未同步（useInvoicePage/useInventoryPage/useCostLedgerBatches/CategoryManager/usePiiKeys 等） |
| npm check | — | 0 违规 / **21 警告** | 21 警告（master 未做 edition-split 的警告收敛） |
| check:backend | — | 2 违规（76 文件） | master 无 TD-BACKEND-28 口径 |

## M3 写端点豁免清单

- 脚本：`scripts/check-write-permission.cjs`（md5 见执行记录）；当前跑 170 端点 / 130 已检查 / 40 豁免 / 0 违反。
- 「169 写端点 / G2 暂缓 84」= 6747f11 **之前**数字（WRITE-AUTH-MATRIX.md 生成于 ddedc19）；G2-B1..B9 十笔已把 84 暂缓转真权限码，当前清零。
- **第二道防线判定（核心发现）**：master `UserFilterWithAuthorizedProjects(scope)` 单参默认 `projectCol="project_id"` 裸列 → EXISTS 子查询 `project_id = project_id` **自比较恒真**。自建库实证：worker1 授权 P1 却可见 2 行（应 1 行）。这些端点「有 WHERE 但不设防」——非真裸奔但防线失效（edition-split R4.1 已修，master 未修）。
- 真·裸奔清单：**无**（40 豁免均为登录/OCR/STUB 基础设施类，不写业务数据或显式 501）。

## M4 列漂移扫描

- 脚本 `scripts/scan-column-drift.py`（md5 截断，见执行记录）。启发式 1（CREATE 块）报 26 疑似列，纳入 ALTER ADD COLUMN + EnsureTables 运行时 ADD 后差集为空。**整体降级为「未核实」（M-FIX2 X1 补正）**：扫描器连放宽三次直到差集归零、全程无阳性对照（从没种一个已知漂移列验证扫描器抓得到）、scan-column-drift.py 随 worktree 销毁未入库、md5 截断——报零不能证明无漂移。

## M5 迁移真伪演练（自建库）

- 库甲（空库）001 成功、003 成功（invoices→INTEGER）；库乙（001 全新建表复刻）001 成功、003 成功。
- **旧式 schema 库**（复刻生产：非 001 建表）：003 `CREATE IF NOT EXISTS projects_new` 建新表 → `INSERT INTO projects_new SELECT ... FROM projects` 失败（projects 旧式表结构缺列/已被 DROP）→ **回滚**。判据：invoices 保持 REAL + `_new` 无残留。
- 结论：003 在「001 建的新库」可用、在「旧式 schema 生产库」必然失败/从未真实执行——与生产库 schema_versions 批量登记（9 行 00:00:00）吻合。**标注（M-FIX2 X1 补正）**：结论来自 Python 手写模拟器（逐语句 executescript），真实 MigrationRunner 一次都没跑起来（跑起来的是 WinForms 界面），模拟器过程中被自己证伪过两次（先报 no such table projects_new、再报 schema 缺 projects）。判「未核实」。

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
4. **数字实测（M-FIX2 X1 重数，rev-list --count 原文）**：`d80020d..6747f11` = 29；`d80020d..origin/master` = 43；`git rev-list --left-right --count origin/master...feat/edition-split` = **43 / 87**（原报告误写 39/85，M1 的 30 也应为 29）。分叉冲突在 G2 与 R4.1 同文件；edition-split 安全修复（G1~G37）逻辑独立，不会被冲掉但需解冲突。

## M-FIX1 前置发现（审查方远端自取，M-FIX1 F8 登记）

- 11 处恒真调用点：ContractEndpoints GET×3（显式传裸列）+ stats×4 + CostLedger PUT/DELETE/sheet 归属校验/逐行 UPDATE×4。
- 合同 PUT 缺参 500：UserFilterFragmentForProject 用 @ProjectId（请求参数冒充授权），匿名对象无 ProjectId。
- 台账 sheet 金额单位撒谎：amount REAL 但 (long)Math.Round 强制取整 + 注释「INTEGER 分」。
- ContractEndpoints 三处 GBK 乱码注释（stats 段）。
- 企业版非 admin 路径零测试覆盖（ApiTestBase 跑企业版但无 contracts/cost-ledger 非 admin 端点测试）。

## M-FIX1 前置发现（审查方远端自取，M-FIX2 X1 登记 G38-G42）

- **G38** 合同 PUT 缺参 500：UserFilterFragmentForProject 用 @ProjectId（请求参数冒充授权），匿名对象无 ProjectId（M-FIX1 F3 已修：改行内 project_id + 删函数）。
- **G39** 台账 sheet 金额单位撒谎：amount REAL 但 (long)Math.Round 强制取整 + 注释「INTEGER 分」（M-FIX1 F6 已修）。
- **G40** ContractEndpoints 三处 GBK 乱码注释（stats 段）。
- **G41** 企业版非 admin 路径零测试覆盖（ApiTestBase 跑企业版但无 contracts/cost-ledger 非 admin 端点测试）。
- **G42** 11 处恒真调用点（M-FIX1 F2 已修）：ContractEndpoints GET×3 + stats×4 + CostLedger PUT/DELETE/sheet/逐行×4。

## M-FIX1 后置发现（M-FIX2 X1 登记 G43-G46）

- **G43** M-FIX1 F2 批量替换填错 3 处表名（X2 本轮修）：cost_ledger_batches 归属校验误用 cost_ledger.project_id；AgentToolService getDashboardStats 单 projectFilter 喂 4 表；getCostSummary 误用 invoices.project_id。
- **G44** 同上（G43 的另一处：X2(c) 拆分后每表独立变量）。
- **G45** F7 提交说明与 diff 不符：说明写「replace prefix」但 !~BgeE2ETests 没动（X4 本轮处理）。
- **G46** manager 合同 PUT Forbidden 未查清（X3 本轮查：权限门拒绝 vs SQL 影响 0 行二选一）。
