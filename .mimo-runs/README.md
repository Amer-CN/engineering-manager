# mimo 协作操作手册 (Codex + mimo code CLI)

> **给新会话的 AI**: 这是 Codex 与 mimo 协作的完整操作手册.
> 读完后你应该知道: 角色分工 / 任务分流 / mimo 调用模板 / prompt 模板 / 拆分模式 / 红绿灯 / commit / 已知陷阱.
>
> **适用范围**: 工程管家项目 (E:\测试) v0.77.0 ~ v0.83.0 累计 27 commits 验证过的工作流.
> mimo n=15 scoreboard 14/15 一次过 (93%, 含 7 次小自修复).
>
> **最后更新**: 2026-06-20 (v0.83.0 release 总结).

---

## 1. 角色分工

| 角色 | 职责 | 不做 |
|------|------|------|
| **Codex (我)** | 写 prompt + 派 mimo + 审 diff + 跑红绿灯 + commit + tag | 不直接写 React patch (除非 mimo 搞不定) |
| **mimo code CLI** | 执行 React 单文件 patch (拆分/重构) | 不跑 git/commit/tag, 不跑 vite build/dotnet build |
| **用户** | 观众, 必要时介入 | 不复制粘贴, 所有 mimo 调用 Codex 跑 |

**核心原则**: 简单 → 派 mimo; 复杂 → Codex 自己; 模糊 → 先派 mimo.

---

## 2. 任务分流规则

### 派 mimo (95% 的 sprint 任务)

✅ **适合**: 单文件 React patch (含新建子文件)
- 拆超长 .tsx (200+ 行)
- 抽 Form 子组件 / Modal 子组件 / Columns factory
- 抽 Constants 子文件 (硬编码颜色/icon/分类)
- 抽 Hook 子文件 (state + handlers 集中)
- 重命名 / 加日志 / 改文案 / 加 import / 删 unused

❌ **不适合** (mimo 必败, Codex 自己来):
- 任何涉及 git 命令 (git add/commit/tag/diff/log)
- .gitignore / package.json / .csproj 等配置修改
- 跨多文件的大重构 (架构级)
- 安全审查 / 性能优化 / 难 bug 排查
- C# 后端代码

### Codex 自己 (5% 的任务)

- 上述"不适合"项
- 任何 mimo 跑完出错 + 返工 1 次还不过的情况
- 需要读多个文件做决策的复杂 bug

---

## 3. mimo 调用模板 (v2.5 已稳定)

**关键**: 直接用 `mimo.exe` 二进制, **不要用 mimo.ps1 wrapper** (PS 中文路径 + tee bug).

```powershell
# 配置
$mimoExe = "C:\Users\Admin\AppData\Roaming\npm\node_modules\@mimo-ai\mimocode-windows-x64\bin\mimo.exe"
$sprintDir = "E:\测试\.mimo-runs\v0.84.0"  # 每次新 sprint 一个目录
$ts = Get-Date -Format "yyyyMMdd-HHmmss"

# 文件路径
$promptFile = "$sprintDir\task-xxx-prompt-$ts.txt"   # 任务指令
$logFile    = "$promptFile" -replace "prompt", "log"  # 实时输出 (用户侧栏看)
$stdoutFile = "$promptFile.stdout"                     # mimo stdout
$stderrFile = "$promptFile.stderr"                     # mimo stderr

# 建目录 + 写 prompt + 启动
New-Item -ItemType Directory -Force -Path $sprintDir | Out-Null
# (WriteAllText prompt 到 $promptFile, [System.Text.UTF8Encoding]::new($false) 避 BOM)
"" | Out-File -FilePath $logFile -Encoding utf8

$proc = Start-Process -FilePath $mimoExe `
  -ArgumentList "run", "-m", "mimo/mimo-auto" `
  -WorkingDirectory "E:\测试" `
  -RedirectStandardInput $promptFile `
  -RedirectStandardOutput $stdoutFile `
  -RedirectStandardError $stderrFile `
  -WindowStyle Hidden `
  -PassThru

