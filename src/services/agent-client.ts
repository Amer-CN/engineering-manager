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
  ToolCallResult,
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
  const result = await apiClient.get<AgentConversation[]>('/api/agent/conversations')
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取对话列表失败:', result.error)
    return []
  }
  return result.data
}

/**
 * 获取对话详情（含消息列表）
 * @param conversationId 对话 ID
 */
export async function getAgentConversationDetail(
  conversationId: number
): Promise<AgentConversationDetail | null> {
  const result = await apiClient.get<AgentConversationDetail>(
    `/api/agent/conversations/${conversationId}`
  )
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取对话详情失败:', result.error)
    return null
  }
  return result.data
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

/**
 * 重命名对话
 * @param conversationId 对话 ID
 * @param title 新标题
 */
export async function renameAgentConversation(
  conversationId: number,
  title: string
): Promise<boolean> {
  const result = await apiClient.put<{ success: boolean }>(
    `/api/agent/conversations/${conversationId}`,
    { title }
  )
  return result.success
}

/**
 * 获取“最近删除”（软删除）对话列表，供恢复入口使用
 */
export async function getDeletedAgentConversations(): Promise<AgentConversation[]> {
  const result = await apiClient.get<AgentConversation[]>(
    '/api/agent/conversations',
    { scope: 'deleted' }
  )
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取最近删除列表失败:', result.error)
    return []
  }
  return result.data
}

/**
 * 归档对话（archived_at = now，归档 ≠ 删除）
 * @param conversationId 对话 ID
 */
export async function archiveConversation(
  conversationId: number
): Promise<boolean> {
  const result = await apiClient.patch<{ success: boolean }>(
    `/api/agent/conversations/${conversationId}/archive`
  )
  return result.success
}

/**
 * 取消归档（archived_at = NULL）
 * @param conversationId 对话 ID
 */
export async function unarchiveConversation(
  conversationId: number
): Promise<boolean> {
  const result = await apiClient.patch<{ success: boolean }>(
    `/api/agent/conversations/${conversationId}/unarchive`
  )
  return result.success
}

/**
 * 恢复软删除的对话（deleted_at = NULL）
 * @param conversationId 对话 ID
 */
export async function restoreConversation(
  conversationId: number
): Promise<boolean> {
  const result = await apiClient.patch<{ success: boolean }>(
    `/api/agent/conversations/${conversationId}/restore`
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
  const result = await apiClient.get<LlmProviderStatus>('/api/agent/setup/status')
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取 LLM 状态失败:', result.error)
    return null
  }
  return result.data
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
    providerName: string
    baseUrl: string
    model: string
    useBuiltIn: boolean
    temperature: number
    maxTokens: number
    hasApiKey: boolean
  }>('/api/agent/config')
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取 LLM 配置失败:', result.error)
    return null
  }
  return result.data
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

// ===================== 流式聊天 (2a) =====================

export interface AgentStreamCallbacks {
  onConversationId?: (conversationId: number) => void
  onTool?: (name: string) => void
  onContent?: (text: string) => void
  onDone?: (payload: {
    conversationId: number
    toolCalls?: ToolCallResult[]
    message?: string
  }) => void
  onError?: (error: string) => void
}

const AGENT_STREAM_BASE =
  import.meta.env.VITE_API_BASE ?? ''

/**
 * 流式发送 Agent 消息。逐块回调；出错/环境不支持时抛异常，交给调用方回退到 sendAgentMessage。
 */
export async function sendAgentMessageStream(
  request: AgentChatRequest,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  if (typeof ReadableStream === 'undefined') {
    throw new Error('ReadableStream not supported')
  }

  const token = localStorage.getItem('jwt_token')
  const response = await fetch(`${AGENT_STREAM_BASE}/api/agent/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`stream request failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    // 逐块读取，用空行(\n\n)切分 SSE 事件
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sepIndex: number
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)
        dispatchSseEvent(rawEvent, callbacks)
      }
    }
    // 冲刷残余
    if (buffer.trim().length > 0) {
      dispatchSseEvent(buffer, callbacks)
    }
  } finally {
    reader.releaseLock()
  }
}

function dispatchSseEvent(
  rawEvent: string,
  callbacks: AgentStreamCallbacks,
): void {
  // 一个事件块可能含多行，只取 data: 行
  for (const line of rawEvent.split('\n')) {
    const trimmed = line.trimStart()
    if (!trimmed.startsWith('data:')) continue
    const jsonStr = trimmed.slice('data:'.length).trim()
    if (!jsonStr) continue

    let evt: {
      type?: string
      conversationId?: number
      name?: string
      text?: string
      toolCalls?: ToolCallResult[]
      message?: string
      error?: string
    }
    try {
      evt = JSON.parse(jsonStr)
    } catch {
      continue // 半包/坏行，跳过
    }

    switch (evt.type) {
      case 'conversation_id':
        if (typeof evt.conversationId === 'number')
          callbacks.onConversationId?.(evt.conversationId)
        break
      case 'tool':
        callbacks.onTool?.(evt.name ?? '')
        break
      case 'content':
        callbacks.onContent?.(evt.text ?? '')
        break
      case 'done':
        callbacks.onDone?.({
          conversationId: evt.conversationId ?? 0,
          toolCalls: evt.toolCalls,
          message: evt.message,
        })
        break
      case 'error':
        callbacks.onError?.(evt.error ?? 'unknown error')
        break
      default:
        break
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// OCR 图片识别（附件）
// ═══════════════════════════════════════════════════════════════

export interface OcrRecognizeResult {
  success: boolean
  text?: string
  error?: string
}

/**
 * 通用票据 OCR：识别图片中的文字（复用 /api/ocr/general-receipt，百度 accurate_basic）。
 * 后端 /api/ocr/general-receipt 用 Results.Ok 直接返回裸 body {success,text,generalReceipt}，
 * apiClient.post 也直接返回裸 body（无 .data 包裹）；失败时返回 {success:false,error}。
 * 后端会自动剥离 dataURL 前缀，可直接传 FileReader 的 dataURL。
 */
export async function recognizeReceiptText(
  imageBase64: string,
): Promise<OcrRecognizeResult> {
  const raw = (await apiClient.post<unknown>('/api/ocr/general-receipt', {
    imageBase64,
  })) as { success?: boolean; text?: string; error?: string }
  if (raw?.success && typeof raw.text === 'string') {
    return { success: true, text: raw.text }
  }
  return { success: false, error: raw?.error || 'OCR 识别失败' }
}
