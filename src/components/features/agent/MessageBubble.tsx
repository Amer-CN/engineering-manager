/**
 * MessageBubble — 消息气泡组件
 *
 * 区分用户/AI 消息样式，展示 tool_calls 结果（成功绿色/失败红色）
 * AI 消息 hover 出操作条（复制/重发/👍👎）
 * 工具结果沿用现有文本渲染（富卡片留第二批，代码结构预留 RichToolResult 接入点）
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { AgentMessage, AgentMessageResponse, ToolCallResult } from '@/types/agent'
import MessageActions from './MessageActions'
import RichToolResult from './RichToolResult'

interface MessageBubbleProps {
  /** 消息数据 */
  message: AgentMessage | AgentMessageResponse | (AgentMessage & { clientId?: string; sending?: boolean })
  /** 是否为当前用户发送的消息 */
  isUser: boolean
  /** 重发回调（重跑上一条 user 消息） */
  onResend?: () => void
}

/** 解析 toolCalls — 支持 ToolCall[] 和 ToolCallResult[] 两种形态 */
function extractToolResults(
  toolCalls: unknown
): ToolCallResult[] {
  if (!toolCalls || !Array.isArray(toolCalls)) return []
  const first = toolCalls[0]
  if (first && typeof first === 'object' && 'toolName' in first) {
    return toolCalls as ToolCallResult[]
  }
  // ToolCall[] → 转换为展示用的 partial result
  return (toolCalls as any[]).map((tc: any) => ({
    toolName: tc?.function?.name || 'unknown',
    toolCallId: tc?.id || '',
    success: true,
    result: tc?.function?.arguments
      ? `参数: ${tc.function.arguments}`
      : undefined,
  }))
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser, onResend }) => {
  const [hovered, setHovered] = useState(false)
  const content = message.content || ''
  const toolResults = extractToolResults(
    (message as AgentMessage).toolCalls
  )

  const isSending = 'sending' in message && (message as { sending?: boolean }).sending === true

  // 空的「发送中」助手占位：思考指示器由 AgentDashboard 统一渲染，此处不渲染孤立头像，避免与「思考中」重叠
  if (!isUser && isSending && !content && toolResults.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4 group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 头像 */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
          isUser
            ? 'bg-blue-100 text-blue-600'
            : 'bg-gradient-to-br from-violet-100 to-purple-100 text-purple-600'
        }`}
      >
        <Icon
          name={isUser ? 'UserCircle' : 'Sparkles'}
          size={18}
        />
      </motion.div>

      {/* 气泡主体 */}
      <div className={`max-w-[75%] min-w-[120px] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* 文字内容 */}
        {content && (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
              isUser
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
            }`}
          >
            {content}
          </div>
        )}

        {/* Tool Call 结果（富卡片） */}
        {toolResults.length > 0 && <RichToolResult results={toolResults} />}

        {/* ═══ RichToolResult 接入点（第二批富卡片渲染） ═══ */}
        {/* 当后端返回结构化 tool result 时，在此处渲染富卡片组件 */}

        {/* 已完成但无任何内容（如达到最大工具轮次后无最终文本）→ 占位提示，避免空气泡 */}
        {!isUser && !isSending && !content && toolResults.length === 0 && (
          <div className="px-4 py-2.5 rounded-2xl text-sm italic text-slate-400 bg-white border border-slate-200 rounded-bl-md shadow-sm">
            本次没有返回内容，请重试或换个问法。
          </div>
        )}

        {/* AI 消息操作条 */}
        {!isUser && content && hovered && (
          <MessageActions content={content} onResend={onResend} />
        )}
      </div>
    </motion.div>
  )
}

export default MessageBubble
