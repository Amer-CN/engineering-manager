/**
 * AgentWelcome — AI 助手空态欢迎区块（主区）
 * 移动端历史按钮 + 居中问候 + 模型徽章 + 输入框 + 快捷提问 chips
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { SuggestionCardConfig } from '@/types/agent'
import AgentComposer from './AgentComposer'
import SuggestionChips from './SuggestionChips'
import { getGreeting } from '@/components/features/dashboard/dashboardConstants'

interface AgentWelcomeProps {
  username: string
  modelName: string
  providerName: string
  inputValue: string
  onInputChange: (value: string) => void
  onSend: (text?: string) => void
  loading: boolean
  inputRef: React.RefObject<HTMLTextAreaElement>
  suggestions: SuggestionCardConfig[]
  onOpenHistory: () => void
}

const AgentWelcome: React.FC<AgentWelcomeProps> = ({
  username,
  modelName,
  providerName,
  inputValue,
  onInputChange,
  onSend,
  loading,
  inputRef,
  suggestions,
  onOpenHistory,
}) => (
  <div className="flex-1 flex flex-col min-w-0">
    {/* 顶部：移动端历史按钮 */}
    <div className="flex items-center justify-end px-6 pt-4 flex-shrink-0">
      <button
        onClick={onOpenHistory}
        className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg-2)' }}
      >
        <Icon name="Inbox" size={14} />
        对话历史
      </button>
    </div>

    <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-2xl"
      >
        {/* 问候（对齐 Stitch ai_1：大号居中问候，无头像/副标） */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
            {getGreeting()}，{username}
          </h1>
          {modelName && (
            <div className="inline-flex items-center gap-1.5 mt-4 px-2.5 py-1 rounded-lg" style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                {providerName ? `${providerName} · ` : ''}{modelName}
              </span>
            </div>
          )}
        </div>

        {/* 输入框 */}
        <AgentComposer
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          disabled={loading}
          inputRef={inputRef}
          placeholder="输入工程指令或查询数据…"
          centered
        />

        {/* 快捷提问 */}
        <div className="mt-4">
          <SuggestionChips
            suggestions={suggestions}
            onSelect={onSend}
            disabled={loading}
          />
        </div>
      </motion.div>
    </div>
  </div>
)

export default AgentWelcome