# 轮询状态 (4 分钟内一般完成)
$stderrPath = $stderrFile
for ($i = 0; $i -lt 8; $i++) {
    Start-Sleep -Seconds 30
    $m = Get-Process mimo -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddMinutes(-8) } | Sort-Object StartTime -Descending | Select-Object -First 1
    if ($null -eq $m) { break }  # 已退出
    $lines = (Get-Content $stderrPath -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
    Write-Output "[$((Get-Date -Format 'HH:mm:ss'))] cpu=$($m.CPU) stderr_lines=$lines"
}
```

**用户实时看**: `Get-Content $logFile -Wait`

**mimo 平均耗时**: 177s (n=15). Drawings 125s, ContractPage 258s, Partners 109s, MembersTab 149s.

⚠️ **超时处理**: mimo 跑超 5min 没结果 → `Stop-Process -Id $proc.Id`, 然后 `Rename-Item .git-mimo .git` 恢复.

---

## 4. mimo prompt 模板 (已验证 n=15)

```markdown
# 任务: 拆分 <文件名> (<行数> → <新结构>)

## 重要: 中文路径 bug 规避
- **绝对不要** 在 verification 命令前加 `cd E:\测试 && ` 前缀
- tsc 验证直接用: `npx tsc --noEmit --pretty false`
- 不要跑 `vite build` / `dotnet build` (tsc 足够)

## 目标
拆分 `src/<路径>/<文件>.tsx` (<行数>) 为 <N> 个文件:
- `src/<路径>/<文件>.tsx` ~<目标行数> (主文件: ...)
- `src/<路径>/<子文件1>.tsx` ~<行数> (新: ...)
- `src/<路径>/<子文件2>.tsx` ~<行数> (新: ...)

## 已有的 <模块>/ 子组件 (不要动)
<列出已有子文件, 避免 mimo 重新命名/移动/合并>

## 文件 1: 新建 <子文件>.tsx
<详细代码示例: imports / props / 函数签名>

## 文件 2: 修改 <主文件>.tsx
<改动清单: 新增 import / 删除 L1-L2 / 新增 hook 调用 / 保留什么>

## 不要做
- ❌ 不要改 <其他已存在子组件>
- ❌ 不要改 <其他逻辑>
- ❌ 不要新建多余文件
- ❌ 不要跑 git / commit / tag
- ❌ 不要 `cd E:\测试 && ...` (中文路径 PS bug hang)

## 验证
```bash
npx tsc --noEmit --pretty false 2>&1
```
期望: 空 (0 errors)

## 最后
报告行数:
```powershell
(Get-Content "src/...").Count
```
期望: 主文件 ~<X> 行, 子文件 ~<Y> 行
```

**关键原则**:
1. **prompt 给目标, 不强制中间步骤** (v0.82.0 Members 任务学到 — mimo 自己决定更优雅的拆法)
2. **详细列出 "不要做"** (避免 mimo 改坏其他东西)
3. **明确 imports 路径** (相对/绝对)
4. **明确期望行数** (让 mimo 有目标)
5. **明确验证命令** (tsc 0 错为唯一硬指标)

---

## 5. 拆分模式 (已验证 100% n=15)

| # | 模式 | 适用场景 | mimo 经验 |
|---|------|---------|----------|
| 1 | **主文件保留 state + handlers + 主页 JSX** | 通用 | 所有 15 次都用了 |
| 2 | **Form 子文件** `XxxFormFields.tsx` / `XxxFormModal.tsx` | 复杂表单 (>100 行 JSX) | InvoiceForm/PartnerForm/Drawings/MembersForm |
| 3 | **Modal 子文件** `XxxPreviewModal.tsx` | 独立大块 JSX 模态框 | ContractPreviewModal |
| 4 | **Columns factory** `xxxPageColumns.tsx` | DataTable 多列 | ContractPage/Users/ContractPage |
| 5 | **Constants 子文件** `xxxConstants.ts` | 硬编码颜色/icon/分类 | Drawings/dashboardConstants |
| 6 | **Hook 子文件** `useXxx.ts` | state + handlers 集中 | useBankReceipt (WageMgmt) / usePartnerActions / useMemberOperations (已有) |
| 7 | **多 export 文件抽出最大组件 + re-export** | 文件是多组件合集 | ProjectDetailTabs 抽出 MembersTab |

### hook 接口设计原则 (v0.83.0 Partners 任务学到)

```typescript
// ✅ 推荐: deps + 参数化
export function usePartnerActions({
  partners, supervisors, projects, loadData, refresh,
}: UsePartnerActionsOptions) {
  return {
    handlePartnerSubmit: (formData: any, editingPartner: Partner | null) => Promise<void>,
    handlePartnerDelete: (id: number) => Promise<void>,
    // ...
  }
}

