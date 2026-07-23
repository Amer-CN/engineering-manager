# AI 助手页 + 语音知识库页 重构交接文档

> 会话时间：2026-07-21  
> 项目版本：v0.82.0  
> 状态：**进行中（未完成红绿灯验证）**

---

## 一、任务背景

用户要求审查并重构工程管家项目的两个页面：

1. **AI 助手页（首页，路由 `/dashboard`）**：当前视觉和操作逻辑差，用户原话"不怕推翻重来"
2. **语音知识库页（路由 `/knowledge`）**：用于语音转文字并沉淀成知识库，页面设计不好看、操作逻辑别扭

### 用户确认的方向

- AI 助手页改为「纯对话优先」布局（砍掉统计卡/能力卡/智能建议等冗余组件）
- 配色改 `primary-*` + `slate-*`，跟随三主题（White/Graphite/Sandstone）
- 语音页加「现场录音」功能（MediaRecorder API）
- 语音页改竖向流水线布局，去割裂 Tab
- 校对器加音频播放器（边听边改）

---

## 二、已完成的工作

### 2.1 AI 助手页（AgentDashboard）

| 改动 | 说明 |
|------|------|
| **新建 `MarkdownRenderer.tsx`** | 零依赖 Markdown 渲染器（323 行），输出 React 元素（不用 `dangerouslySetInnerHTML`），支持标题/粗体/斜体/删除线/行内代码/围栏代码块/有序无序列表（含嵌套）/GFM 表格/引用/分割线/链接。链接协议白名单（仅 http(s)/mailto），点击拦截默认导航避免 WebView2 SPA 跳转 |
| **新建 `MarkdownRenderer.test.tsx`** | 12 个测试用例全过 |
| **重写 `AgentDashboard.tsx`** | 纯对话优先布局：空态=居中欢迎+输入框+快捷提问 chip+右侧对话历史常驻；对话态=顶部极简条（图标+模型名+搜索+移动端历史按钮） |
| **修改 `MessageBubble.tsx`** | 助手消息接入 MarkdownRenderer，用户消息保持纯文本；气泡颜色 `blue-600` → `primary-600` |
| **修改 `AgentComposer.tsx`** | 配色 `blue/violet` → `primary` |
| **修改 `ConversationHistory.tsx`** | 配色 `blue` → `primary` |
| **修改 `AgentSearch.tsx`** | 配色 `blue/violet` → `primary` |
| **修改 `KnowledgeSourceCard.tsx`** | 配色 `violet` → `primary` |
| **修改 `RichToolResult.tsx`** | 配色 `violet` → `primary` |
| **注册图标** | `iconMap.ts` 新增 Mic/Pause/Play/Square |
| **删除组件** | `AgentHero.tsx` / `StatOverview.tsx` / `CapabilityGrid.tsx` / `InsightPanel.tsx` 及其测试 |

### 2.2 语音知识库页（SpeechKnowledgePage）

| 改动 | 说明 |
|------|------|
| **新建 `AudioRecorder.tsx`** | MediaRecorder 录音组件，默认输出 webm/opus，含计时器+暂停/继续+完成录音+错误处理 |
| **新建 `AudioInputCard.tsx`** | 统一入口：分段切换「上传文件 / 现场录音」，上传模式为拖拽 dropzone，录音模式嵌入 AudioRecorder |
| **重构 `TranscriptionWorkspace.tsx`** | 自动上传（无需手动点"开始上传"）+ audioUrl 状态管理 + 防御性 URL API 检查 + 失败态改语义色 |
| **修改 `TranscriptEditor.tsx`** | 新增 audioUrl prop + 音频播放器 + 分段点击时间戳跳转播放位置 |
| **修改 `SttEndpoints.cs`** | `AllowedAudioExtensions` 加 `.webm`（后端 ffmpeg 预处理已支持任意格式转 16k mono wav） |
| **删除** | `AudioUploadCard.tsx` 及其测试 |

---

## 三、未完成的工作（接手者继续）

### 3.1 🔴 vite build 失败（CSS 压缩错误）

```
lightningcss minify Unexpected token Semicolon
```

**排查方向**：
- 没改任何 CSS 文件，只改了 TSX
- 可能原因：`MarkdownRenderer.tsx` 第 72 行的 `text-[0.85em]` 任意值类生成了坏 CSS
- **建议先试**：把 `text-[0.85em]` 改成 `text-xs`，重新 build 看是否解决
- 如果没解决：跑 `npx vite build 2>&1 | Out-File vite-build.log -Encoding utf8`，读完整日志定位

### 3.2 🔴 npm run check 报 2 个 HARD FAIL（文件行数超 400 上限）

| 文件 | 当前行数 | 需降到 |
|------|---------|--------|
| `src/components/features/agent/AgentDashboard.tsx` | 473 行 | ≤400 行 |
| `src/components/features/knowledge/TranscriptionWorkspace.tsx` | 412 行 | ≤400 行 |

