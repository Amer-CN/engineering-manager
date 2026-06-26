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
