# DIRECTION-VOCAB-DEFECT.md — cost_ledger.direction 词汇缺陷（G53，M-FIX5 登记）

## 证据（M-FIX5 W1 + M-FIX6 V2 补全）
1. **生产端点活反证（最强证据，M-FIX6 V2 补）**：GET /api/cost-ledger/summary（CostLedgerEndpoints.cs:34-46）的 totalExpense/totalIncome 用 `WHERE direction='expense'/'income'`——库里存的**就是 expense/income**，否则 summary 恒 0。
2. **表定义**：`cost_ledger.direction TEXT`（001_InitialSchema.sql:266 + Program.cs 内联）——**无 CHECK 约束**，任何字符串可存。
3. **服务端写点（cost_ledger 4 处，M-FIX6 补全）**——全部透传前端值，无词汇校验：
   - CostLedgerEndpoints.cs:57（POST 单条 `dto.Direction`）
   - CostLedgerEndpoints.cs:72（PUT `dto.Direction`）
   - CostLedgerEndpoints.cs:96（POST /api/cost-ledger/batch 批量导入 `dto.Direction`）**（V2 补：上轮漏）**
   - CostLedgerEndpoints.cs:304/315（sheet POST 循环内 `row.Direction`）
4. **cost_ledger_categories.direction（M-FIX6 V2 补，零校验）**：
   - CostLedgerEndpoints.cs:130-132（POST /api/cost-ledger/categories `dto.Direction`）
   - CostLedgerEndpoints.cs:142（PUT /api/cost-ledger/categories `dto.Direction`）
5. **cost_ledger_match_rules.direction（M-FIX6 V2 补，零校验）**：
   - CostLedgerEndpoints.cs:236-244（POST /api/cost-ledger/match-rules `dto.Direction`）
6. **前端词汇**：`type Direction = 'expense' | 'income'`（CategoryPicker.tsx:6、config.tsx:47/74/99）——**前端只用 expense/income**。
7. **Agent 查询词汇**：`WHERE direction='expense'/'income'`（AgentToolService.cs:161-162，M-FIX6 行号修正——原 45-46 是 CostLedgerEndpoints）——与前端一致。

## 结论
生产 cost_ledger.direction 存 **expense/income**（前端 + Agent 一致）→ **Agent 收支汇总在生产不为 0**。
`'out'` 只出现在 **MFix2RedTests 测试种子/提交**（SheetPost 用 "out"）——测试造脏值，写侧不校验能存进去。

## 影响
- 测试种子 direction='out'（SheetPost）与查询词汇不一致 → 测试断言可能测不到真实路径。
- 无 CHECK 约束 → 未来任何人可存任意 direction 值，查询按词汇过滤时静默漏数据。

## 修复归属
- 测试侧（M-FIX5 W1）：SheetPost 的 direction 改 'expense'（对齐生产）；id3/id4 的 expense 行加注释说明是为迎合 Agent 词汇。
- 生产侧（R9 或后续）：加 CHECK 约束（direction IN ('expense','income')）+ 数据校验（写侧拒绝未知词汇），防止脏值再入。