// ❌ 避免: hook 内部管 UI state
export function usePartnerActions() {
  const [editingPartner, setEditingPartner] = useState(null)  // UI state 不该在 hook
  // ...
}
```

**理由**: editingPartner 是 UI state, 留在主文件 (setEditingPartner 在那里); hook 只处理业务逻辑.

---

## 6. 红绿灯 5 项 (每次 commit 前必跑)

```powershell
# 1. tsc (硬指标)
cd "E:\测试" && npx tsc --noEmit --pretty false 2>&1
# 期望: 空 (0 errors), exit code 0

# 2. vite build
cd "E:\测试" && npx vite build 2>&1
# 期望: ✓ built in 10-20s, exit code 0

# 3. dotnet build
cd "E:\测试\EngineeringManager.Api" && dotnet build 2>&1
# 期望: "0 个错误 0 个警告"

# 4. dotnet test
cd "E:\测试\EngineeringManager.Tests" && dotnet test 2>&1
# 期望: "已通过! - 失败: 0, 通过: 26, 总计: 26"

# 5. npm run check
cd "E:\测试" && npm run check 2>&1
# 期望: BUILD PASSED (X warnings, 0 HARD FAIL)
```

**通过标准**:
- 5 项全绿才能 `git tag v0.x.0`
- 任何一项红 → 标记 WIP, 先修
- vitest 单独跑 (124s 超时常见, 看情况)

---

## 7. commit + tag 流程

### 每个 refactor 一个 commit

```powershell
cd "E:\测试" && git add <改动文件>
git reset HEAD docs/handoff/v0.79.0-handoff.md 2>&1 | Out-Null  # 排除掉之前未提交的删除
git commit -m "refactor(v0.84.0): <一句话描述> (<旧行数> -> <新行数> + <新行数>)

- <改动清单>
- mimo <耗时>s <一次过/含 N 次自修复>
- tsc 0 + vite build <X>s + 红绿灯全绿"
```

### sprint 收尾: 版本 bump + CHANGELOG + handoff 一个 commit

**Bump 4 处 version**:
```powershell
$pkg = "E:\测试\package.json"
(Get-Content $pkg -Raw) -replace '"version": "0\.<old>"', '"version": "0.<new>"' | Set-Content $pkg -Encoding UTF8 -NoNewline
# 同样改 installer/package.json + installer/src/App.tsx + src/components/Login.tsx
```

**更新 CHANGELOG**: 在文件顶部插入 `## v0.x.x` entry (参考 `docs/handoff/v0.83.0-handoff.md` 格式).

**更新 scoreboard**: `.mimo-runs/scoreboard.md` 加新 entries + 更新 `n=X` 累计.

**写 handoff**: `docs/handoff/v0.x.x-handoff.md` (状态/历史/接下来/技术细节).

**Commit + Tag**:
```powershell
git commit -m "chore(v0.<x>): bump version 0.<x-1> -> 0.<x> + CHANGELOG + handoff"
git tag -a v0.<x> -m "v0.<x> release - <一句话>"
```

---

## 8. 已知陷阱 (踩过的坑)

### 8.1 PS 中文路径 + mimo hang

**症状**: mimo prompt 里有 `cd E:\测试 && npx tsc`, PowerShell 解析 `&&` + 中文路径触发错误, mimo 进入 retry 循环 hang 5min.

**修复**: mimo prompt 里 verification 命令**永远不要带 `cd 中文路径 &&`**, 改成直接 `npx tsc --noEmit` (mimo cwd 已在 E:\测试).

### 8.2 mimo 进程 hang (bug #1132)

**症状**: mimo 启动后 5+ 分钟无输出, CPU 一直低.

**修复**: `Stop-Process -Id $mimoPid` + 手动 `Rename-Item .git-mimo .git` 恢复.

**预防**: 用轮询 (每 30s 检查 CPU + line count), 5min 还活就 kill.

### 8.3 .git 被改名 .git-mimo

**症状**: mimo 启动时把 `.git` 改名 `.git-mimo` (v2 hardened 避 bun EEXIST bug), 跑完会自动恢复. **如果 mimo crash**, `.git-mimo` 不会恢复, 所有 git 命令失败.

**修复**:
```powershell
if (Test-Path "E:\测试\.git-mimo") { Rename-Item "E:\测试\.git-mimo" "E:\测试\.git" }
```

