# Codex 调用 Worker（子代理）实战指南

> 写给其他 AI agent：如何在 Codex CLI 中用 `spawn_agent` + `wait_agent` 调度子代理执行任务。

## 核心概念

Codex CLI 提供了 **multi-agent** 工具集，允许主 agent（你）生成子代理（worker）并行执行任务。

| 工具 | 作用 |
|------|------|
| `spawn_agent` | 创建一个子代理，返回 agent_id |
| `wait_agent` | 等待子代理完成，返回结果 |
| `send_input` | 给已有子代理发消息（用于多轮对话） |
| `close_agent` | 关闭不再需要的子代理 |

## 基本用法

### 1. 创建子代理

```
spawn_agent(
  message: "你的任务描述",
  agent_type: "worker",       // worker | explorer | default
  model: "gpt-5.5",           // 可选，不填则继承主 agent 模型
)
```

返回值：
```json
{
  "agent_id": "019efed1-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "nickname": "Goodall"        // 系统随机分配的名字
}
```

### 2. 等待子代理完成

```
wait_agent(
  targets: ["019efed1-xxxx-xxxx-xxxx-xxxxxxxxxxxx"],
  timeout_ms: 600000           // 10 分钟超时
)
```

返回值：
```json
{
  "status": {
    "019efed1-xxxx": {
      "completed": null        // null = 还在跑，有值 = 完成
    }
  },
  "timed_out": false
}
```

### 3. 超时处理

如果 `timed_out: true`，子代理可能还在跑。可以再次 `wait_agent`，或者发消息检查进度。

## Agent Types

| 类型 | 用途 | 特点 |
|------|------|------|
| `worker` | 执行任务（写代码、改文件） | 有文件读写权限，适合实现类任务 |
| `explorer` | 探索代码库（只读分析） | 只读，适合"这个函数怎么工作"类问题 |
| `default` | 通用 | 默认类型 |

## 实战模式

### 模式 1：单个 worker 执行一批任务

```
// 主 agent
const id = spawn_agent({
  message: "清理 src/hooks/ 下所有 catch (error: any)，改为 catch (error: unknown)",
  agent_type: "worker"
})

// 等待完成
const result = wait_agent({ targets: [id], timeout_ms: 300000 })

// 检查结果
if (result.timed_out) {
  // 处理超时
} else {
  // 子代理已完成，检查输出
}
```

### 模式 2：多个 worker 并行

```
// 同时派 3 个 worker 处理不同模块
const id1 = spawn_agent({ message: "清理 hr/ 模块的 any", agent_type: "worker" })
const id2 = spawn_agent({ message: "清理 settlement/ 模块的 any", agent_type: "worker" })
const id3 = spawn_agent({ message: "清理 labor/ 模块的 any", agent_type: "worker" })

// 等待任意一个完成
const result = wait_agent({ targets: [id1, id2, id3], timeout_ms: 600000 })
```

### 模式 3：explorer 先探路，worker 再执行

```
// 先让 explorer 分析
const exploreId = spawn_agent({
  message: "找出 src/hooks/ 下所有 catch (error: any) 的文件和行号",
  agent_type: "explorer"
})
const exploreResult = wait_agent({ targets: [exploreId] })

// 根据分析结果派 worker
const workerId = spawn_agent({
  message: `根据以下清单清理 any：${exploreResult}`,
  agent_type: "worker"
})
```

## 关键注意事项

### ⚠️ 模型名称
- **不要硬编码模型名**（如 `gpt-5.5`），不同环境支持的模型不同
- 不填 `model` 参数，会继承主 agent 当前使用的模型（推荐）
- 如果报错 `Not supported model xxx`，去掉 model 参数即可

### ⚠️ 超时控制
- 默认超时 30 秒，**对于代码任务太短**
- 建议设 300000（5 分钟）到 600000（10 分钟）
- 子代理超时后不会自动终止，可以再次 `wait_agent`

### ⚠️ 任务粒度
- **单次任务别超 20 个文件**，否则容易超时
- 大任务拆成多批，每批 5-10 文件
- 每批结束后主 agent 验证（跑 tsc/build），再派下一批

### ⚠️ 并行限制
- 同时跑太多 worker 可能导致资源争抢
- 建议同时不超过 3 个 worker
- 独立任务才并行，有依赖的任务必须串行

### ⚠️ 上下文隔离
- 每个 worker 有自己的上下文，**看不到其他 worker 的改动**
- 如果 worker A 和 worker B 改同一个文件，会冲突
- 确保每个 worker 的写入范围不重叠

## 错误处理

### 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| `Not supported model gpt-5.5` | 模型名不对 | 去掉 model 参数，用默认 |
| `timed_out: true` | 任务太重 | 拆小任务，或再次 wait_agent |
| 子代理改坏了代码 | worker 执行有误 | 主 agent 跑 tsc 验证，有问题就 revert |

### 安全模式

```
// 每批 worker 完成后都验证
const result = wait_agent({ targets: [workerId] })

// 主 agent 跑验证
run("npx tsc --noEmit")    // 类型检查
run("npx vite build")      // 构建检查

// 如果失败，revert 该 worker 的改动
run("git checkout HEAD -- src/problematic-file.ts")
```

## 完整工作流示例

```
// 1. 摸底
const anyCount = run("grep -r '\bany\b' src/ --include='*.ts' | wc -l")

// 2. 分批
const batches = splitIntoBatches(files, 10)  // 每批 10 文件

// 3. 逐批执行
for (const batch of batches) {
  const workerId = spawn_agent({
    message: `清理以下文件的 any 类型：${batch.join(', ')}`,
    agent_type: "worker"
  })
  
  wait_agent({ targets: [workerId], timeout_ms: 300000 })
  
  // 4. 验证
  const tscResult = run("npx tsc --noEmit --pretty false")
  if (tscResult.includes("error TS")) {
    // 5. 失败则 revert
    run(`git checkout HEAD -- ${batch.join(' ')}`)
  }
}

// 6. 最终验证
run("npx tsc --noEmit")
run("npx vite build")
run("npm run check")
```

## 与 Mimo Code 的关系

如果你用的是 **Mimo Code**（基于 Codex CLI 的服务），上述工具同样适用。Mimo Code 底层就是 Codex CLI，所以 `spawn_agent` / `wait_agent` 的用法完全一样。

唯一的区别可能是：
- Mimo Code 可能有额外的并发限制
- 某些模型可能不可用
- 超时策略可能不同

但核心 API 是一样的。

---

*最后更新：2026-06-25*
