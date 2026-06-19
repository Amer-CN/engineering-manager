# mimo 适配度 Scoreboard

> 目标: 记录每次派 mimo 干活的结果, 累积数据后提炼"Mimo Rule of Thumb" 决策规则.
> 字段: 日期 | 任务类型 | 耗时 | 一次过? | 返工次数 | 备注
> 触发: 每次派 mimo 干活完 (成功/失败/timeout) 我自动 +1 行.

| # | 日期 | 任务类型 | 耗时 | 一次过? | 返工次数 | 备注 |
|---|------|----------|------|---------|----------|------|
| 1 | 2026-06-19 | React 文件 patch (单文件小改) | 110s | ✅ | 0 | Task A: useUserIdSync 接入 App.tsx, 2 行变更 + 跑 npm check + vite build, diff 干净, 我仅审 git diff + 跑 vitest 48/48 验证 |
| 2 | 2026-06-19 | 批量 git rm + .gitignore 修改 | 304s (timeout 死) | ❌ | - | Task C: mimo wrapper 把 .git 改名 → git status/rm 全失败, mimo 又尝试 ls -la 触发参数不识别, 最后 timeout. 我接手 60s 搞定. 教训: 涉及 git 命令的任务 mimo 必败 |

| 4 | 2026-06-19 | 批量清 tsc unused imports (19 文件 37 errors) | 134s | ✅ | 0 | v0.79.0 Task C: mimo 批量执行, 21 import 删/简化 + 10 解构删 + 3 内部变量 + 6 useState 删, 一次过. 我仅审 git diff + 跑 tsc 验证 |

| 5 | 2026-06-19 | 单文件 React patch (新建 1 个子文件) | 185s | ✅ | 0 | v0.79.0 Task A: InvoiceForm.tsx 347→194 行 (-44%), 新建 InvoiceFormFields.tsx 194 行. mimo 一次过, tsc 0 errors + vite build 13.88s + dotnet build 0 错. 我仅审 git diff + 跑独立红绿灯验证 |

## 累计统计 (n=4)

- ✅ 一次过: 4/5 (80%)
- ❌ 失败: 1/5 (20%)
- 平均耗时: 168s
- mimo 适合的任务类型: React 文件 patch (单文件小改)
- mimo 不适合: 任何涉及 git 命令的任务
- mimo 适合 (n=4): 单文件 React patch (含新建子文件) — 100% 一次过

| 3 | 2026-06-19 | 单文件 React patch (新建 2 个子文件) | 108s | ✅ | 0 | v0.77.0 Task A: DataTable.tsx 358→209 行 (-42%, 超目标 -35%), 新建 types.ts 99 行 + consts.ts 7 行. mimo 一次过, 跑 npm check + vite build 都过. 我仅审 git diff + 跑独立红绿灯验证 |
## 等待累积

(目标 n=10 做第一次模式分析)