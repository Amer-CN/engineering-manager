/**
 * SuggestionCards — 建议快捷问题卡片
 *
 * 在空消息时展示 3-4 个快捷问题，点击即发送
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { SuggestionCardConfig } from '@/types/agent'

interface SuggestionCardsProps {
  /** 建议卡片列表 */
  suggestions: SuggestionCardConfig[]
  /** 点击建议的回调（传入 prompt 文本） */
  onSelect: (prompt: string) => void
  /** 是否禁用（如正在发送消息时） */
  disabled?: boolean
}

const DEFAULT_SUGGESTIONS: SuggestionCardConfig[] = [
  {
    icon: 'FolderKanban',
    title: '今天有哪些项目',
    prompt: '今天有哪些项目在进行中？',
    color: 'blue',
  },
  {
    icon: 'Receipt',
    title: '待付款发票',
    prompt: '列出当前所有待付款的发票',
    color: 'amber',
  },
  {
    icon: 'Landmark',
    title: '最近结算情况',
    prompt: '最近一次结算的情况怎么样？',
    color: 'emerald',
  },
  {
    icon: 'Users',
    title: '团队出勤概况',
    prompt: '今天的团队出勤情况如何？',
    color: 'violet',
  },
]

const colorVariants: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300',
  amber: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300',
  emerald:
    'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300',
  violet:
    'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-300',
  purple:
    'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300',
  rose: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300',
}

const iconColorVariants: Record<string, string> = {
  blue: 'text-blue-500',
  amber: 'text-amber-500',
  emerald: 'text-emerald-500',
  violet: 'text-violet-500',
  purple: 'text-purple-500',
  rose: 'text-rose-500',
}

const SuggestionCards: React.FC<SuggestionCardsProps> = ({
  suggestions,
  onSelect,
  disabled = false,
}) => {
  const items = suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.35 }}
    >
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
        快捷提问
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((sug, i) => {
          const colorKey = sug.color || 'blue'
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.25 }}
              whileHover={{ scale: disabled ? 1 : 1.02, y: -1 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              onClick={() => !disabled && onSelect(sug.prompt)}
              disabled={disabled}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                colorVariants[colorKey] || colorVariants.blue
              }`}
            >
              <div
                className={`flex-shrink-0 mt-0.5 ${
                  iconColorVariants[colorKey] || iconColorVariants.blue
                }`}
              >
                <Icon name={sug.icon} size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{sug.title}</p>
                <p className="text-xs opacity-70 mt-0.5 line-clamp-2">
                  {sug.prompt}
                </p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

export default SuggestionCards