### 8.4 PowerShell 替换陷阱

| 陷阱 | 修复 |
|------|------|
| CRLF vs LF | 用 `[char]13 + [char]10` (CRLF) 匹配多数源码文件 |
| `*` 在双引号 | here-string 用单引号 `@'...'@` 避免 `*` 被当乘法 |
| `${var}` 双引号 | PowerShell 7 解析有问题, 用 `.Replace()` 替代 |
| BOM | `[System.IO.File]::WriteAllText` 默认 UTF-8 with BOM, 用 `[System.Text.UTF8Encoding]::new($false)` 避免 |

### 8.5 mimo .ts vs .tsx 自坑

**症状**: mimo 写 `xxxColumns.ts` 后意识到有 JSX, rename `.ts → .tsx` 失败一次 (Windows case-insensitive), 自修复再重命名.

**预防**: prompt 里直接指明 "columns 文件含 JSX → 用 .tsx" (不要让 mimo 自己决定).

### 8.6 mimo 拆法可能比 prompt 预期更优雅

**症状**: v0.82.0 Members 任务 prompt 让保留 `workerSectionProps` 中间对象, mimo 自己决定直接 inline props 到 JSX call 更干净. 这是 LLM 的代码审美.

**应对**: prompt 给目标但不强制中间步骤, 信任 mimo 工程判断. 但要审 diff 确保结果正确.

### 8.7 mimo self-fix 很常见

**统计**: n=15 累计 7 次小自修复 (47%). 都是无害的小修:
- unused import (3 次)
- type signature mismatch (3 次) — mimo 自己 grep 其他文件找正确签名
- 其他小修 (1 次)

**mimo 都会在 tsc 报错后自己 fix**, 不需要返工.

### 8.8 docs/handoff/v0.79.0-handoff.md 预存在删除

**症状**: 历次 `git status` 都显示 `D docs/handoff/v0.79.0-handoff.md`, 是上上上次会话删除的, 没人 commit.

**修复**: 每次 `git add` 后 `git reset HEAD docs/handoff/v0.79.0-handoff.md` 排除.

### 8.9 .mimo-runs 在 .gitignore 但 scoreboard 已 track

**症状**: `.gitignore` 包含 `.mimo-runs/` 但 `scoreboard.md` 已经被 commit (在 git history 里). 后续 `git add .mimo-runs/scoreboard.md` 会正常工作 (因为已 tracked).

**修复**: `git add .mimo-runs/scoreboard.md` 单独 add, 不用 `-f`. 其他临时文件 (prompt/log/stdout/stderr) 不用 add.

### 8.10 index.html version 注入 bug (已知遗留)

**症状**: `index.html:72` 有 `window.__APP_VERSION__ = '0.72.0'` 硬编码, 历次版本 bump 都未更新.

**影响**: 不大, 因为 Login.tsx 有 fallback `'0.83.0'` (现在), 实际显示版本用 fallback.

**修复时机**: v0.84.0+ 待办, 需要确认 vite build 是否覆盖 index.html.

---

## 9. 当前 sprint 状态 (v0.83.0 已 tag)

### 累计统计
- **27 commits** (v0.75.0 4 + v0.76.0 2 + v0.77.0 2 + v0.78.0 1 + v0.79.0 4 + v0.80.0 5 + v0.81.0 4 + v0.82.0 5 + **v0.83.0 5**)
- **mimo n=15 scoreboard** 14/15 (93%, 7 次小自修复)
- **HEAD**: v0.83.0 tag (commit `38863f1`)
- **本地无 origin remote**: 没 push 过

### v0.84.0+ Top 剩余 > 200 行 (拆分候选)

**top-level**:
| 行数 | 文件 | 类型 |
|------|------|------|
| 383 | SettingsSqliteSection.tsx | settings 子 |
| 372 | SplashScreen.tsx | 启动动画 |
| 366 | ContractTemplates.tsx | 合同模板 |
| 341 | ContractDashboard.tsx | 合同仪表盘 |
| 311 | AuditLogViewer.tsx | 审计日志 |
| 303 | Settings.tsx | 设置 |
| 301 | AttendanceDetail.tsx | 考勤详情 |
| 290 | Projects.tsx | 项目管理 |
| 241 | SnapshotsTab.tsx | 快照 |
| 231 | DataTable.tsx | 表格 (核心) |
| 229 | LaborManagement.tsx | 劳务管理 |
| 225 | AuditDetailModal.tsx | 审计详情 |
| 215 | SettingsOcrSection.tsx | settings OCR 子 |
| 208 | Invoices.tsx | 发票 |

