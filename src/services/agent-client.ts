/**
 * Agent API 客户端
 *
 * 对应后端 /api/agent/* 端点
 * 复用 api-client.ts 的认证和请求封装
 */

import { apiClient } from './api-client'
import type {
  AgentChatRequest,
  AgentChatResponse,
  AgentConversation,
  AgentConversationDetail,
  LlmProviderStatus,
  LlmProviderTestRequest,
  LlmProviderTestResponse,
  LlmProviderConfig,
} from '../types/agent'

// ═══════════════════════════════════════════════════════════════
// 聊天对话（核心功能）
// ═══════════════════════════════════════════════════════════════

/**
 * 发送消息给 Agent
 * @param request 聊天请求（message + 可选 conversationId）
 * @returns 聊天响应（含 AI 回复和工具调用结果）
 */
export async function sendAgentMessage(
  request: AgentChatRequest
): Promise<AgentChatResponse> {
  const result = await apiClient.post<AgentChatResponse>('/api/agent/chat', request)
  if (!result.success || !result.data) {
    return {
      success: false,
      conversationId: 0,
      error: result.error || '发送消息失败',
    }
  }
  return result.data
}

// ═══════════════════════════════════════════════════════════════
// 对话历史管理
// ═══════════════════════════════════════════════════════════════

/**
 * 获取用户的对话列表
 */
export async function getAgentConversations(): Promise<AgentConversation[]> {
  const result = await apiClient.get<{ success: boolean; data: AgentConversation[] }>(
    '/api/agent/conversations'
  )
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取对话列表失败:', result.error)
    return []
  }
  return result.data.data || []
}

/**
 * 获取对话详情（含消息列表）
 * @param conversationId 对话 ID
 */
export async function getAgentConversationDetail(
  conversationId: number
): Promise<AgentConversationDetail | null> {
  const result = await apiClient.get<{ success: boolean; data: AgentConversationDetail }>(
    `/api/agent/conversations/${conversationId}`
  )
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取对话详情失败:', result.error)
    return null
  }
  return result.data.data || null
}

/**
 * 删除对话（软删除）
 * @param conversationId 对话 ID
 */
export async function deleteAgentConversation(
  conversationId: number
): Promise<boolean> {
  const result = await apiClient.del<{ success: boolean }>(
    `/api/agent/conversations/${conversationId}`
  )
  return result.success
}

// ═══════════════════════════════════════════════════════════════
// LLM 配置管理
// ═══════════════════════════════════════════════════════════════

/**
 * 检查 LLM 配置状态（白名单，无需登录）
 */
export async function getLlmProviderStatus(): Promise<LlmProviderStatus | null> {
  const result = await apiClient.get<{ success: boolean; data: LlmProviderStatus }>(
    '/api/agent/setup/status'
  )
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取 LLM 状态失败:', result.error)
    return null
  }
  return result.data.data || null
}

/**
 * 测试 LLM 连接（白名单，无需登录）
 * @param request 测试请求（baseUrl + apiKey）
 */
export async function testLlmProviderConnection(
  request: LlmProviderTestRequest
): Promise<LlmProviderTestResponse> {
  const result = await apiClient.post<LlmProviderTestResponse>(
    '/api/agent/setup/test',
    request
  )
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || '测试连接失败',
    }
  }
  return result.data
}

/**
 * 保存 LLM 配置（需 admin 权限，DPAPI 加密存储）
 * @param config LLM 配置
 */
export async function saveLlmProviderConfig(
  config: LlmProviderConfig
): Promise<{ success: boolean; error?: string }> {
  const result = await apiClient.post<{ success: boolean; message?: string }>(
    '/api/agent/setup/save',
    config
  )
  if (!result.success) {
    return {
      success: false,
      error: result.error || '保存配置失败',
    }
  }
  return { success: true }
}

/**
 * 获取当前生效的 LLM 配置（不含 apiKey）
 */
export async function getLlmProviderConfig(): Promise<{
  providerName: string
  baseUrl: string
  model: string
  useBuiltIn: boolean
  temperature: number
  maxTokens: number
  hasApiKey: boolean
} | null> {
  const result = await apiClient.get<{
    success: boolean
    data: {
      providerName: string
      baseUrl: string
      model: string
      useBuiltIn: boolean
      temperature: number
      maxTokens: number
      hasApiKey: boolean
    }
  }>('/api/agent/config')
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取 LLM 配置失败:', result.error)
    return null
  }
  return result.data.data || null
}

/**
 * 重新加载 LLM 配置（需 admin 权限）
 */
export async function reloadLlmProviderConfig(): Promise<boolean> {
  const result = await apiClient.post<{ success: boolean }>(
    '/api/agent/config/reload',
    {}
  )
  return result.success
}
