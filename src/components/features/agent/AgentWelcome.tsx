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
        className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
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
        {/* 头像 + 问候 */}
        <div className="text-center mb-7">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 items-center justify-center shadow-lg shadow-primary-500/20 mb-4">
            <Icon name="Sparkles" size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {getGreeting()}，{username}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            我是你的工程管理助手，可以帮你查项目、看发票、算成本
          </p>
          {modelName && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
              <span className="text-xs text-slate-500 font-medium">
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