**features/**:
| 行数 | 文件 | 类型 |
|------|------|------|
| 395 | BankReceiptBatch.tsx | 银行回单 |
| 369 | CostLedgerList.tsx | 成本台账 |
| 366 | AttendanceImportModal.tsx | 考勤导入 |
| 364 | WorkerPickerModal.tsx | 工人选择 |
| 364 | WorkerImportModal.tsx | 工人导入 |
| 357 | SettlementProjectDetail.tsx | 结算项目 |
| 355 | CategoryManager.tsx | 分类管理 |
| 350 | MemberDetail.tsx | 成员详情 |
| 350 | StaffPayroll.tsx | 员工工资 |
| 344 | StaffList.tsx | 员工列表 |
| 342 | ProjectAuthorizationsTab.tsx | 项目授权 |

### 6 项累积待办

1. **统一 PII 解密后端** — GET 默认返明文 + ?unmask=true 是过渡方案, 长期应加更明确的 ACL 字段
2. **MaskContext 离线优先** — 当前 toggle 必同步后端, 离线时无法切换. 应加 queued sync
3. **react-query 完整接入** — v0.79.0 装了包但只在 ProjectAuthorizationsTab 等少数地方用, 应全面替换 useState + useEffect fetch pattern
4. **多用户协作** — 现在 all local-only, 单机 sqlite. 加 cloud sync 后端需重新评估 PII 处理 + 冲突解决
5. **P0-3 PII 加密** 后续加固: 当前 PiiProtector 是字段级 AES, 应加列级 key rotation
6. **index.html version 注入** — `__APP_VERSION__ = '0.72.0'` 历次未更新 (见 8.10)

---

## 10. 关键文件位置速查

| 用途 | 路径 |
|------|------|
| Codex + mimo 协作手册 (本文件) | `E:\测试\.mimo-runs\README.md` |
| mimo 跑分 scoreboard | `E:\测试\.mimo-runs\scoreboard.md` |
| mimo 历史 prompt + log | `E:\测试\.mimo-runs\v0.x.x\task-*.{txt,log,stdout,stderr}` |
| 历史 release handoff | `E:\测试\docs\handoff\v0.x.x-handoff.md` |
| 项目级约定 (技术栈/红绿灯/打包) | `E:\测试\AGENTS.md` |
| 累计 release notes | `E:\测试\CHANGELOG.md` |
| mimo 二进制 | `C:\Users\Admin\AppData\Roaming\npm\node_modules\@mimo-ai\mimocode-windows-x64\bin\mimo.exe` |
| mimo 漏洞跟踪 | https://github.com/XiaomiMiMo/MiMo-Code/issues/1132 |
| 4 处 version 引用 | `package.json` / `installer/package.json` / `installer/src/App.tsx` / `src/components/Login.tsx` |

---

## 11. 快速开始 (新会话 5 分钟上手)

1. **读本文件 + AGENTS.md** (理解项目约定 + 协作模式)
2. **看 `git log --oneline -10`** (看最近 10 个 commits)
3. **看 `docs/handoff/v0.83.0-handoff.md`** (最新 sprint 总结 + 接下来做什么)
4. **看 `.mimo-runs/scoreboard.md`** (mimo 适配度, 决定是否派 mimo)
5. **扫描剩余 > 200 行 .tsx**:
   ```powershell
   Get-ChildItem "E:\测试\src" -Recurse -Filter "*.tsx" |
     Where-Object { $_.FullName -notlike '*\node_modules\*' -and $_.FullName -notlike '*\dist\*' -and $_.FullName -notlike '*\__tests__\*' } |
     ForEach-Object { [PSCustomObject]@{ Lines = (Get-Content $_.FullName).Count; Path = $_.FullName.Replace("E:\测试\", "") } } |
     Where-Object { $_.Lines -gt 200 } | Sort-Object Lines -Descending
   ```
6. **选 3-5 个目标**, 给每个写 mimo prompt (用本文件 §4 模板)
7. **派 mimo** (用本文件 §3 模板)
8. **审 diff + 红绿灯 5 项** (用本文件 §6)
9. **commit + 收尾** (用本文件 §7)

---

**祝新会话 mimo 协作愉快!** 🚀