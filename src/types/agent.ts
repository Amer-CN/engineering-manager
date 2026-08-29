/**
 * Agent 相关类型定义
 *
 * 对应后端 EngineeringManager.Api.Models 命名空间下的模型
 */

// ═══════════════════════════════════════════════════════════════
// 对话相关
// ═══════════════════════════════════════════════════════════════

/** 聊天请求 */
export interface AgentChatRequest {
  message: string
  conversationId?: number
  /** 本次调用覆盖默认模型（空 = 跟随配置） */
  model?: string
  /** 推理档位 off/low/medium/high（off/空 = 不传） */
  reasoningLevel?: string
}

/** 聊天响应 */
export interface AgentChatResponse {
  success: boolean
  conversationId: number
  message?: AgentMessage
  toolCalls?: ToolCallResult[]
  error?: string
}

/** 消息模型 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content?: string
  toolCalls?: ToolCall[] | ToolCallResult[]
  toolCallId?: string
  name?: string
}

/** 工具调用 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** 工具调用结果 */
export interface ToolCallResult {
  toolName: string
  toolCallId: string
  success: boolean
  result?: unknown
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// 对话历史
// ═══════════════════════════════════════════════════════════════

/** 对话列表项 */
export interface AgentConversation {
  id: number
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage?: string
  /** 归档时间（非空 = 已归档，与软删除语义分离） */
  archivedAt?: string | null
  /** 软删除时间（仅「最近删除」列表返回，非空 = 已软删除） */
  deletedAt?: string | null
}

/** 对话详情（含消息列表） */
export interface AgentConversationDetail {
  id: number
  title: string
  messages: AgentMessageResponse[]
  createdAt: string
  updatedAt: string
}

/** 单条消息响应 */
export interface AgentMessageResponse {
  id: number
  role: 'user' | 'assistant' | 'system' | 'tool'
  content?: string
  toolCalls?: ToolCallResult[]
  createdAt: string
}

// ═══════════════════════════════════════════════════════════════
// LLM 配置
// ═══════════════════════════════════════════════════════════════

/** 模型能力标记（参照 ZCode 编辑模型配置：输入 text/image/video，输出 text 锁定） */
export interface ModelCapability {
  input: string[]
  output: string[]
}

/** 服务商下的单个模型条目 */
export interface ProviderModelEntry {
  id: string
  input: string[]
  output: string[]
}

/**
 * 自定义服务商条目 — 多服务商并存，各自的 BaseUrl / Key / 模型列表
 * apiKey 仅在保存请求中出现（留空 = 保留原密钥）；读取响应里只有 hasApiKey
 */
export interface ProviderEntry {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  hasApiKey?: boolean
  models: ProviderModelEntry[]
  activeModelId: string
}

/** 多服务商配置 — AI 设置的完整状态（整份回传保存） */
export interface MultiProviderConfig {
  activeProviderId: string | null
  useBuiltIn: boolean
  providers: ProviderEntry[]
  temperature: number
  maxTokens: number
  /** HTTP 代理地址（如 http://127.0.0.1:7890；空 = 直连） */
  proxyUrl?: string
}

/** LLM Provider 配置（后端展开后的「当前生效配置」形状） */
export interface LlmProviderConfig {
  providerName: string
  baseUrl: string
  apiKey: string
  model: string
  useBuiltIn: boolean
  temperature: number
  maxTokens: number
  /** 「获取模型列表」拉到的可选模型清单（保存时随配置持久化） */
  availableModels?: string[]
  /** 各模型能力标记（key = 模型 ID；缺失 = 纯文本） */
  modelCapabilities?: Record<string, ModelCapability>
  updatedAt?: string
  updatedBy?: string
}

/** LLM 配置状态（不含 apiKey） */
export interface LlmProviderStatus {
  configured: boolean
  provider: string
  model: string
  useBuiltIn: boolean
  source: 'builtin' | 'custom' | 'env'
}

/** 测试连接请求 */
export interface LlmProviderTestRequest {
  baseUrl: string
  apiKey: string
  /** HTTP 代理地址（可选；空 = 直连） */
  proxyUrl?: string
}

/** 测试连接响应 */
export interface LlmProviderTestResponse {
  success: boolean
  message?: string
  data?: {
    models: string[]
    modelCount: number
  }
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// 前端 UI 相关
// ═══════════════════════════════════════════════════════════════

/** 建议卡片配置 */
export interface SuggestionCardConfig {
  icon: string
  title: string
  prompt: string
  requiredPermission?: string
  color?: string
}

/** 工具执行状态（用于 UI 展示） */
export interface ToolExecutionStatus {
  toolName: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: unknown
  error?: string
  startTime?: number
  endTime?: number
}

/** Agent 状态 */
export interface AgentState {
  conversations: AgentConversation[]
  currentConversation: AgentConversationDetail | null
  loading: boolean
  error: string | null
  streamingMessage: string | null
}
