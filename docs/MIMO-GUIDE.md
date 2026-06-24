# mimo code CLI 协作手册

> 工程管家项目的 AI 分身执行协议
> 主 AI（我）负责计划和审查，mimo code CLI 负责单文件代码执行

## 角色分工

| 角色 | 负责 | 不负责 |
|------|------|--------|
| **主 AI** | 任务拆解、prompt 编写、结果审查、git commit、多文件协调 | 不直接改代码（除非 mimo 搞不定的） |
| **mimo code** | 单文件 React/TS refactor 执行 | 不处理多文件、C# 后端、migration SQL |

## 适用场景

✅ **适合 mimo**：
- 单文件 React component refactor（如 SettingsChangelog.tsx → features/settings/）
- 单文件样式/结构改动
- hook 重构（单文件内）

❌ **不适合 mimo**（主 AI 手写）：
- 多文件协调（如 endpoint + schema + tests 同时改）
- C# 后端代码
- Migration SQL
- 跨模块架构变更

## 执行流程

### 1. 准备 prompt 文件

```
.mimo-runs/<sprint-name>/task-XX-short-name-<timestamp>.txt
```

示例：`.mimo-runs/v0.85.0/task-01-settings-changelog-move-1719000000.txt`

### 2. 写 prompt

prompt 模板（英文，mimo 英文效果更好）：

```
## Task
<一句话描述>

## File
<绝对文件路径>

## Instructions
<具体改动步骤，1-2-3>

## Constraints
- <约束1>
- <约束2>

## Verification
- <验证标准>
```

**⚠️ 绝对不要**在 prompt 里写 `cd E:\测试 &&` — PowerShell 中文路径会 hang！

### 3. 启动 mimo

```powershell
$mimoExe = "C:\Users\Admin\AppData\Roaming\npm\node_modules\@mimo-ai\mimo-code-windows-x64\bin\mimo.exe"
$sprintDir = "E:\测试\.mimo-runs\v0.85.0"
$ts = Get-Date -Format "yyyyMMddHHmmss"
$promptFile = "$sprintDir\task-01-name-prompt-$ts.txt"
$resultFile = "$sprintDir\task-01-name-result-$ts.txt"

# 启动 mimo，通过 stdin 传 prompt，stdout 接收结果
$proc = Start-Process -FilePath $mimoExe -ArgumentList "run", "-m", "mimo/mimo-auto" `
    -RedirectStandardInput $promptFile `
    -RedirectStandardOutput $resultFile `
    -RedirectStandardError "$sprintDir\task-01-name-error-$ts.log" `
    -NoNewWindow -PassThru

# 轮询等待（4 次 × 30s = 2 分钟 timeout）
for ($i = 1; $i -le 4; $i++) {
    Start-Sleep -Seconds 30
    if ($proc.HasExited) { break }
    Write-Host "Waiting... ($i/4)"
}

if (-not $proc.HasExited) {
    $proc.Kill()
    Write-Host "TIMEOUT - mimo did not finish in 2 min"
}
```

### 4. 审查结果

- 读取 result 文件
- 检查 git diff：`git diff --stat`
- 跑 5 红绿灯确认没破坏
- 如果不合格：diff 分析，修正 prompt，重试
- 如果合格：commit + 更新 scoreboard

### 5. 更新 scoreboard

`.mimo-runs/scoreboard.md` 记录每次 mimo 执行的结果：

```markdown
| # | Task | File | Result | Notes |
|---|------|------|--------|-------|
| 1 | Move SettingsChangelog | SettingsChangelog.tsx | ✅ 一次过 | n=28 |
```

### 6. Commit

```bash
git add -A
git commit -m "refactor: <描述> (mimo n=XX)"
```

## 已知坑

1. **PowerShell 中文路径 hang**：prompt 和命令里绝对不要用 `cd E:\测试`，用绝对路径
2. **mimo 偶尔改多余文件**：prompt 里明确指定只改哪个文件
3. **timeout 4 分钟**：超过 4 轮 × 30s 没完成就 kill，下次优化 prompt 再试
4. **scoreboard 要手动更新**：每次 mimo 跑完记得更新 `.mimo-runs/scoreboard.md`

## 实战案例

### v0.76.0 mimo n=28: SettingsChangelog.tsx 拆分

- 文件：`src/components/SettingsChangelog.tsx` → `src/components/features/settings/SettingsChangelog.tsx`
- 结果：✅ 一次过
- Commit: `0333f79`

### v0.76.0 mimo n=33: 累计 33 次 mimo 任务

- 全部单文件 React refactor
- 27/33 一次过，6 次需要重试
- 详见 `.mimo-runs/scoreboard.md`

## 当前 sprint 的 mimo 候选

v0.77.x ~ v0.78.x 期间没有 mimo 任务（全是 C# 后端 + migration + PII worker）。

可能的 mimo 候选：
- 组件行数超标拆分（npm check 67 软警告里的文件）
- 旧组件从 `src/components/` 迁移到 `src/components/features/<模块>/`
- 任何单文件 React refactor

## 并行执行模式

### 策略
简单任务派给 mimo，同时我处理复杂任务，实现并行流水线。

### 分类标准

| 类型 | 适合 mimo | 适合 Codex |
|------|----------|-----------|
| 单文件 refactor | ✅ | ❌ |
| 样式/格式清理 | ✅ | ❌ |
| TODO/FIXME 清理 | ✅ | ❌ |
| console.log 清理 | ✅ | ❌ |
| import 重排 | ✅ | ❌ |
| 多文件协调改动 | ❌ | ✅ |
| 架构变更 | ❌ | ✅ |
| C# 后端 | ❌ | ✅ |
| Migration SQL | ❌ | ✅ |
| 跨模块重构 | ❌ | ✅ |

### 并行流水线示例

```
时间线:
  mimo: [任务A] [任务B] [任务C]
  Codex: [复杂任务X───────────] [审查A] [审查B] [审查C] [整合]
```

### 执行流程

1. **分拣**: 把任务分成 mimo 批次和 Codex 批次
2. **启动**: mimo 开始跑第一个简单任务，同时 Codex 开始处理复杂任务
3. **轮询**: mimo 完成后审查 + commit，立即派发下一个
4. **整合**: 两边都完成后，跑全红绿灯确认

### 注意事项
- mimo 和 Codex 不要同时改同一个文件
- mimo 改完的文件要先 commit，避免冲突
- 复杂任务如果依赖 mimo 的产出，等 mimo 完成后再开始
