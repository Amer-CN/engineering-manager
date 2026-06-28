# AI Agent 首页功能 - 交接文档

> **创建时间**：2026-06-28
> **当前状态**：P1+P2 后端地基已完成，前端基础框架已搭建
> **下一步**：启动测试 + 修复问题 + 完善 UI

---

## 📋 项目概述

### 目标
将工程管家首页从"被动数据展示"改造成"AI Agent 工作台"，彻底解决与项目管理页面的冲突。

### 核心理念
- **传统软件**：用户自己找数据、自己分析
- **Agent 软件**：用户用自然语言提问，AI 帮你查数据、分析、建议

### 技术选型
- **LLM**：Agnes-2.0-Flash（免费，OpenAI 兼容，支持 function calling）
  - Base URL: `https://apihub.agnes-ai.com/v1`
  - API Key: `sk-1RP0oZ6uuxPzeMoBvZT0lDRnIPQKm6783G6KcHEZ9fWtk50A`
  - 模型名: `agnes-2.0-flash`
- **协议**：完全 OpenAI 兼容（`/chat/completions`）
- **加密**：Windows DPAPI（复刻 OCR 那套）

---

## ✅ 已完成的工作

### 后端（C# .NET 8）

#### 1. LLM Provider 抽象层
**文件**：`EngineeringManager.Api/Services/LlmProviderService.cs`

**功能**：
- 支持 OpenAI 兼容协议（Agnes、GLM、通义、DeepSeek 等）
- 配置优先级：用户配置 > 环境变量 > 内置兜底
- 支持流式输出和 function calling
- DPAPI 加密存储用户配置
- 测试连接功能（返回可用模型列表）

**关键方法**：
```csharp
// 获取当前配置
public LlmProviderConfig GetConfig()

// 测试连接
public async Task<(bool success, List<string> models, string error)> TestConnectionAsync(string baseUrl, string apiKey)

// 非流式调用
public async Task<ChatCompletionResponse> ChatAsync(List<AgentMessage> messages, List<AgentTool>? tools = null)

// 流式调用
public async IAsyncEnumerable<ChatCompletionChunk> ChatStreamAsync(...)

// 检查是否可用
public async Task<bool> IsAvailableAsync()
```

#### 2. Agent 工具白名单服务
**文件**：`EngineeringManager.Api/Services/AgentToolService.cs`

**已注册的 13 个工具**：
| 工具名 | 描述 | 所需权限 |
|--------|------|---------|
| `getDashboardStats` | 获取仪表盘统计数据 | projects:read |
| `getProjects` | 获取所有项目列表 | projects:read |
| `getProjectDetail` | 获取指定项目详情 | projects:read |
| `getInvoices` | 获取发票列表 | invoices:read |
| `getPendingInvoices` | 获取待付款发票 | invoices:read |
| `getSettlements` | 获取结算单列表 | settlement:read |
| `getPendingSettlements` | 获取待处理结算 | settlement:read |
| `getMembers` | 获取管理人员列表 | members:read |
| `getWorkers` | 获取农民工列表 | labor:read |
| `getContracts` | 获取合同列表 | contracts:read |
| `getInventory` | 获取仓库物料列表 | inventory:read |
| `getCostSummary` | 获取成本台账汇总 | costLedger:read |
| `getPartners` | 获取合作单位列表 | partners:read |

**安全特性**：
- 根据用户权限动态过滤工具（不同角色看到不同工具）
- PII 脱敏（身份证、手机号、银行账号等敏感字段替换为 `***`）
- 二次权限校验（不信任 LLM 返回的工具名）

#### 3. 对话历史服务
**文件**：`EngineeringManager.Api/Services/AgentConversationService.cs`

**功能**：
- 创建/删除对话（软删除）
- 保存/加载消息
- 获取对话列表（按更新时间倒序）
- 自动生成对话标题（取前 20 个字符）

#### 4. Agent 端点
**文件**：`EngineeringManager.Api/Endpoints/AgentEndpoints.cs`

