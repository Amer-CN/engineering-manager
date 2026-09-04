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
import MarkdownRenderer from './MarkdownRenderer'
import ThinkingTrace from './ThinkingTrace'
import Mascot, { type MascotState } from './Mascot'
import { useMascotAppearance } from '@/hooks/useMascotAppearance'
import { EASE_OUT } from '../../../constants/animations'

interface MessageBubbleProps {
  /** 消息数据 */
  message: AgentMessage | AgentMessageResponse | (AgentMessage & { clientId?: string; sending?: boolean })
  /** 消息时间戳（ms；本地新消息/历史恢复时提供） */
  at?: number
  /** 本轮回复耗时（秒；仅 assistant 完成态） */
  durationSec?: number
  /** 思考过程（reasoning 模型流式聚合；折叠展示） */
  reasoning?: string
  /** 历史版本正文（重发产生；branchPicker） */
  versions?: string[]
  /** 当前展示版本：-1/缺省 = 最新流；0..n-1 = versions 下标 */
  activeVersion?: number
  /** 版本切换：dir=-1 向旧 / +1 向新 */
  onSwitchVersion?: (dir: -1 | 1) => void
  /** 是否为当前用户发送的消息 */
  isUser: boolean
  /** 重发回调（重跑上一条 user 消息） */
  onResend?: () => void
  /** user 消息：编辑（内容回填输入框） */
  onEdit?: () => void
  /** assistant 消息：分叉（以该消息为起点派生新对话） */
  onFork?: () => void
  /** AI 头像表情状态（缺省 idle；仅 live 时生效） */
  mascotState?: MascotState
  /** AI 头像活体开关：最新一条 assistant 消息传 true，其余 frozen 静态 */
  live?: boolean
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

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser, onResend, onEdit, onFork, at, durationSec, reasoning, versions, activeVersion, onSwitchVersion, mascotState = 'idle', live = false }) => {
  const [hovered, setHovered] = useState(false)
  /** 吉祥物形象：模块级 store 直订（与设置页/欢迎页共享同一份 shape/color） */
  const { shape, color } = useMascotAppearance()
  const content = message.content || ''
  /** 展示正文（branchPicker）：activeVersion>=0 取历史版本，否则最新流 */
  const displayBody = (activeVersion != null && activeVersion >= 0 && versions?.length)
    ? (versions[activeVersion] ?? content)
    : content
  const isHistorical = activeVersion != null && activeVersion >= 0
  const toolResults = extractToolResults(
    (message as AgentMessage).toolCalls
  )

  const isSending = 'sending' in message && (message as { sending?: boolean }).sending === true

  /** 空的「发送中」助手占位：仍渲染完整消息行（live 头像照常，thinking/searching 动画全程可见），
      但气泡主体/兜底文案/底部行均不渲染（不留空气泡）；AgentStreamTail 指示条由 Dashboard 另行渲染，互不替代 */
  const emptySending = !isUser && isSending && !content && toolResults.length === 0

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
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4 group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 头像（仅助手侧）：最新一条 live 活体（随 AI 状态变表情且眼睛跟鼠标），其余 frozen 静态；
          对齐 Stitch：用户消息不显头像，墨底气泡靠右 */}
      {!isUser && (
        <motion.div whileHover={{ scale: 1.08 }} className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
          {live ? (
            <Mascot size={48} state={mascotState} shape={shape} color={color} />
          ) : (
            <Mascot size={48} state="idle" frozen follow={false} shape={shape} color={color} />
          )}
        </motion.div>
      )}

      {/* 气泡主体（DSH MessageItem 布局：气泡列 + 操作/统计行在下方，gap 6px。
          用户列右对齐 max-width min(525px,82%)；AI 列左对齐 75%）。
          空的「发送中」占位（emptySending）整列不渲染：无空气泡/兜底文案/底部行 */}
      {!emptySending && (
      <div
        className={`flex flex-col gap-1.5 min-w-[120px] ${isUser ? 'items-end' : 'items-start'}`}
        style={isUser ? { maxWidth: 'min(525px, 82%)' } : { maxWidth: '75%' }}
      >
        {/* 历史版本角标（展示非最新流时） */}
        {isHistorical && (
          <span
            className="self-end text-micro px-1.5 py-0.5 rounded"
            style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}
          >
            历史版本
          </span>
        )}

        {/* 文字内容：用户消息纯文本，AI 消息走 Markdown 渲染（流式期间新块带进场动画 + 末尾光标） */}
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
            {isUser ? displayBody : <MarkdownRenderer content={displayBody} streaming={isSending} />}
          </div>
        )}

        {/* ThinkingTrace：思考过程折叠块（reasoning 模型流式聚合；流式中自动展开 + shimmer「思考中」） */}
        {!isUser && reasoning && reasoning.trim().length > 0 && (
          <ThinkingTrace reasoning={reasoning} working={isSending} />
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
          {/* branchPicker 版本切换器：‹n/m›（仅多版本 assistant 消息；常驻渲染有信息价值） */}
          {!isUser && versions && versions.length > 0 && onSwitchVersion && (
            <span className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onSwitchVersion(-1)}
                aria-label="上一个版本"
                className="px-1 rounded transition-colors hover:bg-[color:var(--panel-2)]"
                style={{ color: 'var(--muted)' }}
              >
                <Icon name="ChevronLeft" size={12} />
              </button>
              <span>{(activeVersion ?? -1) + 2}/{versions.length + 1}</span>
              <button
                type="button"
                onClick={() => onSwitchVersion(1)}
                aria-label="下一个版本"
                className="px-1 rounded transition-colors hover:bg-[color:var(--panel-2)]"
                style={{ color: 'var(--muted)' }}
              >
                <Icon name="ChevronRight" size={12} />
              </button>
            </span>
          )}
          {!isUser && content && (
            <div
              className="transition-opacity duration-150"
              style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none' }}
            >
              <MessageActions content={content} onResend={onResend} onEdit={onEdit} onFork={onFork} />
            </div>
          )}
          {statsText && !isHistorical && <span title="本轮回复耗时">{statsText}</span>}
          {timeText && <span>{timeText}</span>}
        </div>
      </div>
      )}
    </motion.div>
  )
}

export default MessageBubble
