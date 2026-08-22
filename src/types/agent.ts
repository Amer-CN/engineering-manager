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

/** LLM Provider 配置 */
export interface LlmProviderConfig {
  providerName: string
  baseUrl: string
  apiKey: string
  model: string
  useBuiltIn: boolean
  temperature: number
  maxTokens: number
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