**端点列表**：
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/agent/chat` | 聊天（核心功能） | 需登录 |
| GET | `/api/agent/conversations` | 获取对话列表 | 需登录 |
| GET | `/api/agent/conversations/{id}` | 获取对话详情 | 需登录 |
| DELETE | `/api/agent/conversations/{id}` | 删除对话 | 需登录 |
| GET | `/api/agent/setup/status` | 检查配置状态 | 白名单 |
| POST | `/api/agent/setup/test` | 测试连接 | 白名单 |
| POST | `/api/agent/setup/save` | 保存配置 | admin |
| GET | `/api/agent/config` | 获取当前配置 | 需登录 |
| POST | `/api/agent/config/reload` | 重新加载配置 | admin |

**聊天流程**：
1. 获取或创建对话
2. 保存用户消息
3. 加载对话历史（最近 50 条）
4. 添加系统提示词
5. 获取可用工具（根据权限过滤）
6. 调用 LLM
7. 处理工具调用（如果有）
8. 将工具结果发回 LLM，获取最终回答
9. 保存 assistant 消息
10. 返回响应

#### 5. 迁移脚本
**文件**：`EngineeringManager.Api/Migrations/Scripts/027_AddAgentTables.sql`

**创建的表**：
- `agent_conversations` - 对话表
- `agent_messages` - 消息表
- `agent_settings` - 用户 Agent 设置表
- `agent_usage_stats` - LLM 调用统计表

#### 6. 配置模型
**文件**：
- `EngineeringManager.Api/Models/LlmProviderConfig.cs` - LLM Provider 配置
- `EngineeringManager.Api/Models/AgentTool.cs` - 工具定义
- `EngineeringManager.Api/Models/AgentMessage.cs` - 消息模型

#### 7. 注册服务和端点
**修改的文件**：
- `EngineeringManager.Api/Program.cs` - 注册 Agent 服务
- `EngineeringManager.Api/GlobalAuthMiddleware.cs` - 添加白名单 `/api/agent/setup`

---

### 前端（React 18 + TypeScript）

#### 1. Agent 类型定义
**文件**：`src/types/agent.ts`

**定义的类型**：
- `AgentChatRequest` - 聊天请求
- `AgentChatResponse` - 聊天响应
- `AgentMessage` - 消息模型
- `ToolCall` - 工具调用
- `ToolCallResult` - 工具调用结果
- `AgentConversation` - 对话列表项
- `AgentConversationDetail` - 对话详情
- `LlmProviderConfig` - LLM 配置
- `LlmProviderStatus` - LLM 状态
- `SuggestionCardConfig` - 建议卡片配置

#### 2. Agent API 客户端
**文件**：`src/services/agent-client.ts`

**导出的函数**：
```typescript
// 发送消息
export async function sendAgentMessage(request: AgentChatRequest): Promise<AgentChatResponse>

// 获取对话列表
export async function getAgentConversations(): Promise<AgentConversation[]>

// 获取对话详情
export async function getAgentConversationDetail(conversationId: number): Promise<AgentConversationDetail | null>

// 删除对话
export async function deleteAgentConversation(conversationId: number): Promise<boolean>

// 检查 LLM 配置状态
export async function getLlmProviderStatus(): Promise<LlmProviderStatus | null>

// 测试 LLM 连接
export async function testLlmProviderConnection(request: LlmProviderTestRequest): Promise<LlmProviderTestResponse>

// 保存 LLM 配置
export async function saveLlmProviderConfig(config: LlmProviderConfig): Promise<{ success: boolean; error?: string }>

// 获取当前 LLM 配置
export async function getLlmProviderConfig(): Promise<...>

// 重新加载 LLM 配置
export async function reloadLlmProviderConfig(): Promise<boolean>
```

#### 3. Agent 首页组件
**文件**：`src/components/features/agent/AgentDashboard.tsx`

**功能**：
- Hero 横幅（显示 AI 助手标题和用户名）
- 对话区域（消息列表 + 输入框）
- 建议卡片（快捷问题入口）
- 对话历史侧边栏
- 工具执行结果展示

#### 4. 子组件
**文件**：
- `src/components/features/agent/MessageBubble.tsx` - 消息气泡
- `src/components/features/agent/SuggestionCards.tsx` - 建议卡片
- `src/components/features/agent/ConversationHistory.tsx` - 对话历史侧边栏

#### 5. 注册新图标
**修改的文件**：`src/utils/iconMap.ts`

**新增的图标**：`Bot`, `MessageSquare`, `Send`, `User`

#### 6. 更新路由
**修改的文件**：`src/routes.ts`

**改动**：
```typescript
// 旧
{ id: 'dashboard', label: '首页', icon: 'LayoutDashboard', description: '数据概览与统计' }