**建议拆分方案**：
- **AgentDashboard**：提取空态欢迎区块为 `AgentWelcome.tsx` 子组件（约 70 行）
- **TranscriptionWorkspace**：提取参数卡片为 `TranscriptionParams.tsx` 子组件（约 50 行）

### 3.3 🟡 红绿灯验证（全部跑通才算完成）

```bash
# 1. 后端编译
cd "E:\测试\EngineeringManager.Api" && dotnet build

# 2. 后端单元测试
cd "E:\测试\EngineeringManager.Tests" && dotnet test

# 3. 前端规则检查
cd "E:\测试" && npm run check

# 4. 前端构建
cd "E:\测试" && npx vite build

# 5. TypeScript 类型检查
cd "E:\测试" && npx tsc --noEmit --pretty false
```

**通过标准**（AGENTS.md 规定）：
- 后端 0 错误 0 警告
- 后端 tests 全部通过
- 前端 check 0 HARD FAIL（73 警告是历史软警告，不影响）
- vite build 成功
- tsc 0 error

### 3.4 已确认的既有问题（不需要修）

- 118 个 vitest 失败（members/projects/partners/wages 模块）是仓库**既有失败**，与本次改动无关
- agent 43/43 测试全过 ✅
- knowledge 87/87 测试全过 ✅

---

## 四、关键文件清单

### 新建文件
| 文件 | 作用 |
|------|------|
| `src/components/features/agent/MarkdownRenderer.tsx` | Markdown 渲染器（323 行） |
| `src/components/features/agent/__tests__/MarkdownRenderer.test.tsx` | 12 个测试 |
| `src/components/features/knowledge/AudioRecorder.tsx` | MediaRecorder 录音组件 |
| `src/components/features/knowledge/AudioInputCard.tsx` | 统一上传/录音输入 |

### 修改文件
| 文件 | 改动要点 |
|------|---------|
| `src/components/features/agent/AgentDashboard.tsx` | 重写为纯对话优先布局 |
| `src/components/features/agent/MessageBubble.tsx` | 接入 MarkdownRenderer |
| `src/components/features/agent/AgentComposer.tsx` | 配色改 primary |
| `src/components/features/agent/ConversationHistory.tsx` | 配色改 primary |
| `src/components/features/agent/AgentSearch.tsx` | 配色改 primary |
| `src/components/features/agent/KnowledgeSourceCard.tsx` | 配色改 primary |
| `src/components/features/agent/RichToolResult.tsx` | 配色改 primary |
| `src/components/features/knowledge/TranscriptionWorkspace.tsx` | 自动上传 + audioUrl |
| `src/components/features/knowledge/TranscriptEditor.tsx` | 加音频播放器 + 分段跳转 |
| `src/utils/iconMap.ts` | 注册 Mic/Pause/Play/Square |
| `EngineeringManager.Api/Endpoints/SttEndpoints.cs` | 加 .webm 到白名单 |

### 删除文件
| 文件 |
|------|
| `src/components/features/agent/AgentHero.tsx` |
| `src/components/features/agent/StatOverview.tsx` |
| `src/components/features/agent/CapabilityGrid.tsx` |
| `src/components/features/agent/InsightPanel.tsx` |
| `src/components/features/agent/__tests__/StatOverview.test.tsx` |
| `src/components/features/agent/__tests__/CapabilityGrid.test.tsx` |
| `src/components/features/agent/__tests__/InsightPanel.test.tsx` |
| `src/components/features/knowledge/AudioUploadCard.tsx` |
| `src/components/features/knowledge/__tests__/AudioUploadCard.test.tsx` |

---

## 五、技术决策记录

| 决策 | 原因 |
|------|------|
| 不装 react-markdown，自己写 MarkdownRenderer | 避免新增依赖；代码库约定不用 `dangerouslySetInnerHTML`，输出 React 元素才安全 |
| MarkdownRenderer 用 `String.fromCharCode(10/13)` 代替 `\n/\r` | 工具链对转义字符处理有坑，用 charCode 规避 |
| 链接点击 `e.preventDefault()` + `window.open` | WebView2 内默认导航会替换 SPA 页面，必须拦截 |
| `text-[0.85em]` 任意值类 | **可能是 vite build 失败的元凶**，接手者优先验证/替换 |
| URL API 防御检查 `typeof URL !== 'undefined'` | jsdom 测试环境没有 `URL.createObjectURL` |

---

## 六、接手者 TODO 清单（按顺序）

1. **修 vite build**：先试把 `MarkdownRenderer.tsx:72` 的 `text-[0.85em]` 改成 `text-xs`，跑 `npx vite build`
2. **修 HARD FAIL**：拆分 AgentDashboard（提取 AgentWelcome）和 TranscriptionWorkspace（提取 TranscriptionParams）
3. **跑完整红绿灯**：5 项全绿
4. **视觉验收**：启动应用（`cd EngineeringManager.Api && dotnet run`），检查 AI 助手页和语音知识库页的实际效果
5. **可选优化**：如果时间充裕，可以进一步优化 UI 细节
