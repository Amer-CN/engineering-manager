/**
 * MessageBubble — 消息气泡组件
 *
 * 区分用户/AI 消息样式，展示 tool_calls 结果（成功绿色/失败红色）
 * AI 消息 hover 出操作条（复制/重发/👍👎）
 * 工具结果沿用现有文本渲染（富卡片留第二批，代码结构预留 RichToolResult 接入点）
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { AgentMessage, AgentMessageResponse, ToolCallResult } from '@/types/agent'
import MessageActions from './MessageActions'
import RichToolResult from './RichToolResult'
import MarkdownRenderer from './MarkdownRenderer'

interface MessageBubbleProps {
  /** 消息数据 */
  message: AgentMessage | AgentMessageResponse | (AgentMessage & { clientId?: string; sending?: boolean })
  /** 消息时间戳（ms；本地新消息/历史恢复时提供） */
  at?: number
  /** 本轮回复耗时（秒；仅 assistant 完成态） */
  durationSec?: number
  /** 思考过程（reasoning 模型流式聚合；折叠展示） */
  reasoning?: string
  /** 是否为当前用户发送的消息 */
  isUser: boolean
  /** 重发回调（重跑上一条 user 消息） */
  onResend?: () => void
  /** user 消息：编辑（内容回填输入框） */
  onEdit?: () => void
  /** assistant 消息：分叉（以该消息为起点派生新对话） */
  onFork?: () => void
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

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser, onResend, onEdit, onFork, at, durationSec, reasoning }) => {
  const [hovered, setHovered] = useState(false)
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const content = message.content || ''
  const toolResults = extractToolResults(
    (message as AgentMessage).toolCalls
  )

  const isSending = 'sending' in message && (message as { sending?: boolean }).sending === true

  // 空的「发送中」助手占位：思考指示器由 AgentDashboard 统一渲染，此处不渲染孤立头像，避免与「思考中」重叠
  if (!isUser && isSending && !content && toolResults.length === 0) {
    return null
  }

  /** 时间戳（HH:MM；无则隐藏） */
  const timeText = at
    ? new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : null
  /** StatsLine：AI 回复完成后的耗时小字 */
  const statsText = !isUser && durationSec != null && durationSec > 0
    ? `${durationSec}s`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4 group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 头像（仅助手侧；对齐 Stitch：用户消息不显头像，墨底气泡靠右） */}
      {!isUser && (
        <motion.div
          whileHover={{ scale: 1.08 }}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <Icon name="Bot" size={18} />
        </motion.div>
      )}

      {/* 气泡主体（DSH MessageItem 布局：气泡列 + 操作/统计行在下方，gap 6px。
          用户列右对齐 max-width min(525px,82%)；AI 列左对齐 75%） */}
      <div
        className={`flex flex-col gap-1.5 min-w-[120px] ${isUser ? 'items-end' : 'items-start'}`}
        style={isUser ? { maxWidth: 'min(525px, 82%)' } : { maxWidth: '75%' }}
      >
        {/* 文字内容：用户消息纯文本，AI 消息走 Markdown 渲染 */}
        {content && (
          <div
            className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
              isUser ? 'rounded-[22px] rounded-br-md whitespace-pre-wrap' : 'rounded-2xl rounded-bl-md'
            }`}
            style={
              isUser
                ? { background: 'var(--accent)', color: 'var(--on-accent)' }
                : { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }
            }
          >
            {isUser ? content : <MarkdownRenderer content={content} />}
          </div>
        )}

        {/* ReasoningRow（DSH 风格）：思考过程折叠行——reasoning 模型才有，默认收起 */}
        {!isUser && reasoning && reasoning.trim().length > 0 && (
          <div className="w-full">
            <button
              type="button"
              onClick={() => setReasoningOpen(v => !v)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-[color:var(--panel-2)]"
              style={{ color: 'var(--muted)' }}
            >
              <Icon name="Brain" size={12} />
              <span>{reasoningOpen ? '收起思考过程' : '思考过程'}</span>
              <motion.span animate={{ rotate: reasoningOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <Icon name="ChevronDown" size={12} />
              </motion.span>
            </button>
            <AnimatePresence>
              {reasoningOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-1 px-3 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto"
                    style={{ background: 'var(--panel-2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    {reasoning}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Tool Call 结果（富卡片） */}
        {toolResults.length > 0 && <RichToolResult results={toolResults} />}

        {/* 已完成但无任何内容（如达到最大工具轮次后无最终文本）→ 占位提示，避免空气泡 */}
        {!isUser && !isSending && !content && toolResults.length === 0 && (
          <div
            className="px-4 py-2.5 rounded-2xl text-sm italic rounded-bl-md"
            style={{ color: 'var(--muted)', background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            本次没有返回内容，请重试或换个问法。
          </div>
        )}

        {/* 底部行：操作条 · 耗时 StatsLine · 时间戳（DSH：气泡下方 gap 6px）。
            操作条常驻占位（opacity 切换而不是条件渲染）——hover 显形时不再挤压布局 */}
        <div className={`flex items-center gap-2 text-micro ${isUser ? 'flex-row-reverse' : ''}`} style={{ color: 'var(--muted)' }}>
          {!isUser && content && (
            <div
              className="transition-opacity duration-150"
              style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none' }}
            >
              <MessageActions content={content} onResend={onResend} onEdit={onEdit} onFork={onFork} />
            </div>
          )}
          {statsText && <span title="本轮回复耗时">{statsText}</span>}
          {timeText && <span>{timeText}</span>}
        </div>
      </div>
    </motion.div>
  )
}

export default MessageBubble