// 新
{ id: 'dashboard', label: 'AI 助手', icon: 'Bot', description: '智能工作台与对话助手' }
```

#### 7. 切换首页组件
**修改的文件**：`src/App.tsx`

**改动**：
```typescript
// 旧
const Dashboard = lazy(() => import('./components/features/dashboard/Dashboard'))

// 新
const Dashboard = lazy(() => import('./components/features/agent/AgentDashboard'))
```

---

## 🔧 编译检查结果

- ✅ 后端编译：0 错误
- ✅ 前端 lint 检查：0 项违规（11 项警告是历史软警告）
- ✅ 前端 vite build：11.40 秒成功

---

## ❌ 未完成的工作

### P2 阶段待完成

#### 1. 流式输出（打字机效果）
**状态**：后端已支持，前端未实现

**需要做的**：
- 前端使用 `fetch` 的 `ReadableStream` 处理流式响应
- 逐字显示 AI 回复（打字机效果）
- 显示加载动画

**参考实现**：
```typescript
// 前端流式调用示例
const response = await fetch('/api/agent/chat-stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
})

const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader!.read()
  if (done) break
  
  const chunk = decoder.decode(value)
  // 解析 SSE 格式：data: {...}
  // 更新 UI
}
```

#### 2. LLM 设置页面
**状态**：未实现

**需要做的**：
- 创建 `src/components/ui/SettingsLlmSection.tsx`
- 复刻 OCR 设置范式（`SettingsOcrSection.tsx`）
- 功能：
  - 状态概览（在线/离线）
  - 模式选择（内置免费 / 自定义 API）
  - 配置表单（供应商名 / Base URL / API Key）
  - "测试并获取模型列表"按钮
  - "保存配置"按钮

**参考**：`src/components/SettingsOcrSection.tsx`

#### 3. 降级到规则引擎
**状态**：未实现

**需要做的**：
- 当 LLM 不可用时（网络断开、API 限流等），自动降级到规则引擎
- 规则引擎：关键词匹配 → 直接调用工具 → 返回结构化结果
- 保证软件核心功能永远在线

**示例**：
```csharp
public async Task<AgentResponse> ChatAsync(List<AgentMessage> messages)
{
    try
    {
        return await _llmService.ChatAsync(messages);
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "LLM unavailable, falling back to rule engine");
        return await RuleEngineFallback(messages);
    }
}
```

#### 4. 更多工具
**状态**：基础 13 个工具已注册，可扩展

**可添加的工具**：
- `getWorkerWages` - 查询工人工资
- `getAttendances` - 查询考勤记录
- `getSalaryHistory` - 查询薪资历史
- `getProjectMembers` - 查询项目成员
- `getDrawings` - 查询图纸
- `getAuditLogs` - 查询审计日志

#### 5. 对话标题编辑
**状态**：未实现

**需要做的**：
- 前端：对话列表支持点击标题编辑
- 后端：`PUT /api/agent/conversations/{id}` 更新标题

#### 6. 对话导出
**状态**：未实现

**需要做的**：
- 导出对话为 Markdown/PDF
- 包含工具调用结果

---

## 📋 完整的实施计划

### P1 地基（已完成）
- [x] LLM Provider 抽象层
- [x] 配置存储与加密（DPAPI）
- [x] 工具白名单与权限校验
- [x] PII 脱敏层
- [x] 对话历史管理
- [x] 迁移脚本

### P2 只读对话（部分完成）
- [x] 对话 UI（基础版）
- [x] 建议卡片
- [x] 对话历史侧边栏
- [ ] 流式输出（打字机效果）
- [ ] LLM 设置页面
- [ ] 降级到规则引擎

### P3 受控执行（未开始）
- [ ] Agent 能执行单步操作（标记结算、确认回款）
- [ ] 强制人工确认
- [ ] 权限 + 审计

### P4 多步 + 主动（未开始）
- [ ] 多步任务编排
- [ ] 后台巡检推送
- [ ] 主动异常提醒

---

## 🚀 启动测试步骤

### 1. 后端编译
```bash
cd "E:\测试\EngineeringManager.Api"
dotnet build
```

### 2. 前端编译
```bash
cd "E:\测试"
npm run check
npx vite build
```

### 3. 启动软件
```bash
cd "E:\测试\EngineeringManager.Api"
dotnet run
```

### 4. 测试 Agent 功能
1. 打开软件，登录（admin 账号）
2. 首页应该显示 AI 助手界面
3. 点击建议卡片或输入问题
4. 观察是否正常返回结果

### 5. 测试 LLM 连接
```bash
# 测试 Agnes API 是否可用
curl -X POST https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer sk-1RP0oZ6uuxPzeMoBvZT0lDRnIPQKm6783G6KcHEZ9fWtk50A" \
  -H "Content-Type: application/json" \
  -d '{"model":"agnes-2.0-flash","messages":[{"role":"user","content":"你好"}]}'
