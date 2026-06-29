/**
 * SuggestionCards — 建议快捷问题卡片
 *
 * 在空消息时展示快捷问题，点击即发送
 * 支持两种颜色格式：简写（'blue'）或 Tailwind 类名（'bg-blue-50 text-blue-600'）
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

// 简写颜色映射
const colorVariants: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300',
  amber: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300',
  violet: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-300',
  orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300',
  rose: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300',
}

const iconColorVariants: Record<string, string> = {
  blue: 'text-blue-500',
  amber: 'text-amber-500',
  emerald: 'text-emerald-500',
  violet: 'text-violet-500',
  orange: 'text-orange-500',
  rose: 'text-rose-500',
}

/** 从 Tailwind 类名中提取颜色 key */
function extractColorKey(color?: string): string {
  if (!color) return 'blue'
  // 如果是简写（如 'blue'），直接返回
  if (colorVariants[color]) return color
  // 从类名中提取（如 'bg-blue-50 text-blue-600' → 'blue'）
  const match = color.match(/bg-(\w+)-/)
  return match ? match[1] : 'blue'
}

const SuggestionCards: React.FC<SuggestionCardsProps> = ({
  suggestions,
  onSelect,
  disabled = false,
}) => {
  if (suggestions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.35 }}
    >
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
        快捷提问
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((sug, i) => {
          const colorKey = extractColorKey(sug.color)
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