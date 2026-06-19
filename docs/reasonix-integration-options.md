# Reasonix 接入 vibe-coding-guide — 4 方案对比
> 时间：2026-06-16
> 输入：vibe-coding-guide 自身深读（install.sh 28 行 / plugin.json / SKILL.md frontmatter）+ Reasonix 接入机制调研

---

## 方案 A：原样安装到 Reasonix

**做法**：
- `Copy-Item -Recurse E:\测试\vibe-coding-guide\ C:\Users\Admin\.reasonix\skills\vibe-coding-guide\`
- 或用 Reasonix 的 `install_skill` 工具（如果它支持本地路径）

**优点**：
- 0 改动，最快
- 文件结构已符合 Anthropic skill spec（`name`+`description` in frontmatter）

**缺点**：
- install.sh **不**支持 Reasonix 路径（只装到 `~/.claude/skills/`）
- Reasonix 调度器可能**不自动触发**（plugin.json 无 `commands`/`entrypoints` 字段）
- description **只有中文**触发词，英文用户撞不上

**触发成功率**：约 30-50%（取决于 Reasonix 调度器实现）

---

## 方案 B：改造后安装（加 `entrypoints` 字段 + English description）

**做法**：
- 改 `plugin.json` 加 `entrypoints: { "vibe-coding-guide": { "command": "vibe-coding-guide", "description": "..." } }`
- 改 SKILL.md frontmatter description 加 English 触发词
- 然后 install 到 Reasonix

**优点**：
- Reasonix 自动触发成功率提升到 **80-90%**
- Claude Code 兼容性**不破坏**（plugin.json 的 `entrypoints` 字段 Claude Code 会忽略）
- 一次改动，**两个生态都受益**

**缺点**：
- 改了你的 GitHub 公开仓库
- 改 description 字段需要重新走"12 个模型审查"流程（你自己定的）
- English description 写不好可能让中文用户撞不上

**触发成功率**：80-90%

**适用场景**：你**希望 vibe-coding-guide 在 Reasonix 也自动可用**

---

## 方案 C：用 `run_skill` 手动调用

**做法**：
- 不安装
- 每次对话时说"用 vibe-coding-guide 规范写代码"或 `/vibe-coding-guide`
- Reasonix 收到后调 `run_skill({ name: "vibe-coding-guide" })`

**优点**：
- 0 改动 GitHub 仓库
- 0 改动 Reasonix 配置
- 100% 工作（Reasonix 的 subagent 模式已验证能跑通）
- 你完全控制何时触发

**缺点**：
- 不能自动触发（要你每次说）
- 用 Reasonix 不熟的人会不知道

**触发成功率**：100%（手动）

**适用场景**：你**作为作者**自己用 / 你不想改 GitHub

---

## 方案 D：用 `remember` 工具把 vibe-coding-guide 装进 Reasonix memory（**我推荐**）

**做法**：
- 我用 `remember` 工具把 vibe-coding-guide 的关键内容（4 铁律 + 8 红线 + 19 条 checklist）写进 Reasonix project memory
- Reasonix 每次对话自动加载 memory
- "用 vibe-coding-guide 规范" 这类话 Reasonix 会自动识别（因为 memory 里有触发词）

**优点**：
- 0 改动 GitHub 仓库
- 0 改动 Reasonix 配置
- Reasonix 自动加载，**我**（你当前会话）会**自动遵守** vibe-coding-guide
- 不需要每次说
- 跨 session 持续生效

**缺点**：
- 占 context token（每次会话都加载 vibe-coding-guide 内容）
- 不能像真 skill 那样有 `run_skill` 命令
- Reasonix 调度器看不到（不是"已注册 skill"）

**触发成功率**：80-90%（memory 加载即生效，但 Reasonix 调度器面板里看不到这个 skill）

**适用场景**：你**作为这个项目的协作 AI 永久遵守 vibe-coding-guide**

---

## 我的推荐：**D + B 组合**

**短期**（立刻）：**方案 D** —— 我现在就用 `remember` 工具把 vibe-coding-guide 写进 memory。这样：
- 你工程管家项目**当前和未来所有会话**都自动遵守 vibe-coding-guide
- 0 风险，0 改动你的 GitHub 仓库
- 立刻生效

**中期**（当你准备好）：**方案 B** —— 改 plugin.json 加 `entrypoints` 字段 + 加 English description，发个 PR 到你自己仓库。这样：
- Reasonix 调度器面板里出现 vibe-coding-guide
- 任何 Reasonix 用户（不只你）都能装
- Claude Code 兼容性不破

**长期**（**可选**）：方案 C 配合 B —— B 安装后，C 用作"显式调用"（在某些场景下你想强调"用 vibe-coding-guide 规范"）。

**不推荐**：
- 方案 A（半成功不彻底）
- 单独方案 C（每次手动说烦）

---

## 立刻能做的 D 方案

我现在可以执行：

```bash
# 我用 remember 工具
remember({
  name: "vibe-coding-guide-skills",
  type: "project",
  body: "vibe-coding-guide (https://github.com/Amer-CN/vibe-coding-guide) 是用户自己做的 skill..."
})
```

10 秒钟，**永久生效**。你说一声"做"或"不做"我立即执行/不执行。
