/**
 * MessageBubble — 消息气泡组件
 *
 * 区分用户/AI 消息样式，展示 tool_calls 结果（成功绿色/失败红色）
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { AgentMessage, AgentMessageResponse, ToolCallResult } from '@/types/agent'

interface MessageBubbleProps {
  /** 消息数据 */
  message: AgentMessage | AgentMessageResponse
  /** 是否为当前用户发送的消息 */
  isUser: boolean
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

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  const content = message.content || ''
  const toolResults = extractToolResults(
    (message as AgentMessage).toolCalls
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}
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
      <div className={`max-w-[75%] min-w-[120px] ${isUser ? 'items-end' : 'items-start'}`}>
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

        {/* Tool Call 结果 */}
        {toolResults.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {toolResults.map((tc, i) => (
              <motion.div
                key={tc.toolCallId || i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.2 }}
                className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs border ${
                  tc.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <Icon
                  name={tc.success ? 'CheckCircle' : 'XCircle'}
                  size={14}
                  className={`mt-0.5 flex-shrink-0 ${
                    tc.success ? 'text-emerald-500' : 'text-red-500'
                  }`}
                />
                <div className="min-w-0">
                  <span className="font-semibold">{tc.toolName}</span>
                  {tc.error && (
                    <span className="block text-red-600 mt-0.5">{tc.error}</span>
                  )}
                  {tc.result != null && !tc.error && (
                    <span className="block text-slate-500 mt-0.5 truncate max-w-[260px]">
                      {typeof tc.result === 'string'
                        ? tc.result
                        : JSON.stringify(tc.result)}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default MessageBubble