```

---

## ⚠️ 已知问题

### 1. 前端 AgentDashboard.tsx 行数
- 当前：300 行（建议 ≤250）
- 状态：SOFT WARN，不影响编译
- 建议：进一步拆分组件

### 2. 后端 async 警告
- 多个工具的 Execute 函数标记为 async 但没有 await
- 状态：WARNING，不影响功能
- 建议：改为同步函数或添加 await

### 3. 内置 API Key 安全性
- 当前：Agnes 免费 API Key 硬编码在代码中
- 风险：所有用户共用同一个 key，可能被限流
- 建议：提供自定义 API 选项，内置 key 作为兜底

---

## 📁 文件清单

### 后端新增文件
```
EngineeringManager.Api/
├── Models/
│   ├── LlmProviderConfig.cs          # LLM Provider 配置模型
│   ├── AgentTool.cs                  # 工具定义模型
│   └── AgentMessage.cs               # 消息模型
├── Services/
│   ├── LlmProviderService.cs         # LLM Provider 抽象层（核心）
│   ├── AgentToolService.cs           # 工具白名单 + 权限校验
│   └── AgentConversationService.cs   # 对话历史管理
├── Endpoints/
│   └── AgentEndpoints.cs             # Agent API 端点
└── Migrations/Scripts/
    └── 027_AddAgentTables.sql        # 数据库迁移脚本
```

### 前端新增文件
```
src/
├── types/
│   └── agent.ts                      # Agent 相关类型定义
├── services/
│   └── agent-client.ts               # Agent API 客户端
└── components/features/agent/
    ├── AgentDashboard.tsx             # Agent 首页主组件
    ├── MessageBubble.tsx              # 消息气泡组件
    ├── SuggestionCards.tsx            # 建议卡片组件
    └── ConversationHistory.tsx        # 对话历史侧边栏
```

### 修改的文件
```
EngineeringManager.Api/
├── Program.cs                        # 注册 Agent 服务
└── GlobalAuthMiddleware.cs           # 添加白名单

src/
├── App.tsx                           # 切换到 AgentDashboard
├── routes.ts                         # 更新路由标签
└── utils/iconMap.ts                  # 注册新图标
```

---

## 🔐 安全设计

### 1. 权限隔离
- 工具白名单：每个工具声明所需权限
- 动态过滤：根据当前用户 permissions 过滤工具
- 二次校验：工具执行时再次检查权限（不信任 LLM）

### 2. PII 脱敏
- 送 LLM 前：身份证号、手机号、银行账号等替换为 `***`
- 敏感字段列表：`idCard`, `bankAccount`, `phone`, `address`, `password`, `createdBy` 等

### 3. Prompt Injection 防护
- System Prompt 硬编码安全规则
- 输入过滤（可扩展）
- 工具白名单（LLM 只能调用预定义的工具）

### 4. 配置加密
- 用户自定义 API Key 使用 DPAPI 加密存储
- 存储路径：`<dataPath>/llm-config.dpapi.json`
- 仅当前 Windows 用户可解密

---

## 📞 联系方式

如有问题，请参考：
- 项目文档：`AGENTS.md`
- 安全审计：`P0-FIX-PLAN.md`
- OCR 设置范式：`src/components/SettingsOcrSection.tsx`

---

**祝开发顺利！🚀**
